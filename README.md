# Baldur's Gate 3 Character Generator

A small, browser-based character generator for Baldur's Gate 3. Generate a character, reroll individual sections, and save builds in your browser.

**Try it: https://thefallz.github.io/BG3CharacterGenerator/**

![A generated level 12 character with Class, Race, Background, Feats, Romance and Companion Build cards](docs/screenshot.png)

Up to date with Patch 8, the latest major patch. If you spot a rule that doesn't match the game, please [open an issue](https://github.com/TheFallZ/BG3CharacterGenerator/issues).

This is an unofficial fan project and is not affiliated with or endorsed by Larian Studios.

## Features

- Randomizes class, race, feats, background, romance, and the Dark Urge prompt.
- Builds a level 12 character. There is an 8% chance of a multiclass build, which splits the 12 levels (the starting class keeps 6 to 11), marked clearly in the Class card.
- Only gives each class what it has at its own level: subclasses appear at the level BG3 grants them, and choices such as invocations, maneuvers, metamagic, fighting styles and Wildheart aspects follow the class level.
- Picks one feat for each feat level (4, 8 and 12; Fighters also at 6 and Rogues at 10, counted per class in a multiclass). Feats don't repeat except Ability Improvement, and armor feats need the armor below them.
- Warlock invocations never repeat, and Agonizing and Repelling Blast are only picked when the warlock knows Eldritch Blast.
- Cleric deities respect BG3's race restrictions (Laduguer, Lolth and Vlaakith).
- Applies BG3 multiclass proficiency grants separately from starting-class skill choices, including multiclass-only skill picks.
- Avoids duplicate skill proficiencies from race, background, and class while preserving each class's starting skill count.
- Adds class-specific starting cantrip and spell picks for spellcasting classes, including companion and hireling builds. Cleric and Druid prepared-spell picks use a four-spell baseline (+3 Wisdom modifier); the actual count depends on Wisdom.
- Shows racial, background, and supported subclass proficiencies; Githyanki Astral Knowledge is labeled as a temporary grant.
- Includes The Haunted One in the background pool regardless of the Dark Urge response.
- Generates a companion or base-game hireling build with a subclass, preferred weapons, and a deity for Clerics. Companions can keep their default class or roll a different one; hirelings keep their base-game class.
- Lets you lock any card so Generate and rerolls keep it. Race and Background avoid skills that would duplicate a locked Class, and locking Companion Build also keeps its Romance. Locks are remembered in the browser.
- Saves, loads, renames, and deletes builds using browser storage.
- Runs as a static site with no server or account required.

## Run Locally

You can open `index.html` in a browser. To rebuild the JavaScript after changing the TypeScript source, install the development dependency and run the build from the project folder:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
```

Then open `index.html`.

## Host on GitHub Pages

1. Run `npm.cmd run build` and commit the generated `js/` folder along with `index.html` and `styles.css`.
2. Push the project to GitHub. The `node_modules` folder is excluded by `.gitignore` and is not needed for the hosted site.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/ (root)`, then save.

GitHub Pages will publish the site and show its URL in the Pages settings. The page uses `index.html` as its entry point.

When you change `styles.css` or the scripts, bump the `?v=` number on their links in `index.html`. GitHub Pages lets browsers cache files for 10 minutes, and the new number makes them fetch the matching files instead of mixing old and new.

## Project Layout

- `src/data.ts`: game data and rule tables (races, classes, backgrounds, spells, proficiencies, companions).
- `src/generator.ts`: the rolling rules that turn that data into a character.
- `src/app.ts`: the page: cards, locks, and saved builds.
- `js/`: compiled output loaded by `index.html`. Do not edit it by hand; it is overwritten on every build.
- `styles.css`: all styling. Colors are named tokens at the top of the file.

The source files are plain scripts that share one global scope, loaded in order by `index.html`, rather than ES modules. That keeps the page working when `index.html` is opened directly from disk, where browsers block module imports.

## TypeScript

Edit the files in `src/`. Check types and rebuild with:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Saved Builds

Saved characters are stored in the browser's local storage. They remain in that browser on that device and are not shared with other visitors or synced across devices.

## Proficiency Rules

The first generated class uses its starting-class skill picks. A second class uses BG3's multiclass proficiency grants instead of receiving all its starting-class skill picks. The BG3 Wiki notes that multiclass Clerics appear to receive two skill proficiencies despite this likely being a game bug; the generator mirrors that behavior.
