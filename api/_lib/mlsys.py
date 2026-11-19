"""Search over the ML Systems index (docs/05 §5, task 4.5).

Pure functions so they can be tested without a server. The query is reduced
to plain word tokens before it reaches FTS5, and every value is a bound
parameter, so no visitor input is ever part of the SQL text (07 item 4).
"""

from __future__ import annotations

import json
import re
import sqlite3
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "_data"
DB_PATH = DATA_DIR / "mlsys.db"
MIN_CHARS, MAX_CHARS = 3, 200
MAX_LIMIT = 10
SNIPPET_TOKENS = 32
# Match markers in snippets: control characters can't occur in the corpus,
# unlike "[" and "]", which the chapters use for maths and citations.
MARK_OPEN, MARK_CLOSE = "", ""

ATTRIBUTION = {
    "author": "Vijay Janapa Reddi",
    "title": "Machine Learning Systems",
    "licence": "CC BY-NC-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "url": "https://mlsysbook.ai/",
    "adaptation": "Adapted edition in machine-learning-systems-plugin by Collins Nyagaka",
}


class ValidationError(ValueError):
    def __init__(self, field: str, message: str) -> None:
        super().__init__(message)
        self.field = field
        self.message = message


def parse_query(q: str | None) -> str:
    if q is None:
        raise ValidationError("q", "is required")
    text = q.strip()
    if len(text) < MIN_CHARS:
        raise ValidationError("q", f"must be at least {MIN_CHARS} characters")
    if len(text) > MAX_CHARS:
        raise ValidationError("q", f"must be at most {MAX_CHARS} characters")
    return text


def parse_limit(raw: str | None) -> int:
    if raw is None or raw == "":
        return MAX_LIMIT
    if not raw.isdigit():
        raise ValidationError("limit", f"must be a whole number from 1 to {MAX_LIMIT}")
    value = int(raw)
    if not 1 <= value <= MAX_LIMIT:
        raise ValidationError("limit", f"must be a whole number from 1 to {MAX_LIMIT}")
    return value


def fts_match(text: str, mode: str) -> str | None:
    """Word tokens only, each quoted: FTS5 operators can't survive (05 §5)."""
    tokens = re.findall(r"[a-z0-9]+", text.lower())[:20]
    if not tokens:
        return None
    quoted = [f'"{t}"' for t in tokens]
    quoted[-1] += "*"
    return (" OR " if mode == "or" else " ").join(quoted)


@lru_cache(maxsize=1)
def _connect() -> sqlite3.Connection:
    # immutable=1: the file is read-only data bundled with the function.
    uri = f"{DB_PATH.as_uri()}?mode=ro&immutable=1"
    db = sqlite3.connect(uri, uri=True, check_same_thread=False)
    db.row_factory = sqlite3.Row
    return db


@lru_cache(maxsize=1)
def source_commit() -> str:
    return json.loads((DATA_DIR / "mlsys.json").read_text(encoding="utf-8"))["commit"]


# Markdown and LaTeX left in the chapter text. The index keeps the source as
# written; snippets are cleaned only for display (the match markers survive).
_IMAGE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_MATH_DELIM = re.compile(r"\\[()\[\]]")
_TEX_WRAP = re.compile(r"\\(?:text|textbf|textit|mathbf|mathrm|mathit|mathcal|operatorname|emph)\{([^{}]*)\}")
_STRONG = re.compile(r"\*\*|__")
_EM = re.compile(r"(?<![\w*])\*(?=\S)(.+?)(?<=\S)\*(?![\w*])")
# Line-start syntax: FTS5 snippets keep the source newlines, so these run
# before whitespace is collapsed ("3 * 4" mid-line is left alone).
_BULLET = re.compile(r"^[ \t]*[*+-][ \t]+", re.M)
_HEADING = re.compile(r"^[ \t]*#{1,6}[ \t]+", re.M)
_QUOTE = re.compile(r"^[ \t]*>[ \t]?", re.M)
_CODE = re.compile(r"`+")
_TAG = re.compile(r"</?[a-zA-Z][^<>]*>")
_FRAC = re.compile(r"\\frac\{([^{}]*)\}\{([^{}]*)\}")
_SQRT = re.compile(r"\\sqrt\{([^{}]*)\}")
_TEX_SYMBOLS = {
    "times": "×", "cdot": "·", "rightarrow": "→", "to": "→", "leftarrow": "←",
    "sim": "~", "approx": "≈", "leq": "≤", "le": "≤", "geq": "≥", "ge": "≥",
    "neq": "≠", "pm": "±", "infty": "∞", "in": "∈", "sum": "Σ", "prod": "Π",
    "partial": "∂", "nabla": "∇", "alpha": "α", "beta": "β", "gamma": "γ",
    "delta": "δ", "epsilon": "ε", "eta": "η", "theta": "θ", "lambda": "λ",
    "mu": "μ", "pi": "π", "sigma": "σ", "tau": "τ", "phi": "φ", "omega": "ω",
    "quad": " ", "qquad": " ", "left": "", "right": "", "log": "log",
    "exp": "exp", "max": "max", "min": "min", "hat": "", "bar": "",
}
_TEX_CMD = re.compile(r"\\([a-zA-Z]+)")
_SCRIPT = re.compile(r"([_^])\{([^{}]*)\}")
_TEX_SPACE = re.compile(r"\\[ ,;!]")
_TABLE_RULE = re.compile(r"\|?\s*:?-{3,}:?\s*(?=\|)")
_PIPES = re.compile(r"\s*\|[\s|]*")


def _tex(s: str) -> str:
    # Flatten sub- and superscripts first, so \frac and \sqrt see flat args.
    for _ in range(3):
        s = _SCRIPT.sub(r"\1\2", s)
    s = _FRAC.sub(r"(\1)/(\2)", s)
    s = _SQRT.sub(r"√(\1)", s)
    s = _TEX_SPACE.sub(" ", s)
    s = _TEX_CMD.sub(lambda m: _TEX_SYMBOLS.get(m.group(1), m.group(0)), s)
    return s.replace("{", "").replace("}", "")


def plain_snippet(snip: str) -> str:
    """Display text for a snippet: no Markdown or LaTeX syntax, markers kept."""
    s = _BULLET.sub("", snip)
    s = _HEADING.sub("", s)
    s = _QUOTE.sub("", s)
    s = _IMAGE.sub(r"\1", s)
    s = _LINK.sub(r"\1", s)
    s = _TAG.sub("", s)
    s = _TEX_WRAP.sub(r"\1", s)
    s = _MATH_DELIM.sub("", s)
    s = _tex(s)
    s = _TABLE_RULE.sub("", s)
    s = _PIPES.sub(" · ", s).strip(" ·")
    s = _STRONG.sub("", s)
    s = _EM.sub(r"\1", s)
    s = _CODE.sub("", s)
    return re.sub(r"\s+", " ", s).strip()


def search(text: str, limit: int) -> list[dict]:
    """BM25-ranked section chunks: AND first, OR if nothing matches."""
    db = _connect()
    rows: list[sqlite3.Row] = []
    for mode in ("and", "or"):
        match = fts_match(text, mode)
        if match is None:
            return []
        rows = db.execute(
            "SELECT c.file, ch.title AS chapter, c.heading, "
            "bm25(chunk_fts, 6.0, 1.0) AS score, "
            "snippet(chunk_fts, 1, char(2), char(3), ' … ', ?) AS snip "
            "FROM chunk_fts AS c JOIN chapters AS ch ON ch.file = c.file "
            "WHERE chunk_fts MATCH ? ORDER BY score LIMIT ?",
            (SNIPPET_TOKENS, match, limit * 3),
        ).fetchall()
        if rows:
            break

    results, seen = [], set()
    commit = source_commit()
    for row in rows:
        key = (row["file"], row["heading"])
        if key in seen:
            continue
        seen.add(key)
        results.append(
            {
                "chapter": row["chapter"],
                "section": row["heading"].split(" > ")[-1],
                "snippet": plain_snippet(row["snip"]),
                "url": (
                    "https://github.com/CollinsNyatundo/machine-learning-systems-plugin/blob/"
                    f"{commit}/skills/machine-learning-systems/chapters/{row['file']}"
                ),
                "score": round(-row["score"], 3),
            }
        )
        if len(results) == limit:
            break
    return results
