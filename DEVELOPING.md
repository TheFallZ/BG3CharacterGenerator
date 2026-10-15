# Developing

Notes for working on the generator. To just use it, go to https://thefallz.github.io/BG3CharacterGenerator/.

## Build

Edit the TypeScript in `src/`, then check types and rebuild from the project folder:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

`npm test` rolls a few thousand random builds from the compiled `js/` and checks each against the game's rules: class levels, subclass unlocks, skills, Expertise, cantrips, invocations, feats, origins, ability scores and parties. Set `BUILDS` to roll more, for example `$env:BUILDS=20000; npm.cmd test`.

Serve the folder (for example `python -m http.server`) and open it in a browser to try your changes. Opening `index.html` straight from disk works for the generator, but links between pages work best when served.

## Publish

The live site is GitHub Pages, deployed from the `main` branch root. New work goes on the `dev` branch; to release, merge `dev` into `main` and push. Commit the rebuilt `js/` folder along with your changes; the site updates within a minute or two of a push to `main`.

When you change `styles.css` or the scripts, bump the `?v=` number on their links in every page (`index.html`, `saved/index.html`, `settings/index.html`, `about/index.html`, `whats-new/index.html`). GitHub Pages lets browsers cache files for 10 minutes, and the new number makes them fetch the matching files instead of mixing old and new.

## Project Layout

- `src/data.ts`: game data and rule tables (races, classes, backgrounds, spells, proficiencies, companions).
- `src/generator.ts`: the rolling rules that turn that data into a character.
- `src/common.ts`: shared by every page: settings and saved-build storage, share links, copy text.
- `src/home.ts`: the Generator page (`index.html`): cards, locks, saving and sharing.
- `src/saved.ts`: the Saved builds page (`saved/index.html`).
- `src/settings.ts`: the Settings page (`settings/index.html`).
- `about/index.html`: the About page. It's plain HTML and only loads the shared scripts for the header.
- `whats-new/index.html`: the What's new page, also plain HTML. Add a section at the top for each release.

For each release, add a section to the top of the What's new page, update the banner text in `index.html` (`#updateBanner`), and change `LATEST_UPDATE` in `src/home.ts` so visitors who dismissed the last banner see the new one.
- `js/`: compiled output loaded by the pages. Do not edit it by hand; it is overwritten on every build.
- `styles.css`: all styling. Colors are named tokens at the top of the file.

The source files are plain scripts that share one global scope, loaded in order by each page (`data.js`, `generator.js`, `common.js`, then the page's own script), rather than ES modules. That keeps the pages working when opened directly from disk, where browsers block module imports. Each page has the same header and footer, so a change to one belongs in all of them.

The Generator page keeps the build on screen in the tab's session storage, so visiting another page and coming back shows the same build. Earlier builds from the tab are kept there too, for Undo.

## Proficiency Rules

The first generated class uses its starting-class skill picks. A second class uses BG3's multiclass proficiency grants instead of receiving all its starting-class skill picks. The BG3 Wiki notes that multiclass Clerics appear to receive two skill proficiencies despite this likely being a game bug; the generator mirrors that behavior.
