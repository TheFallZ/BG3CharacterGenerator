# Baldur's Gate 3 Character Generator

A small, browser-based character generator for Baldur's Gate 3. Generate a character, reroll individual sections, and save builds in your browser.

## Features

- Randomizes class, race, feats, background, romance, and the Dark Urge prompt.
- Has an 8% chance to generate a multiclass build, marked clearly in the Class card.
- Makes The Haunted One available as a background only when the Dark Urge response is affirmative.
- Saves, loads, and deletes builds using browser storage.
- Runs as a static site with no server or account required.

## Run Locally

You can open `index.html` in a browser. To rebuild the JavaScript after changing the TypeScript source, install the development dependency and run the build from the project folder:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
```

Then open `index.html`. `bg3gen.html` is also available as an alternate local entry page.

## Host on GitHub Pages

1. Run `npm.cmd run build` and commit the generated `app.js` along with `index.html` and `styles.css`.
2. Push the project to GitHub. The `node_modules` folder is excluded by `.gitignore` and is not needed for the hosted site.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/ (root)`, then save.

GitHub Pages will publish the site and show its URL in the Pages settings. The page uses `index.html` as its entry point.

## TypeScript

Edit `app.ts`; `app.js` is the compiled file loaded by the browser. Check types and rebuild with:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Saved Builds

Saved characters are stored in the browser's local storage. They remain in that browser on that device and are not shared with other visitors or synced across devices.
