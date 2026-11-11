"""Build the public website (site/) from the app page and its data.

Usage: python3 -I build/make_site.py <app.html> <data.json> <out_dir> [site_url]

The app page is authored for Claude artifacts (no doctype/head; the artifact host adds them).
This wraps it in a full standalone HTML document with the same base reset the artifact host
uses, plus the metadata a public website needs (description, link previews, icon).
"""
import sys, os, shutil, re

app_path, data_path, out_dir = sys.argv[1:4]
site_url = (sys.argv[4] if len(sys.argv) > 4 else "").rstrip("/")

src = open(app_path, encoding="utf-8").read()
marker = '<div class="wrap">'
cut = src.index(marker)
head_part, body_part = src[:cut], src[cut:]
head_part = head_part.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
# Self-hosted fonts instead of Google Fonts (no third-party requests; GDPR-friendly)
head_part = re.sub(r'<link rel="preconnect"[^>]*>\n', "", head_part)
import hashlib
_ver = hashlib.sha1(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts.py"), "rb").read()).hexdigest()[:8]
head_part = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', f'<link rel="stylesheet" href="fonts.css?v={_ver}">', head_part)

desc = ("Every 2027/28 Trinity exchange that fits your BESS pathway, "
        "School and College-wide. Save and rank your favourites.")
og = ""
if site_url:
    og = (f'<meta property="og:url" content="{site_url}/">\n'
          f'<meta property="og:image" content="{site_url}/og.png">\n'
          f'<meta name="twitter:image" content="{site_url}/og.png">\n'
          f'<link rel="canonical" href="{site_url}/">\n')

doc = f"""<!doctype html>
<html lang="en-IE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="{desc}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#11224D">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ExchangeMatch">
<meta property="og:title" content="ExchangeMatch: where can your degree take you?">
<meta property="og:description" content="{desc}">
<meta name="twitter:card" content="summary_large_image">
{og}<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
body{{margin:0;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
</style>
{head_part.strip()}
</head>
<body>
{body_part.strip()}
</body>
</html>
"""

os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8").write(doc)
shutil.copyfile(data_path, os.path.join(out_dir, "data.json"))
open(os.path.join(out_dir, "favicon.svg"), "w").write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#11224D"/>'
    '<path d="M8.5 22.5C9.5 13 19 9 24 11.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2.2 2.6"/>'
    '<circle cx="8.5" cy="22.5" r="2.6" fill="#fff"/><circle cx="23.5" cy="11.5" r="3.1" fill="#A9BEFF"/></svg>')
# GitHub Pages: serve files as-is (no Jekyll processing)
open(os.path.join(out_dir, ".nojekyll"), "w").write("")
og_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "og.png")
if os.path.exists(og_src): shutil.copyfile(og_src, os.path.join(out_dir, "og.png"))
print("built", out_dir, "url:", site_url or "(not set)")
