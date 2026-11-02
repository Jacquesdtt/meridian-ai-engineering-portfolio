"""Export the project report as HTML and PDF, and copy report assets to the teaching app.

Usage: uv run --with markdown --with beautifulsoup4 python scripts/export_document_pack.py
Use --skip-export to update only repository copies, or --out to choose an export folder.
Microsoft Edge is required to print the PDF.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DOCS = REPO / "Docs"
REPORT_MD = DOCS / "Final_Report_Official.md"
REPORT_HTML = DOCS / "Final_Report_Official_print.html"
ASSESSOR_PDF = REPO / "churn_report_df14.pdf"
APP_GUIDES = REPO / "educational_web_app" / "public" / "guides"
DEFAULT_EXPORT = REPO / "dist" / "document-pack"

EXPORT_ASSET_DIR = "Meridian_Final_Report_assets"

# Print styling for the report. The markdown has no styling of its own, and assessors
# read the PDF on paper-sized pages, so tables must not split and headings must not orphan.
PRINT_CSS = """
@page { size: A4; margin: 18mm 16mm; }
body {
  font-family: "Segoe UI", Calibri, "Helvetica Neue", Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.45;
  color: #1a1a1a;
}
h1 { font-size: 20pt; margin-top: 0; page-break-after: avoid; }
h2 { font-size: 14pt; margin-top: 1.4em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; page-break-after: avoid; }
h3 { font-size: 12pt; margin-top: 1.1em; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 9.5pt; page-break-inside: avoid; }
th, td { border: 1px solid #bbb; padding: 4px 6px; vertical-align: top; text-align: left; }
th { background: #f0f0f0; }
code { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; background: #f5f5f5; padding: 0 3px; }
pre { background: #f5f5f5; padding: 8px; overflow-x: auto; font-size: 9pt; }
blockquote { border-left: 3px solid #888; margin-left: 0; padding-left: 12px; color: #333; }
ul, ol { padding-left: 1.4em; }
a { color: #0645ad; text-decoration: none; }
img { max-width: 100%; }
.toc { page-break-after: always; }
.toc ul { list-style: none; padding-left: 0; }
.toc li { margin: 0.25em 0; }
.meta { color: #444; margin-bottom: 1.5em; }
"""

# Markdown image links like ![alt](Sprint2/reports/x.png); paths are relative to Docs/.
IMAGE_LINK = re.compile(r"!\[[^\]]*\]\(([^)\s]+)\)")


# --- Report: markdown -> HTML -> PDF -------------------------------------------------


def md_to_html(md_text: str) -> str:
    """Render the report markdown to a standalone, print-styled HTML page with a TOC."""
    import markdown

    md = markdown.Markdown(
        extensions=["toc", "tables", "fenced_code", "sane_lists"],
        extension_configs={"toc": {"permalink": False, "toc_depth": "2-3"}},
    )
    body = md.convert(md_text)
    toc_html = getattr(md, "toc", "") or ""
    toc_block = f'<nav class="toc"><h2>Table of Contents</h2>{toc_html}</nav>' if toc_html else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Meridian Savings — Final Report (DF14)</title>
<style>{PRINT_CSS}</style>
</head>
<body>
{toc_block}
{body}
</body>
</html>
"""


def report_images(md_text: str) -> list[str]:
    """Relative image paths the report links to (web and absolute links excluded)."""
    return [p for p in IMAGE_LINK.findall(md_text) if not re.match(r"^(https?:|/|[A-Za-z]:)", p)]


def find_edge() -> Path:
    """Locate Microsoft Edge; it is the only PDF printer allowed on the AppLocker laptop."""
    for p in (
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    ):
        if p.is_file():
            return p
    raise SystemExit("Microsoft Edge not found; it is needed to print PDFs.")


def print_pdf(html_path: Path, pdf_path: Path) -> None:
    """Print ``html_path`` to ``pdf_path`` with headless Edge, replacing the old PDF only on success.

    - A throwaway ``--user-data-dir`` stops headless Edge handing the job to an open
      Edge window and exiting without writing a file.
    - Printing to a temp file first means a failed print never deletes the existing PDF.
    - ``--virtual-time-budget`` gives web fonts and images time to load before printing.
    - The launcher can exit before the renderer finishes writing, so we poll briefly.
    """
    edge = find_edge()
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_pdf = pdf_path.with_suffix(".tmp.pdf")
    tmp_pdf.unlink(missing_ok=True)
    with tempfile.TemporaryDirectory(prefix="edge-pdf-", ignore_cleanup_errors=True) as profile:
        cmd = [
            str(edge), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
            f"--user-data-dir={profile}", "--virtual-time-budget=10000",
            f"--print-to-pdf={tmp_pdf.resolve()}", html_path.resolve().as_uri(),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        for _ in range(60):
            if tmp_pdf.is_file() and tmp_pdf.stat().st_size >= 1000:
                break
            time.sleep(0.5)
    if proc.returncode != 0 or not tmp_pdf.is_file() or tmp_pdf.stat().st_size < 1000:
        print(proc.stderr[-2000:], file=sys.stderr)
        raise SystemExit(f"PDF print failed for {html_path.name}; {pdf_path.name} left untouched.")
    tmp_pdf.replace(pdf_path)
    print(f"  pdf   {pdf_path} ({pdf_path.stat().st_size / 1024:.0f} KiB)")


def build_report() -> tuple[str, list[str]]:
    """Steps 1-2: write the print HTML and the assessor PDF. Returns (markdown, image paths)."""
    print("Report")
    md_text = REPORT_MD.read_text(encoding="utf-8")
    images = report_images(md_text)
    missing = [p for p in images if not (DOCS / p).is_file()]
    if missing:
        raise SystemExit(f"Report links to missing images under Docs/: {missing}")
    REPORT_HTML.write_text(md_to_html(md_text), encoding="utf-8")
    print(f"  html  {REPORT_HTML.relative_to(REPO)} ({len(images)} images)")
    print_pdf(REPORT_HTML, ASSESSOR_PDF)
    return md_text, images


# --- Teaching app copies -------------------------------------------------------------


def sync_app_guides(images: list[str]) -> None:
    """Step 3: copy the report (with its images at the same relative paths) into the SPA."""
    print("Teaching app guides")
    APP_GUIDES.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(REPORT_HTML, APP_GUIDES / REPORT_HTML.name)
    for rel in images:
        dst = APP_GUIDES / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(DOCS / rel, dst)
    print(f"  copied report + {len(images)} images to {APP_GUIDES.relative_to(REPO)}")


# --- Standalone report export --------------------------------------------------------


def export_pack(out: Path, md_text: str, images: list[str]) -> None:
    """Write the report (HTML/PDF/MD) into ``out``."""

    print(f"Export to {out}")
    assets = out / EXPORT_ASSET_DIR
    assets.mkdir(parents=True, exist_ok=True)
    flat = {rel: f"{EXPORT_ASSET_DIR}/{Path(rel).name}" for rel in images}
    if len(set(flat.values())) != len(flat):
        raise SystemExit("Two report images share a file name; the flat asset folder would clash.")
    for rel, dst in flat.items():
        shutil.copyfile(DOCS / rel, out / dst)

    html = REPORT_HTML.read_text(encoding="utf-8")
    for rel, dst in flat.items():
        html = html.replace(f'src="{rel}"', f'src="{dst}"')
    (out / "Meridian_Final_Report.html").write_text(html, encoding="utf-8")
    # Same content as the assessor PDF, so copy rather than print a second time.
    shutil.copyfile(ASSESSOR_PDF, out / "Meridian_Final_Report.pdf")

    # Markdown copy: images point at the flat asset folder; other relative links point
    # back into this repo, assuming the export sits next to it (as the default does).
    report_md = md_text
    for rel, dst in flat.items():
        report_md = report_md.replace(f"]({rel})", f"]({dst})")
    try:
        docs_rel = Path(os.path.relpath(DOCS, out)).as_posix() + "/"
    except ValueError:  # export on another drive: no relative path exists
        docs_rel = DOCS.as_uri() + "/"
    report_md = re.sub(
        r"\]\((?!https?:|#|mailto:|" + re.escape(EXPORT_ASSET_DIR) + r")([^)\s]+)\)",
        lambda m: f"]({docs_rel}{m.group(1)})",
        report_md,
    )
    (out / "Meridian_Final_Report.md").write_text(report_md, encoding="utf-8")
    print(f"  report html/pdf/md + {len(images)} images")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, help=f"export folder (default {DEFAULT_EXPORT})")
    parser.add_argument("--skip-export", action="store_true", help="only regenerate the repo files")
    args = parser.parse_args()

    md_text, images = build_report()
    sync_app_guides(images)
    if args.skip_export:
        return
    out = args.out or DEFAULT_EXPORT
    if args.out is None and not out.parent.is_dir():
        print(f"Skipping export: {out.parent} does not exist (pass --out to choose a folder).")
        return
    out.mkdir(parents=True, exist_ok=True)
    export_pack(out, md_text, images)


if __name__ == "__main__":
    main()
