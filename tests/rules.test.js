"use strict";

// Rolls thousands of random builds and checks each one against the game's rules.
// Run with `npm test` after `npm run build`; it tests the compiled scripts in js/.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const BUILDS = Number(process.env.BUILDS) || 3000;

// The page scripts share one global scope, so they run in one context like they do in a page.
const context = vm.createContext({console, structuredClone});
for (const file of ["data.js", "generator.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js", file), "utf8"), context, {filename: file});
}
const run = code => vm.runInContext(code, context);

// The same order the Generator page rolls a fresh build in.
run(`
function rollBuild(overrides = {}) {
  settings = {...defaultSettings(), ...overrides};
  character = {};
  character.origin = rollOrigin();
  character.darkUrge = rollDarkUrge();
  character.race = rollRace();
  character.background = rollBackground();
  character.class = rollClass();
  character.abilities = rollAbilities();
  character.feats = rollFeats();
  character.romance = rollRomance();
  character.companionBuild = settings.party ? rollParty(character.romance) : rollCompanionBuild(character.romance);
  return JSON.parse(JSON.stringify(character));
}
`);

const SETTING_MIXES = [
  {},
  {multiclass: "always"},
  {multiclass: "always", tripleClass: true},
  {multiclass: "never", originCharacters: true, party: true}
];

const builds = SETTING_MIXES.flatMap(overrides =>
  Array.from({length: BUILDS / SETTING_MIXES.length}, () => ({overrides, build: run(`rollBuild(${JSON.stringify(overrides)})`)}))
);

const values = entry => entry == null ? [] : Array.isArray(entry.value) ? entry.value : entry.value == null ? [] : [entry.value];
const labelled = (entries, test) => (entries || []).filter(entry => typeof test === "string" ? entry.label === test : test(entry.label));
const all = (entries, label) => labelled(entries, label).flatMap(values);

// Splits the class card into one block per class, each starting at its "Class" entry.
function classBlocks(entries) {
  const blocks = [];
  for (const entry of entries) {
    if (entry.label === "Class") blocks.push({name: entry.value, level: 12, entries: []});
    if (!blocks.length) continue;
    const block = blocks[blocks.length - 1];
    if (entry.label === "Level") block.level = Number(entry.value);
    block.entries.push(entry);
  }
  return blocks;
}

function forEachBuild(check) {
  for (const {overrides, build} of builds) {
    try {
      check(build, overrides);
    } catch (error) {
      error.message += `\nSettings: ${JSON.stringify(overrides)}\nBuild: ${JSON.stringify(build)}`;
      throw error;
    }
  }
}

// Race skills share a label with weapon and armor proficiencies, so only real skill names count.
const SKILLS = new Set(run("Object.values(data.classes).flatMap(cls => cls.skills)"));
const raceSkills = race => labelled(race, label => label === "Racial Proficiencies" || label === "Additional Skill Proficiency")
  .flatMap(values).filter(skill => SKILLS.has(skill));

const C = run(`({
  SUBCLASS_LEVELS, SUBCLASS_LABELS, EXPERTISE_LEVELS, MAGICAL_SECRETS, FEAT_LEVELS, DEFAULT_FEAT_LEVELS,
  WEAPON_STYLE_FEATS, SPELL_FEATS, CASTER_CLASSES, CASTER_SUBCLASSES, CLASS_SKILL_LABELS, BACKGROUND_SKILLS,
  ORIGIN_CHARACTERS, CUSTOM_ORIGIN, DARK_URGE_ORIGIN, DARK_URGE_BACKGROUND, POINT_BUY_SPREADS, ABILITIES,
  options: Object.fromEntries(Object.entries(data.classes).map(([name, cls]) => [name, cls.options || {}]))
})`);

test("every build has all of its cards", () => {
  forEachBuild(build => {
    for (const key of ["origin", "race", "background", "class", "abilities", "feats", "romance", "companionBuild"]) {
      assert.ok(build[key] !== undefined, `missing ${key}`);
    }
  });
});

test("class levels add up to 12, with no class twice", () => {
  forEachBuild((build, overrides) => {
    const blocks = classBlocks(build.class);
    assert.equal(blocks.reduce((sum, block) => sum + block.level, 0), 12);
    assert.equal(new Set(blocks.map(block => block.name)).size, blocks.length);
    assert.ok(blocks.length <= (overrides.tripleClass ? 3 : 2));
    if (overrides.multiclass === "never") assert.equal(blocks.length, 1);
    if (overrides.multiclass === "always") assert.ok(blocks.length >= 2);
  });
});

test("subclasses appear only from the level they unlock", () => {
  forEachBuild(build => {
    for (const block of classBlocks(build.class)) {
      const hasSubclass = labelled(block.entries, C.SUBCLASS_LABELS[block.name]).length > 0;
      assert.equal(hasSubclass, block.level >= C.SUBCLASS_LEVELS[block.name], `${block.name} ${block.level}`);
    }
  });
});

test("race, background and class never give the same skill twice", () => {
  forEachBuild(build => {
    // The Dark Urge's background is fixed, so a Half-Orc Dark Urge gets Intimidation twice, as in the game.
    const background = all(build.background, "Background Skill Proficiencies");
    const skills = [
      ...new Set(raceSkills(build.race)).difference(build.origin === C.DARK_URGE_ORIGIN ? new Set(background) : new Set()),
      ...background,
      ...labelled(build.class, label => C.CLASS_SKILL_LABELS.includes(label)).flatMap(values)
    ];
    const repeats = skills.filter((skill, index) => skills.indexOf(skill) !== index);
    assert.deepEqual(repeats, []);
  });
});

test("Expertise is two skills per Expertise level, in skills the character has", () => {
  forEachBuild(build => {
    const owned = new Set([
      ...raceSkills(build.race),
      ...all(build.background, "Background Skill Proficiencies"),
      ...labelled(build.class, label => C.CLASS_SKILL_LABELS.includes(label)).flatMap(values),
      ...all(build.class, "Favored Enemy").concat(all(build.class, "Natural Explorer"))
        .map(pick => run("RANGER_PICK_SKILLS")[pick]).filter(Boolean)
    ]);
    const expertise = [];
    for (const block of classBlocks(build.class)) {
      const picks = all(block.entries, "Expertise");
      const expected = (C.EXPERTISE_LEVELS[block.name] || []).filter(level => block.level >= level).length * 2;
      assert.equal(picks.length, expected, `${block.name} ${block.level}`);
      expertise.push(...picks);
    }
    assert.equal(new Set(expertise).size, expertise.length, "repeated Expertise");
    for (const skill of expertise) assert.ok(owned.has(skill), `Expertise in ${skill} without proficiency`);
  });
});

test("no cantrip is learned twice", () => {
  forEachBuild(build => {
    const cantrips = labelled(build.class, label => /Cantrip/.test(label)).flatMap(values);
    assert.equal(new Set(cantrips).size, cantrips.length, cantrips.join(", "));
  });
});

test("warlock invocations follow the rules", () => {
  forEachBuild(build => {
    for (const block of classBlocks(build.class).filter(block => block.name === "Warlock")) {
      const invocations = labelled(block.entries, label => label.startsWith("Eldritch Invocations")).flatMap(values);
      assert.equal(new Set(invocations).size, invocations.length);
      const expected = [[2, 2], [5, 1], [7, 1], [9, 1], [12, 1]].filter(([at]) => block.level >= at).reduce((sum, [, count]) => sum + count, 0);
      assert.equal(invocations.length, expected);
      if (invocations.includes("Agonizing Blast") || invocations.includes("Repelling Blast")) {
        assert.ok(all(build.class, "Starting Cantrips").includes("Eldritch Blast"), "blast invocation without Eldritch Blast");
      }
      assert.equal(labelled(block.entries, "Mystic Arcanum").length, block.level >= 11 ? 1 : 0);
    }
  });
});

test("subclass choices match the subclass and level", () => {
  forEachBuild(build => {
    for (const block of classBlocks(build.class)) {
      const subclass = values(labelled(block.entries, C.SUBCLASS_LABELS[block.name])[0])[0];
      const count = label => all(block.entries, label).length;
      if (block.name === "Bard") {
        const lore = all(block.entries, "Magical Secrets (Level 6)");
        assert.equal(lore.length, subclass === "College of Lore" && block.level >= 6 ? 2 : 0);
        lore.forEach(spell => assert.ok(C.MAGICAL_SECRETS.slice(0, 4).flat().includes(spell), spell));
        assert.equal(count("Magical Secrets (Level 10)"), block.level >= 10 ? 2 : 0);
        assert.equal(count("College of Lore Skill Proficiencies"), subclass === "College of Lore" ? 3 : 0);
      }
      if (block.name === "Fighter") {
        const shots = subclass === "Arcane Archer" ? (block.level >= 10 ? 5 : block.level >= 7 ? 4 : 3) : 0;
        assert.equal(count("Arcane Shots"), shots);
        assert.equal(count("Arcane Archer Cantrip"), subclass === "Arcane Archer" ? 1 : 0);
      }
      if (block.name === "Monk") {
        const disciplines = all(block.entries, "Elemental Disciplines");
        const expected = subclass === "Way of the Four Elements" ? 3 + [6, 9, 11].filter(level => block.level >= level).length : 0;
        assert.equal(disciplines.length, expected);
        assert.equal(new Set(disciplines).size, disciplines.length);
        const options = C.options.Monk["Way of the Four Elements"];
        if (block.level < 6) disciplines.forEach(name => assert.ok(options["Elemental Disciplines"].includes(name), name));
        if (block.level < 11) disciplines.forEach(name => assert.ok(!options["Level 11 Disciplines"].includes(name), name));
      }
      if (block.name === "Ranger") {
        assert.equal(count("Gathered Swarm"), subclass === "Swarmkeeper" ? 1 : 0);
        const picks = 1 + (block.level >= 6 ? 1 : 0) + (block.level >= 10 ? 1 : 0);
        assert.equal(count("Favored Enemy"), picks);
        assert.equal(count("Natural Explorer"), picks);
      }
      if (block.name === "Druid") assert.equal(count("Bonus Cantrip"), subclass === "Circle of the Land" ? 1 : 0);
      if (block.name === "Cleric") assert.equal(count("Druid Cantrip"), subclass === "Nature" ? 1 : 0);
      if (block.name === "Warlock" && subclass !== "Hexblade") {
        const weapon = values(labelled(block.entries, "Preferred Weapon")[0])[0];
        if (weapon) assert.ok(!C.options.Warlock["Hexblade Pact Weapons"].includes(weapon), `${weapon} without Hexblade`);
      }
    }
  });
});

test("every background comes with one alignment", () => {
  const alignments = run("ALIGNMENTS");
  forEachBuild(build => {
    const rolled = all(build.background, "Alignment");
    assert.equal(rolled.length, 1);
    assert.ok(alignments.includes(rolled[0]), rolled[0]);
  });
});

test("Lolth-sworn drow clerics follow Lolth", () => {
  forEachBuild(build => {
    const races = [...all(build.race, "Race"), ...all(build.race, "Subrace")];
    const deity = all(build.class, "Deity")[0];
    if (races.includes("Lolth-Sworn Drow") && deity) assert.equal(deity, "Lolth");
  });
});

test("feats fill every feat level and make sense together", () => {
  forEachBuild(build => {
    const blocks = classBlocks(build.class);
    const expected = blocks.reduce((sum, block) => sum + (C.FEAT_LEVELS[block.name] || C.DEFAULT_FEAT_LEVELS).filter(level => level <= block.level).length, 0);
    const feats = build.feats.flatMap(values);
    assert.equal(build.feats.length, expected);
    assert.equal(feats.length, expected, "empty feat level");
    const names = feats.map(feat => feat.split(":")[0].trim()).filter(name => name !== "Ability Improvement");
    assert.equal(new Set(names).size, names.length, `repeated feat: ${names.join(", ")}`);
    assert.ok(names.filter(name => C.WEAPON_STYLE_FEATS.includes(name)).length <= 1, `clashing feats: ${names.join(", ")}`);
    const casts = blocks.some(block => block.level >= (C.CASTER_CLASSES[block.name] ?? Infinity)) ||
      C.CASTER_SUBCLASSES.some(subclass => build.class.flatMap(values).includes(subclass));
    if (!casts) names.forEach(name => assert.ok(!C.SPELL_FEATS.includes(name), `${name} without spells`));
  });
});

test("origins set race and background, and stay off unless allowed", () => {
  forEachBuild((build, overrides) => {
    if (!overrides.originCharacters) assert.equal(build.origin, C.CUSTOM_ORIGIN);
    const background = all(build.background, "Background")[0];
    if (build.origin === C.DARK_URGE_ORIGIN) assert.equal(background, C.DARK_URGE_BACKGROUND);
    const profile = C.ORIGIN_CHARACTERS[build.origin];
    if (profile) {
      assert.equal(background, profile.background);
      assert.equal(all(build.race, "Race")[0], profile.race);
    }
  });
});

// Adds up the Ability Scores card and every feat that raises a score, in feat order.
function finalScores(build) {
  const scores = Object.fromEntries(C.ABILITIES.map(ability => [ability, Number(all(build.abilities, ability)[0])]));
  for (const feat of build.feats.flatMap(values)) {
    const [name, choice = ""] = feat.split(":").map(part => part.trim());
    if (name === "Ability Improvement") {
      const increases = [...choice.matchAll(/\+(\d) (\w+)/g)];
      assert.ok(increases.length && increases.reduce((sum, [, amount]) => sum + Number(amount), 0) === 2, `${feat} should add 2 points`);
      for (const [, amount, ability] of increases) scores[ability] += Number(amount);
    } else if (name === "Resilient") {
      scores[choice] += 1;
    }
    for (const ability of C.ABILITIES) assert.ok(scores[ability] <= 20, `${ability} reaches ${scores[ability]} after ${feat}`);
  }
  return scores;
}

test("feats never push an ability score past 20", () => {
  forEachBuild(build => finalScores(build));
});

test("new ability scores keep kept feats under 20", () => {
  for (let i = 0; i < BUILDS; i++) {
    const build = run(`(() => {
      rollBuild();
      for (let n = 0; n < 3; n++) {
        character.abilities = rollAbilities();
        character.feats = rollFeats(featValues());
      }
      return JSON.parse(JSON.stringify(character));
    })()`);
    finalScores(build);
  }
});

test("ability scores are a 27-point buy plus +2 and +1", () => {
  forEachBuild(build => {
    const scores = C.ABILITIES.map(ability => Number(all(build.abilities, ability)[0]));
    const bonuses = all(build.abilities, "Racial bonuses")[0].match(/\+2 (\w+), \+1 (\w+)/);
    assert.ok(bonuses);
    const base = scores.map((score, index) => score - (C.ABILITIES[index] === bonuses[1] ? 2 : C.ABILITIES[index] === bonuses[2] ? 1 : 0));
    const spread = [...base].sort((a, b) => b - a);
    assert.ok(C.POINT_BUY_SPREADS.some(option => option.join() === spread.join()), spread.join());
  });
});

test("the romance is a companion or no one, never the character you play", () => {
  const romances = run("data.romances");
  forEachBuild(build => {
    assert.ok(romances.includes(build.romance), build.romance);
    assert.notEqual(build.romance, build.origin);
  });
});

test("companions and hirelings match the game", () => {
  const defaults = run("COMPANION_DEFAULT_CLASSES");
  const hirelings = new Map(run("BASE_HIRELINGS").map(hireling => [hireling.name, hireling.defaultClass]));
  forEachBuild(build => {
    const entries = build.companionBuild;
    const starts = entries.map((entry, index) => ["Companion", "Hireling"].includes(entry.label) ? index : -1).filter(index => index >= 0);
    starts.forEach((start, n) => {
      const member = entries.slice(start, starts[n + 1] ?? entries.length);
      const name = member[0].value;
      const className = all(member, "Class")[0];
      const subclass = all(member, "Subclass")[0];
      assert.ok(C.options[className] !== undefined, className);
      assert.ok(run(`data.classes[${JSON.stringify(className)}].subclasses`).includes(subclass), `${className} ${subclass}`);
      if (member[0].label === "Hireling") {
        assert.equal(build.romance, "No One");
        assert.equal(className, hirelings.get(name), name);
      } else {
        assert.ok(defaults[name], name);
        if (all(member, "Class choice")[0] === "Default class") assert.equal(className, defaults[name], name);
        else assert.notEqual(className, defaults[name], name);
      }
      const deity = all(member, "Deity")[0];
      assert.equal(!!deity, className === "Cleric", `${name} ${className} deity`);
      if (name === "Shadowheart" && deity) assert.match(deity, /Shar or Selûne/);
      if (name === "Minthara" && deity) assert.equal(deity, "Lolth");
    });
  });
});

test("clerics only prefer weapons they're proficient with", () => {
  const martial = run("MARTIAL_CLERIC_WEAPONS");
  const grants = run("SUBCLASS_PROFICIENCIES.Cleric");
  const check = (entries, subclass) => {
    const weapon = all(entries, "Preferred melee weapon")[0];
    if (weapon && martial.includes(weapon)) assert.ok((grants[subclass] || []).includes("Martial Weapons"), `${subclass} cleric with ${weapon}`);
  };
  forEachBuild(build => {
    const [first] = classBlocks(build.class);
    if (first.name === "Cleric") check(build.class, all(first.entries, C.SUBCLASS_LABELS.Cleric)[0]);
    const entries = build.companionBuild;
    entries.forEach((entry, index) => {
      if (entry.label === "Class" && entry.value === "Cleric") {
        const member = entries.slice(index, index + 8);
        check(member, all(member, "Subclass")[0]);
      }
    });
  });
});

test("a full party has three different companions, never the character you play", () => {
  forEachBuild((build, overrides) => {
    if (!overrides.party) return;
    const members = [...all(build.companionBuild, "Companion"), ...all(build.companionBuild, "Hireling")];
    assert.equal(members.length, 3);
    assert.equal(new Set(members).size, 3);
    assert.ok(!members.includes(build.origin));
  });
});
