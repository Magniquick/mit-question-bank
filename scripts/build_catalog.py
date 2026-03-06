#!/usr/bin/env python3

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "docs" / "catalog.json"
BASE_URL = "https://github.com/Magniquick/mit-question-bank/blob/main/"


def parse_pdf(path: Path) -> dict[str, str | None]:
    parts = path.parts
    semester = parts[0] if parts else None
    branch = None
    year = None
    exam_type = None
    subject_folder = None

    if len(parts) >= 6:
        _, branch, year, exam_type, subject_folder, _ = parts[:6]
    elif len(parts) == 5:
        _, branch, year, exam_type, _ = parts
    elif len(parts) == 2:
        pass

    return {
        "path": path.as_posix(),
        "name": path.name,
        "semester": semester,
        "branch": branch,
        "year": year,
        "examType": exam_type,
        "subjectFolder": subject_folder,
        "githubUrl": BASE_URL + quote(path.as_posix()),
    }


def sort_key(item: dict[str, str | None]) -> tuple[int, int, str, str]:
    semester = item["semester"] or ""
    try:
        semester_num = int(semester.replace("SEM", ""))
    except ValueError:
        semester_num = 999

    year = item["year"] or ""
    try:
        year_num = int(year)
    except ValueError:
        year_num = -1

    return (semester_num, -year_num, item["branch"] or "", item["name"] or "")


def main() -> None:
    entries: list[dict[str, str | None]] = []

    for path in sorted(ROOT.glob("SEM*/**/*")):
        if not path.is_file():
            continue
        if path.suffix.lower() != ".pdf":
            continue
        entries.append(parse_pdf(path.relative_to(ROOT)))

    entries.sort(key=sort_key)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(entries, indent=2), encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
