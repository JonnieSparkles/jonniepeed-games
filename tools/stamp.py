"""Cache-bust local files by adding ?v=<content hash> to every link in site/*.html.

Browsers reuse cached scripts and images on a normal reload, so after an update
players can end up with new HTML running old game.js. With a content hash in the
URL, any changed file gets a new address and is fetched fresh; unchanged files
keep their hash and stay cached.

Run from the repo root after changing anything in site/ (the Pages workflow also runs it):
    python3 tools/stamp.py
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
BASE = "https://jonniesparkles.github.io/jonniepeed-games/"
EXTS = (".js", ".css", ".png", ".webp", ".jpg", ".ico", ".woff2")

ATTR = re.compile(r'(?P<attr>\b(?:src|href|content))="(?P<url>[^"#?]+)(?:\?v=[0-9a-f]+)?"')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def stamp_html(html_path):
    text = html_path.read_text()
    changed = 0

    def fix(m):
        nonlocal changed
        url = m.group("url")
        if not url.endswith(EXTS):
            return m.group(0)
        if url.startswith(BASE):
            target = SITE / url[len(BASE):]
        elif "://" in url or url.startswith(("/", "data:", "mailto:")):
            return m.group(0)
        else:
            target = (html_path.parent / url).resolve()
        if not target.is_file():
            return m.group(0)
        new = f'{m.group("attr")}="{url}?v={digest(target)}"'
        if new != m.group(0):
            changed += 1
        return new

    out = ATTR.sub(fix, text)
    if out != text:
        html_path.write_text(out)
    return changed


def main():
    for html in sorted(SITE.rglob("*.html")):
        n = stamp_html(html)
        print(f"{html.relative_to(ROOT)}: {n} link{'s' if n != 1 else ''} updated")


if __name__ == "__main__":
    main()
