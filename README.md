# ExchangeMatch: source

The `main` branch holds the built website that GitHub Pages serves. This `source` branch holds what the site is built from.

- `page.html` (markup and styles) + `app.js` (script) → `exchangematch.html`, the app as a single file. It's also published as a private Claude artifact.
- `data.json`: the data the app loads. It's generated from the ExchangeMatch register by `build/sync.py`, and `build/wording.py` rewrites the coordinator wording into short student-facing lines.
- `school-data-2027-28.json`: School records, used until the register holds them.
- `build/make_site.py`: wraps the app as a standalone website.
- `build/fonts.py`: self-hosts Schibsted Grotesk. It needs `@fontsource/schibsted-grotesk@5.2.8` unpacked into `build/fontpkgs/fontsource-schibsted-grotesk-5.2.8/`.
- `build/publish.sh <main-checkout> https://leavyg.github.io/exchangematch "message"`: builds the site and pushes it.
