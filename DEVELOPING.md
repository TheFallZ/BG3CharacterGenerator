# Developing

Notes for working on the generator. To just use it, go to https://thefallz.github.io/BG3CharacterGenerator/.

## Build

Edit the TypeScript in `src/`, then check types and rebuild from the project folder:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
```

Open `index.html` in a browser to try your changes.

## Publish

The live site is GitHub Pages, deployed from the `main` branch root. Commit the rebuilt `js/` folder along with your changes and push; the site updates within a minute or two.

When you change `styles.css` or the scripts, bump the `?v=` number on their links in `index.html`. GitHub Pages lets browsers cache files for 10 minutes, and the new number makes them fetch the matching files instead of mixing old and new.

## Project Layout

- `src/data.ts`: game data and rule tables (races, classes, backgrounds, spells, proficiencies, companions).
- `src/generator.ts`: the rolling rules that turn that data into a character.
- `src/app.ts`: the page: cards, locks, and saved builds.
- `js/`: compiled output loaded by `index.html`. Do not edit it by hand; it is overwritten on every build.
- `styles.css`: all styling. Colors are named tokens at the top of the file.

The source files are plain scripts that share one global scope, loaded in order by `index.html`, rather than ES modules. That keeps the page working when `index.html` is opened directly from disk, where browsers block module imports.
