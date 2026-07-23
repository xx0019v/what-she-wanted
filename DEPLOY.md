# Deploy

Live: https://xx0019v.github.io/what-she-wanted/

## Update (re-deploy) after code changes
```bash
npm run build
npm run deploy   # publishes ./dist to the gh-pages branch
```
Pages serves from the `gh-pages` branch (root). The Vite `base: './'`
keeps every asset path relative, so it works on the project subpath.

> The GitHub Actions workflow was removed because the local token lacks the
> `workflow` OAuth scope. To switch to Actions later, run
> `gh auth refresh -s workflow` in an interactive shell and restore
> `.github/workflows/deploy-pages.yml`.
