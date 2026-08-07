# Thesis narrative site

Long-scroll visual essay for Take Watanabe’s bachelor’s thesis, built with Vite and published via GitHub Pages from `/docs`.

## Develop

```bash
cd site
npm install
npm run dev
```

Figures are regenerated from `data/literacy/Female_literacy_with_recruitment_intensity.csv` via `npm run figures` (also run automatically before `dev` / `build`).

## Build for GitHub Pages

```bash
cd site
npm run build
```

This writes static files to `../docs` with `base: '/thesis-ppe/'`.

## Enable GitHub Pages

1. Push `docs/` to `main` (or your default branch) on `takewtnb/thesis-ppe`.
2. Repo **Settings → Pages**.
3. **Source:** Deploy from a branch.
4. **Branch:** `main` / folder **`/docs`**.
5. Save. Site URL: `https://takewtnb.github.io/thesis-ppe/`

If the repository is renamed, update `base` in `vite.config.js` to match and rebuild.
