"""Pure-Python scoring for a LightGBM text model (no native library).

Vercel's Python image has no OpenMP runtime (libgomp), which the lightgbm
wheel needs, so the function reads the model file itself. It supports what
this model uses: numerical splits only (decision_type 2, no missing values),
one output. Raw scores and per-feature contributions are tested against
lightgbm's own predict(raw_score=True) and predict(pred_contrib=True).

Contributions use TreeSHAP with node counts as cover, a direct port of
LightGBM's Tree::TreeSHAP (src/io/tree.cpp), so they match pred_contrib.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Tree:
    split_feature: list[int]
    threshold: list[float]
    left: list[int]
    right: list[int]
    leaf_value: list[float]
    leaf_count: list[float]
    internal_count: list[float]

    def count(self, node: int) -> float:
        return self.leaf_count[~node] if node < 0 else self.internal_count[node]

    def child(self, x: list[float], node: int) -> int:
        f = self.split_feature[node]
        return self.left[node] if x[f] <= self.threshold[node] else self.right[node]

    def predict(self, x: list[float]) -> float:
        if not self.split_feature:
            return self.leaf_value[0]
        node = 0
        while node >= 0:
            node = self.child(x, node)
        return self.leaf_value[~node]


@dataclass(frozen=True)
class Model:
    feature_names: list[str]
    trees: list[Tree]

    def raw(self, x: list[float]) -> float:
        return sum(t.predict(x) for t in self.trees)

    def contributions(self, x: list[float]) -> list[float]:
        """Per-feature contributions in margin units, plus the bias last."""
        n = len(self.feature_names)
        phi = [0.0] * (n + 1)
        for t in self.trees:
            if not t.split_feature:
                phi[n] += t.leaf_value[0]
                continue
            _tree_shap(t, x, phi, 0, 0, [], 1.0, 1.0, -1)
            phi[n] += _expected_value(t)
        return phi


def _expected_value(t: Tree) -> float:
    total = t.internal_count[0]
    return sum(v * c / total for v, c in zip(t.leaf_value, t.leaf_count))


# A path element is [feature_index, zero_fraction, one_fraction, pweight].


def _extend(path: list[list[float]], depth: int, zero: float, one: float, feature: int) -> None:
    path.append([feature, zero, one, 1.0 if depth == 0 else 0.0])
    for i in range(depth - 1, -1, -1):
        path[i + 1][3] += one * path[i][3] * (i + 1) / (depth + 1)
        path[i][3] = zero * path[i][3] * (depth - i) / (depth + 1)


def _unwind(path: list[list[float]], depth: int, index: int) -> None:
    one, zero = path[index][2], path[index][1]
    next_one = path[depth][3]
    for i in range(depth - 1, -1, -1):
        if one != 0:
            tmp = path[i][3]
            path[i][3] = next_one * (depth + 1) / ((i + 1) * one)
            next_one = tmp - path[i][3] * zero * (depth - i) / (depth + 1)
        else:
            path[i][3] = path[i][3] * (depth + 1) / (zero * (depth - i))
    for i in range(index, depth):
        path[i][0], path[i][1], path[i][2] = path[i + 1][0], path[i + 1][1], path[i + 1][2]
    path.pop()


def _unwound_sum(path: list[list[float]], depth: int, index: int) -> float:
    one, zero = path[index][2], path[index][1]
    next_one = path[depth][3]
    total = 0.0
    for i in range(depth - 1, -1, -1):
        if one != 0:
            tmp = next_one * (depth + 1) / ((i + 1) * one)
            total += tmp
            next_one = path[i][3] - tmp * zero * ((depth - i) / (depth + 1))
        else:
            total += (path[i][3] / zero) / ((depth - i) / (depth + 1))
    return total


def _tree_shap(
    t: Tree,
    x: list[float],
    phi: list[float],
    node: int,
    depth: int,
    parent: list[list[float]],
    zero: float,
    one: float,
    feature: int,
) -> None:
    path = [e[:] for e in parent[:depth]]
    _extend(path, depth, zero, one, feature)

    if node < 0:
        value = t.leaf_value[~node]
        for i in range(1, depth + 1):
            w = _unwound_sum(path, depth, i)
            el = path[i]
            phi[int(el[0])] += w * (el[2] - el[1]) * value
        return

    hot = t.child(x, node)
    cold = t.right[node] if hot == t.left[node] else t.left[node]
    w = t.count(node)
    hot_zero, cold_zero = t.count(hot) / w, t.count(cold) / w
    in_zero, in_one = 1.0, 1.0

    split = t.split_feature[node]
    index = next((i for i in range(depth + 1) if path[i][0] == split), None)
    if index is not None:
        in_zero, in_one = path[index][1], path[index][2]
        _unwind(path, depth, index)
        depth -= 1

    _tree_shap(t, x, phi, hot, depth + 1, path, hot_zero * in_zero, in_one, split)
    _tree_shap(t, x, phi, cold, depth + 1, path, cold_zero * in_zero, 0.0, split)


def _floats(v: str) -> list[float]:
    return [float(s) for s in v.split()]


def _ints(v: str) -> list[int]:
    return [int(s) for s in v.split()]


def load(path: Path) -> Model:
    text = path.read_text(encoding="utf-8")
    header, _, rest = text.partition("\nTree=")
    meta = dict(line.split("=", 1) for line in header.splitlines() if "=" in line)
    if meta.get("num_class", "1") != "1":
        raise ValueError("only single-output models are supported")
    names = meta["feature_names"].split()
    trees = []
    for block in ("Tree=" + rest).split("\nTree=")[0:]:
        body = block.split("end of trees")[0]
        kv = dict(line.split("=", 1) for line in body.splitlines() if "=" in line)
        if "num_leaves" not in kv:
            continue
        if int(kv["num_leaves"]) == 1:
            trees.append(Tree([], [], [], [], _floats(kv["leaf_value"]), [1.0], [1.0]))
            continue
        if set(kv["decision_type"].split()) != {"2"}:
            raise ValueError("only numerical splits without missing values are supported")
        if kv.get("num_cat", "0") != "0":
            raise ValueError("categorical splits are not supported")
        trees.append(
            Tree(
                split_feature=_ints(kv["split_feature"]),
                threshold=_floats(kv["threshold"]),
                left=_ints(kv["left_child"]),
                right=_ints(kv["right_child"]),
                leaf_value=_floats(kv["leaf_value"]),
                leaf_count=_floats(kv["leaf_count"]),
                internal_count=_floats(kv["internal_count"]),
            )
        )
    return Model(feature_names=names, trees=trees)
