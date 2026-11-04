#!/usr/bin/env python3
"""Build the read-only search index for the ML Systems demo (task 4.5).

The index is the same FTS5 table the MCP server builds in memory
(machine-learning-systems-plugin, mlsys_index.Corpus), saved to a file so the
Vercel Function opens it read-only instead of re-parsing 9 MB of chapters on
every cold start.

Usage (from the portfolio root):
    python scripts/build_mlsys_index.py <path to a plugin checkout at SOURCE_COMMIT>

Writes api/_data/mlsys.db and api/_data/mlsys.json (source, commit, sha256).
Re-run only when SOURCE_COMMIT changes; commit both files.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

SOURCE_REPO = "https://github.com/CollinsNyatundo/machine-learning-systems-plugin"
SOURCE_COMMIT = "8780dd21c927c4f1031be269697ad57da18dbb94"
OUT_DIR = Path(__file__).resolve().parents[1] / "api" / "_data"


def main(checkout: Path) -> None:
    head = subprocess.run(
        ["git", "-C", str(checkout), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if head != SOURCE_COMMIT:
        sys.exit(f"checkout is at {head}, expected {SOURCE_COMMIT}")

    sys.path.insert(0, str(checkout))
    from mlsys_index import Corpus  # the plugin's own index builder

    corpus = Corpus(checkout / "skills" / "machine-learning-systems")
    # The demo searches section chunks only; drop the other tables.
    for table in ("artifacts", "artifact_fts", "cheat", "cheat_fts"):
        corpus.db.execute(f"DROP TABLE {table}")
    corpus.db.execute("CREATE TABLE chapters(file TEXT PRIMARY KEY, title TEXT)")
    corpus.db.executemany(
        "INSERT INTO chapters(file, title) VALUES (?, ?)",
        [(c["file"], c["title"]) for c in corpus.chapters.values()],
    )
    corpus.db.commit()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    db_path = OUT_DIR / "mlsys.db"
    db_path.unlink(missing_ok=True)
    out = sqlite3.connect(db_path)
    corpus.db.backup(out)
    out.execute("VACUUM")
    out.close()

    digest = hashlib.sha256(db_path.read_bytes()).hexdigest()
    (OUT_DIR / "mlsys.json").write_text(
        json.dumps(
            {
                "source": SOURCE_REPO,
                "commit": SOURCE_COMMIT,
                "chapters": len(corpus.chapters),
                "sha256": digest,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {db_path} ({db_path.stat().st_size // 1024} KB), sha256 {digest}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).resolve())
