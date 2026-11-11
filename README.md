# ExchangeMatch – source

The `main` branch is the built website (served by GitHub Pages). This `source` branch holds what it's built from.

- `exchangematch.html`: the app (one file: markup, styles, script). It's also published as a private Claude artifact.
- `data.json`: the data the app loads, generated from the ExchangeMatch register.
- `school-data-2027-28.json`: School records, used until the register holds them.
- `build/sync.py`: builds `data.json` from a register export plus fallback files.
- `build/make_site.py`: wraps the app as a standalone website.
- `build/fonts.py`: self-hosts the fonts. It needs the @fontsource packages unpacked into `build/fontpkgs`: run `npm pack @fontsource/inter@5.0.18 @fontsource/plus-jakarta-sans@5.0.20 @fontsource/ibm-plex-mono@5.0.13`, then untar each into `build/fontpkgs/<name>/`.
- `build/publish.sh <main-branch-checkout> https://leavyg.github.io/exchangematch "message"`: builds and pushes the live site.
