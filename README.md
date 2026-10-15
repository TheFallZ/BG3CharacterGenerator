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
- Works in any browser, with no account or sign-up needed.

## Saved Builds

Saved characters are stored in the browser's local storage. They remain in that browser on that device and are not shared with other visitors or synced across devices.

## Proficiency Rules

The first generated class uses its starting-class skill picks. A second class uses BG3's multiclass proficiency grants instead of receiving all its starting-class skill picks. The BG3 Wiki notes that multiclass Clerics appear to receive two skill proficiencies despite this likely being a game bug; the generator mirrors that behavior.
