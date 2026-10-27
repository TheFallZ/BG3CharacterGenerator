"use strict";
let data = structuredClone(DEFAULT_DATA);
let character = {};
const MAX_LEVEL = 12;
function defaultSettings() {
    return { excludedClasses: [], excludedRaces: [], multiclass: "sometimes", tripleClass: false, hiddenCards: [], party: false, originCharacters: false, showAlignment: true, showLevelOrder: true };
}
let settings = defaultSettings();
// Classes and races the visitor allows; excluding everything falls back to the full list.
function allowedNames(names, excluded) {
    const allowed = names.filter(name => !excluded.includes(name));
    return allowed.length ? allowed : names;
}
function allowedClasses() {
    return allowedNames(Object.keys(data.classes), settings.excludedClasses);
}
function allowedRaces() {
    return allowedNames(Object.keys(data.races), settings.excludedRaces);
}
function rollStartingMagic(className) {
    const magic = STARTING_MAGIC[className];
    if (!magic)
        return [];
    return [
        { label: "Starting Cantrips", value: pickMany(magic.cantrips, magic.cantripCount) },
        { label: magic.spellLabel ?? "Starting Spells", value: pickMany(magic.spells, magic.spellCount) }
    ];
}
function pick(list) {
    if (!Array.isArray(list) || !list.length)
        return null;
    return list[Math.floor(Math.random() * list.length)];
}
function pickMany(list, count) {
    if (!Array.isArray(list) || !list.length)
        return [];
    const pool = [...list];
    const result = [];
    while (pool.length && result.length < count) {
        result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return result;
}
function entryValues(entry) {
    if (!entry)
        return [];
    return Array.isArray(entry.value) ? entry.value : typeof entry.value === "string" ? [entry.value] : [];
}
// The single-text values of every entry with this label, like a build's "Class" entries.
function entryText(entries, label) {
    return (entries || [])
        .filter(entry => entry.label === label && typeof entry.value === "string")
        .map(entry => entry.value);
}
// The race a build shows: its subrace, or its race when it has none.
function shownRace(race = character.race) {
    return entryText(race, "Subrace")[0] ?? entryText(race, "Race")[0] ?? null;
}
// The background's name, from its entries or, in builds from before those, the plain name.
function backgroundName(background = character.background) {
    return typeof background === "string" ? background : entryText(background, "Background")[0] ?? null;
}
function randomSkills(className, count, excludedSkills = [], reservedSkills = [], reservedCount = 0) {
    const cls = data.classes[className];
    const availableSkills = (cls?.skills || []).filter(skill => !excludedSkills.includes(skill));
    if (!reservedSkills.length)
        return pickMany(availableSkills, count);
    const reservedSet = new Set(reservedSkills);
    const safeSkills = availableSkills.filter(skill => !reservedSet.has(skill));
    const overlappingSkills = availableSkills.filter(skill => reservedSet.has(skill));
    const safePicks = pickMany(safeSkills, Math.min(count, safeSkills.length));
    const overlapCapacity = Math.max(0, reservedSkills.length - reservedCount);
    const overlappingPicks = pickMany(overlappingSkills, Math.min(count - safePicks.length, overlapCapacity));
    return [...safePicks, ...overlappingPicks];
}
function getRacialSkillProficiencies(race = character.race) {
    const skillNames = new Set(Object.values(data.classes).flatMap(classInfo => classInfo.skills));
    const racialEntries = race || [];
    const skills = racialEntries.flatMap(entry => {
        if (entry.label !== "Racial Proficiencies" && entry.label !== "Additional Skill Proficiency")
            return [];
        return entryValues(entry).filter(skill => skillNames.has(skill));
    });
    return [...new Set(skills)];
}
// The skills listed on the Background card, or the background's usual skills for older builds.
function getBackgroundSkillProficiencies(background = character.background) {
    const skillEntry = Array.isArray(background) ? background.find(entry => entry.label === "Background Skill Proficiencies") : undefined;
    if (Array.isArray(skillEntry?.value))
        return skillEntry.value.filter((skill) => typeof skill === "string");
    return BACKGROUND_SKILLS[backgroundName(background) ?? ""] || [];
}
const CLASS_SKILL_LABELS = ["Skill Proficiencies", "Multiclass Skill Proficiencies", "Nature Domain Skill Proficiency", "Subclass Skill Proficiency", "College of Lore Skill Proficiencies"];
function getClassSkillProficiencies(classEntries = character.class) {
    const entries = classEntries || [];
    const rangerPicks = entries
        .filter(entry => entry.label === "Favored Enemy" || entry.label === "Natural Explorer")
        .flatMap(entryValues)
        .map(pick => RANGER_PICK_SKILLS[pick])
        .filter((skill) => !!skill);
    return [...entries.filter(entry => CLASS_SKILL_LABELS.includes(entry.label)).flatMap(entryValues), ...rangerPicks];
}
// Picks a Favored Enemy or Natural Explorer set whose granted skills the character doesn't already
// have and that don't overlap each other. When there aren't enough of those, the rest are filled
// with whatever is left, so as few skills as possible repeat.
function rollRangerPicks(options, count, owned) {
    const used = new Set(owned);
    const result = [];
    const leftover = [];
    for (const option of pickMany(options, options.length)) {
        const skill = RANGER_PICK_SKILLS[option];
        if (result.length < count && !(skill && used.has(skill))) {
            if (skill)
                used.add(skill);
            result.push(option);
        }
        else {
            leftover.push(option);
        }
    }
    return [...result, ...leftover.slice(0, count - result.length)];
}
function getExistingSkillProficiencies() {
    return [...new Set([...getRacialSkillProficiencies(), ...getBackgroundSkillProficiencies()])];
}
// Each class in the build with its level, in the order the classes were taken.
// Builds saved before levels existed have no "Level" entry and count as level 12.
function getClassLevels(classEntries = character.class) {
    const result = [];
    for (const entry of classEntries || []) {
        if (entry.label === "Class" && typeof entry.value === "string") {
            result.push({ className: entry.value, level: MAX_LEVEL });
        }
        else if (entry.label === "Level" && result.length) {
            result[result.length - 1].level = Number(entry.value) || MAX_LEVEL;
        }
    }
    return result;
}
function rollDarkUrge() {
    return pick(data.darkUrge);
}
// The origin character being played, if any; they fix race and background.
function originProfile(origin = character.origin) {
    return ORIGIN_CHARACTERS[origin ?? ""] ?? null;
}
// Who you play. A locked race or background rules out origins that would change it, and a kept
// romance or companion can't also be you.
function rollOrigin(keepRace = false, keepBackground = false, avoidNames = []) {
    if (!settings.originCharacters || settings.hiddenCards.includes("origin"))
        return CUSTOM_ORIGIN;
    const keptBackground = keepBackground ? backgroundName() : null;
    const darkUrgeAllowed = !keepBackground || keptBackground === DARK_URGE_BACKGROUND;
    const originsAllowed = !keepRace && !keepBackground;
    const roll = Math.random() * 100;
    if (roll < ORIGIN_CHANCES.custom || !darkUrgeAllowed && !originsAllowed)
        return CUSTOM_ORIGIN;
    if (roll < ORIGIN_CHANCES.custom + ORIGIN_CHANCES.darkUrge)
        return darkUrgeAllowed ? DARK_URGE_ORIGIN : CUSTOM_ORIGIN;
    const origins = Object.keys(ORIGIN_CHARACTERS).filter(name => !avoidNames.includes(name));
    return originsAllowed ? pick(origins) ?? CUSTOM_ORIGIN : CUSTOM_ORIGIN;
}
function rollRace() {
    const profile = originProfile();
    if (profile)
        return raceEntries(profile.race, profile.subrace ?? null, BACKGROUND_SKILLS[profile.background] || []);
    const race = pick(allowedRaces()) ?? "Human";
    // The Dark Urge always has The Haunted One background, so a Human's bonus skill steers around it.
    const avoid = character.origin === DARK_URGE_ORIGIN ? BACKGROUND_SKILLS[DARK_URGE_BACKGROUND] || [] : [];
    return raceEntries(race, pick(data.races[race]?.subraces), avoid);
}
// A race's entries with its proficiencies. A Human's extra skill avoids the given skills.
function raceEntries(race, subraceChoice, avoidSkills = []) {
    const info = data.races[race] || {};
    const result = [{ label: "Race", value: race }];
    if (info.subraces?.length) {
        result.push({ label: "Subrace", value: subraceChoice ?? pick(info.subraces) });
    }
    const subraceValue = result.find(x => x.label === "Subrace")?.value;
    const subrace = typeof subraceValue === "string" ? subraceValue : "";
    if (race === "Elf" && subrace === "High Elf" ||
        race === "Half-Elf" && subrace === "High Half-Elf") {
        result.push({ label: "High Elf Cantrip", value: pick(data.highElfCantrips) });
    }
    const racialProficiencies = [
        ...(RACIAL_PROFICIENCIES[race]?.["*"] || []),
        ...(RACIAL_PROFICIENCIES[race]?.[subrace] || [])
    ];
    if (racialProficiencies.length) {
        result.push({ label: "Racial Proficiencies", value: racialProficiencies });
    }
    if (race === "Githyanki") {
        const ability = pick(Object.keys(ASTRAL_KNOWLEDGE_SKILLS)) ?? "Strength";
        result.push({
            label: `Astral Knowledge (${ability}, until Long Rest)`,
            value: ASTRAL_KNOWLEDGE_SKILLS[ability]
        });
    }
    if (info.extra) {
        result.push({ label: info.extra.label, value: pick(info.extra.options.filter(option => !avoidSkills.includes(option))) });
    }
    return result;
}
function rollRaceAvoiding(avoidSkills) {
    let race = rollRace();
    if (originProfile())
        return race;
    for (let attempt = 0; attempt < 50 && getRacialSkillProficiencies(race).some(skill => avoidSkills.includes(skill)); attempt++) {
        race = rollRace();
    }
    return race;
}
// Race and subrace names, used for race-locked deities.
function raceNames(race = character.race) {
    return (race || [])
        .filter(entry => entry.label === "Race" || entry.label === "Subrace")
        .flatMap(entryValues);
}
function rollDeity(races) {
    if (races.includes("Lolth-Sworn Drow"))
        return "Lolth";
    const deities = (data.classes.Cleric.options?.["Deity"] || []);
    return pick(deities.filter(deity => !DEITY_RACES[deity] || races.includes(DEITY_RACES[deity])));
}
function rollInvocations(level, knowsEldritchBlast) {
    const entries = [];
    const known = new Set();
    for (const [gainLevel, count] of INVOCATION_GAINS) {
        if (level < gainLevel)
            break;
        const options = INVOCATIONS
            .filter(invocation => invocation.level <= gainLevel && !known.has(invocation.name))
            .filter(invocation => knowsEldritchBlast || !invocation.needsEldritchBlast)
            .map(invocation => invocation.name);
        const picks = pickMany(options, count);
        picks.forEach(name => known.add(name));
        entries.push({ label: `Eldritch Invocations (Level ${gainLevel})`, value: count > 1 ? picks : picks[0] ?? null });
    }
    return entries;
}
// Favored Enemy and Natural Explorer picks for a ranger level, avoiding skills already owned.
function rollRangerChoices(level, ownedSkills) {
    const options = data.classes.Ranger.options || {};
    const picks = 1 + (level >= 6 ? 1 : 0) + (level >= 10 ? 1 : 0);
    const enemies = rollRangerPicks(options["Favored Enemy"], picks, ownedSkills);
    const enemySkills = enemies.map(name => RANGER_PICK_SKILLS[name]).filter(Boolean);
    return { enemies, explorers: rollRangerPicks(options["Natural Explorer"], picks, [...ownedSkills, ...enemySkills]) };
}
function rangerChoiceSkills(choices) {
    return choices ? [...choices.enemies, ...choices.explorers].map(name => RANGER_PICK_SKILLS[name]).filter((skill) => !!skill) : [];
}
function rollClassOptions(className, subclass, level, cantrips, rangerChoices = null) {
    const options = data.classes[className]?.options || {};
    const entries = [];
    if (className === "Barbarian" && subclass === "Wildheart") {
        entries.push({ label: "Bestial Heart", value: pick(options.Wildheart["Bestial Heart"]) });
        const aspectCount = (level >= 6 ? 1 : 0) + (level >= 10 ? 1 : 0);
        if (aspectCount)
            entries.push({ label: "Aspect of the Beast", value: pickMany(options.Wildheart["Aspect of the Beast"], aspectCount) });
    }
    if (className === "Bard") {
        entries.push({ label: "Starting Instrument", value: pick(options["Starting Instrument"]) });
        if (subclass === "College of Swords") {
            entries.push({ label: "Fighting Style", value: pick(options["College of Swords"]["Fighting Style"]) });
        }
        // Magical Secrets: two spells up to level 3 for College of Lore at 6, two up to level 5 for every Bard at 10.
        const loreSecrets = subclass === "College of Lore" && level >= 6 ? pickMany(MAGICAL_SECRETS.slice(0, 4).flat(), 2) : [];
        if (loreSecrets.length)
            entries.push({ label: "Magical Secrets (Level 6)", value: loreSecrets });
        if (level >= 10) {
            entries.push({ label: "Magical Secrets (Level 10)", value: pickMany(MAGICAL_SECRETS.flat().filter(spell => !loreSecrets.includes(spell)), 2) });
        }
    }
    if (className === "Cleric") {
        entries.push({ label: "Deity", value: rollDeity(raceNames()) });
    }
    if (className === "Druid" && subclass === "Circle of the Land") {
        entries.push({ label: "Land", value: pick(options["Circle of the Land"]["Land"]) });
        entries.push({ label: "Bonus Cantrip", value: pick(STARTING_MAGIC.Druid.cantrips.filter(cantrip => !cantrips.includes(cantrip))) });
    }
    if (className === "Cleric" && subclass === "Nature") {
        entries.push({ label: "Druid Cantrip", value: pick(STARTING_MAGIC.Druid.cantrips.filter(cantrip => !cantrips.includes(cantrip))) });
    }
    if (className === "Fighter") {
        const [style, secondStyle] = pickMany(options["Fighting Style"], 2);
        entries.push({ label: "Fighting Style", value: style });
        if (subclass === "Champion" && level >= 10) {
            entries.push({ label: "Additional Fighting Style", value: secondStyle });
        }
        if (subclass === "Battle Master") {
            const maneuvers = level >= 10 ? 7 : level >= 7 ? 5 : 3;
            entries.push({ label: "Maneuvers", value: pickMany(options["Battle Master"]["Maneuvers"], maneuvers) });
        }
        if (subclass === "Arcane Archer") {
            entries.push({ label: "Arcane Archer Cantrip", value: pick(options["Arcane Archer"]["Arcane Archer Cantrip"]) });
            const shots = level >= 10 ? 5 : level >= 7 ? 4 : 3;
            entries.push({ label: "Arcane Shots", value: pickMany(options["Arcane Archer"]["Arcane Shots"], shots) });
        }
    }
    if (className === "Monk" && subclass === "Way of the Four Elements") {
        entries.push({ label: "Elemental Disciplines", value: rollElementalDisciplines(level, options["Way of the Four Elements"]) });
    }
    if (className === "Paladin") {
        entries.push({ label: "What if I break my Oath?", value: pick(options["What if I break my Oath?"]) });
        entries.push({ label: "How devoted to my oath should I be?", value: pick(options["How devoted to my oath should I be?"]) });
        if (level >= 2)
            entries.push({ label: "Fighting Style", value: pick(options["Fighting Style"]) });
    }
    if (className === "Ranger") {
        const choices = rangerChoices ?? rollRangerChoices(level, []);
        entries.push({ label: "Favored Enemy", value: choices.enemies });
        entries.push({ label: "Natural Explorer", value: choices.explorers });
        if (level >= 2)
            entries.push({ label: "Fighting Style", value: pick(options["Fighting Style"]) });
        if (subclass === "Beast Master") {
            entries.push({ label: "Ranger's Companion", value: pick(options["Beast Master"]["Ranger's Companion"]) });
        }
        if (subclass === "Swarmkeeper") {
            entries.push({ label: "Gathered Swarm", value: pick(options.Swarmkeeper["Gathered Swarm"]) });
        }
        if (subclass === "Hunter") {
            entries.push({ label: "Hunter's Prey", value: pick(options.Hunter["Hunter's Prey"]) });
            if (level >= 7)
                entries.push({ label: "Defensive Tactics", value: pick(options.Hunter["Defensive Tactics"]) });
            if (level >= 11)
                entries.push({ label: "Multiattack", value: pick(options.Hunter["Multiattack"]) });
        }
    }
    if (className === "Sorcerer") {
        const metamagic = level >= 10 ? 4 : level >= 3 ? 3 : level >= 2 ? 2 : 0;
        if (metamagic)
            entries.push({ label: "Metamagic", value: pickMany(options["Metamagic"], metamagic) });
        if (subclass === "Draconic Bloodline") {
            entries.push({ label: "Draconic Ancestry", value: pick(options["Draconic Bloodline"]["Draconic Ancestry"]) });
        }
    }
    if (className === "Warlock") {
        if (level >= 3) {
            const pact = pick(options["Pact Boon"]);
            entries.push({ label: "Pact Boon", value: pact });
            if (pact === "Pact of the Blade") {
                const weapons = [...options["Preferred Weapon"], ...(subclass === "Hexblade" ? options["Hexblade Pact Weapons"] : [])];
                entries.push({ label: "Preferred Summoned Weapon", value: pick(weapons) });
            }
            if (pact === "Pact of the Chain")
                entries.push({ label: "Preferred Familiar", value: pick(options["Preferred Familiar"]) });
        }
        entries.push(...rollInvocations(level, cantrips.includes("Eldritch Blast")));
        if (level >= 11)
            entries.push({ label: "Mystic Arcanum", value: pick(options["Mystic Arcanum"]) });
    }
    return entries;
}
function rollSubclassProficiencies(className, subclass, excludedSkills = []) {
    const entries = [];
    const proficiencies = SUBCLASS_PROFICIENCIES[className]?.[subclass ?? ""] || [];
    if (proficiencies.length) {
        entries.push({ label: "Subclass Proficiencies", value: proficiencies });
    }
    const skills = SUBCLASS_SKILLS[className]?.[subclass ?? ""] || [];
    if (skills.length) {
        entries.push({ label: "Subclass Skill Proficiency", value: skills });
    }
    if (className === "Bard" && subclass === "College of Lore") {
        const skills = pickMany((data.classes.Bard.skills).filter(skill => !excludedSkills.includes(skill)), 3);
        if (skills.length)
            entries.push({ label: "College of Lore Skill Proficiencies", value: skills });
    }
    if (className === "Cleric" && subclass === "Knowledge") {
        entries.push({ label: "Knowledge Domain Expertise", value: pickMany(KNOWLEDGE_DOMAIN_SKILLS, 2) });
    }
    if (className === "Cleric" && subclass === "Nature") {
        const availableSkills = NATURE_DOMAIN_SKILLS.filter(skill => !excludedSkills.includes(skill));
        if (availableSkills.length)
            entries.push({ label: "Nature Domain Skill Proficiency", value: pick(availableSkills) });
    }
    return entries;
}
function rollSingleClass(className, level, isMulticlass = false, excludedSkills = [], reservedSkills = [], reservedCount = 0) {
    const cls = data.classes[className];
    const entries = [{ label: "Class", value: className }, { label: "Level", value: String(level) }];
    const rangerChoices = className === "Ranger" ? rollRangerChoices(level, excludedSkills) : null;
    const granted = rangerChoiceSkills(rangerChoices);
    excludedSkills = [...excludedSkills, ...granted];
    let skills = [];
    if (isMulticlass) {
        const skillCount = MULTICLASS_SKILL_COUNTS[className] || 0;
        if (skillCount) {
            skills = randomSkills(className, skillCount, excludedSkills);
            entries.push({ label: "Multiclass Skill Proficiencies", value: skills });
        }
        entries.push({
            label: "Multiclass Proficiencies",
            value: MULTICLASS_PROFICIENCIES[className]?.length
                ? MULTICLASS_PROFICIENCIES[className]
                : ["None"]
        });
    }
    else {
        skills = randomSkills(className, cls.skillCount || 2, excludedSkills, reservedSkills, reservedCount);
        entries.push({ label: "Skill Proficiencies", value: skills });
    }
    const magic = rollStartingMagic(className);
    entries.push(...magic);
    // Skip subclasses whose own skill grant would duplicate one the character already has.
    const ownedSkills = [...excludedSkills, ...skills];
    const subclassOptions = (cls.subclasses || []).filter(name => !(SUBCLASS_SKILLS[className]?.[name] || []).some(skill => ownedSkills.includes(skill)));
    const subclass = level >= (SUBCLASS_LEVELS[className] ?? 3) ? pick(subclassOptions) : null;
    if (subclass)
        entries.push({ label: SUBCLASS_LABELS[className] ?? "Subclass", value: subclass });
    const cantrips = magic.length ? entryValues(magic[0]) : [];
    entries.push(...rollClassOptions(className, subclass, level, cantrips, rangerChoices));
    if (subclass)
        entries.push(...rollSubclassProficiencies(className, subclass, ownedSkills));
    return entries;
}
// One, two or three classes, following the Multiclass setting and how many classes are allowed.
function rollClassCount(available) {
    const chance = settings.multiclass === "always" ? 100
        : settings.multiclass === "never" ? 0
            : Number(data.settings?.multiclassChance ?? 8);
    if (available < 2 || Math.random() * 100 >= chance)
        return 1;
    const triple = settings.tripleClass && available >= 3 &&
        Math.random() * 100 < Number(data.settings?.tripleClassChance ?? 20);
    return triple ? 3 : 2;
}
// Splits the 12 levels. The starting class keeps at least half, and a second class
// gets at least as many levels as a third.
function splitLevels(count) {
    if (count === 1)
        return [MAX_LEVEL];
    if (count === 2) {
        const primary = 6 + Math.floor(Math.random() * 6);
        return [primary, MAX_LEVEL - primary];
    }
    const primary = 6 + Math.floor(Math.random() * 5);
    const rest = MAX_LEVEL - primary;
    const minSecond = Math.ceil(rest / 2);
    const second = minSecond + Math.floor(Math.random() * (rest - minSecond));
    return [primary, second, rest - second];
}
// Preferred weapons for your own character, from the starting class and its fighting style.
// Melee weapons a class is proficient with, plus martial ones for a cleric domain that grants them.
function meleeWeapons(className, subclass) {
    const melee = WEAPON_PREFERENCES[className]?.melee ?? [];
    const martial = SUBCLASS_PROFICIENCIES[className]?.[subclass ?? ""]?.includes("Martial Weapons");
    return className === "Cleric" && martial ? [...melee, ...MARTIAL_CLERIC_WEAPONS] : melee;
}
function rollWeapons(className, classEntries) {
    const weapons = WEAPON_PREFERENCES[className];
    if (!weapons)
        return [];
    const subclass = entryText(classEntries, SUBCLASS_LABELS[className])[0] ?? null;
    const style = entryText(classEntries, "Fighting Style")[0] ?? "";
    let melee = FIGHTING_STYLE_WEAPONS[style] ?? meleeWeapons(className, subclass);
    // College of Swords bards fight with blades they're proficient with.
    if (className === "Bard")
        melee = melee.filter(weapon => BARD_BLADES.includes(weapon));
    if (!melee.length)
        melee = weapons.melee;
    return [
        { label: "Preferred melee weapon", value: pick(melee) },
        { label: "Preferred ranged weapon", value: pick(weapons.ranged) }
    ];
}
// Way of the Four Elements: three disciplines at level 3, then one more at 6, 9 and 11,
// with new ones unlocking at 6 and 11.
function rollElementalDisciplines(level, options) {
    const chosen = pickMany(options["Elemental Disciplines"], 3);
    const more = (pool) => {
        const next = pick(pool.filter(name => !chosen.includes(name)));
        if (next)
            chosen.push(next);
    };
    if (level >= 6)
        more([...options["Elemental Disciplines"], ...options["Level 6 Disciplines"]]);
    if (level >= 9)
        more([...options["Elemental Disciplines"], ...options["Level 6 Disciplines"]]);
    if (level >= 11)
        more([...options["Elemental Disciplines"], ...options["Level 6 Disciplines"], ...options["Level 11 Disciplines"]]);
    return chosen;
}
// Rogue and Bard Expertise: two skills the character is proficient in at each Expertise level,
// never one that already has Expertise. Inserted at the end of that class's entries.
function addExpertise(entries, owned) {
    const taken = new Set(entries.filter(entry => entry.label.includes("Expertise")).flatMap(entryValues));
    const result = [];
    let className = "", level = 0;
    const flush = () => {
        const count = (EXPERTISE_LEVELS[className] || []).filter(at => level >= at).length * 2;
        if (!count)
            return;
        const skills = pickMany([...new Set(owned)].filter(skill => !taken.has(skill)), count);
        skills.forEach(skill => taken.add(skill));
        if (skills.length)
            result.push({ label: "Expertise", value: skills });
    };
    for (const entry of entries) {
        if (entry.label === "Class") {
            flush();
            className = typeof entry.value === "string" ? entry.value : "";
            level = MAX_LEVEL;
        }
        else if (entry.label === "Level") {
            level = Number(entry.value) || MAX_LEVEL;
        }
        result.push(entry);
    }
    flush();
    return result;
}
// After a new race or background with the class kept, Expertise in a skill the character
// no longer has is swapped for one they do.
function repairExpertise(classEntries, owned) {
    const taken = new Set(classEntries.filter(entry => entry.label.includes("Expertise")).flatMap(entryValues).filter(skill => owned.includes(skill)));
    return classEntries.map(entry => {
        if (entry.label !== "Expertise")
            return entry;
        const kept = entryValues(entry).filter(skill => owned.includes(skill));
        const missing = entryValues(entry).length - kept.length;
        if (!missing)
            return entry;
        const extra = pickMany(owned.filter(skill => !taken.has(skill)), missing);
        extra.forEach(skill => taken.add(skill));
        return { ...entry, value: [...kept, ...extra] };
    });
}
// In a multiclass build, two classes can roll the same cantrip. Later copies are swapped for
// another cantrip from the same list, so nothing is learned twice.
function dedupeCantrips(entries) {
    const known = new Set();
    let className = "";
    return entries.map(entry => {
        if (entry.label === "Class" && typeof entry.value === "string")
            className = entry.value;
        const pool = entry.label === "Starting Cantrips" ? STARTING_MAGIC[className]?.cantrips
            : entry.label === "Druid Cantrip" || entry.label === "Bonus Cantrip" ? STARTING_MAGIC.Druid.cantrips
                : entry.label === "Arcane Archer Cantrip" ? data.classes.Fighter.options?.["Arcane Archer"]["Arcane Archer Cantrip"]
                    : null;
        if (!pool)
            return entry;
        const values = entryValues(entry).map(cantrip => {
            if (!known.has(cantrip)) {
                known.add(cantrip);
                return cantrip;
            }
            const swap = pick(pool.filter(option => !known.has(option))) ?? cantrip;
            known.add(swap);
            return swap;
        });
        return { ...entry, value: Array.isArray(entry.value) ? values : values[0] ?? null };
    });
}
function rollClass() {
    const names = allowedClasses();
    const existingSkills = getExistingSkillProficiencies();
    const classNames = pickMany(names, rollClassCount(names.length));
    const levels = splitLevels(classNames.length);
    const [primary, ...others] = classNames;
    if (!others.length) {
        const entries = rollSingleClass(primary, MAX_LEVEL, false, existingSkills);
        return dedupeCantrips(addExpertise([...entries, ...rollWeapons(primary, entries)], [...existingSkills, ...getClassSkillProficiencies(entries)]));
    }
    // The starting class leaves room for the skills the later classes pick.
    const reservedSkills = [...new Set(others.flatMap(name => MULTICLASS_SKILL_COUNTS[name] ? data.classes[name]?.skills || [] : []))].filter(skill => !existingSkills.includes(skill));
    const reservedCount = others.reduce((sum, name) => sum + (MULTICLASS_SKILL_COUNTS[name] || 0), 0);
    const entries = rollSingleClass(primary, levels[0], false, existingSkills, reservedSkills, reservedCount);
    // Weapons follow the starting class and sit with it, before the later classes.
    entries.push(...rollWeapons(primary, entries));
    others.forEach((name, index) => {
        entries.push(...rollSingleClass(name, levels[index + 1], true, [...existingSkills, ...getClassSkillProficiencies(entries)]));
    });
    return dedupeCantrips(addExpertise(entries, [...existingSkills, ...getClassSkillProficiencies(entries)]));
}
// Armor proficiencies from race, starting class, multiclass grants and subclasses.
function getArmorProficiencies() {
    const armor = new Set();
    const classLevels = getClassLevels();
    for (const value of (character.race || []).filter(entry => entry.label === "Racial Proficiencies").flatMap(entryValues))
        armor.add(value);
    (CLASS_ARMOR[classLevels[0]?.className ?? ""] || []).forEach(value => armor.add(value));
    for (const entry of character.class || []) {
        if (entry.label === "Multiclass Proficiencies" || entry.label === "Subclass Proficiencies") {
            entryValues(entry).forEach(value => armor.add(value));
        }
        if (entry.label === "Favored Enemy") {
            entryValues(entry).forEach(value => { if (RANGER_PICK_ARMOR[value])
                armor.add(RANGER_PICK_ARMOR[value]); });
        }
    }
    return armor;
}
function featLevels() {
    const classLevels = getClassLevels();
    return classLevels.flatMap(({ className, level }) => (FEAT_LEVELS[className] ?? DEFAULT_FEAT_LEVELS)
        .filter(featLevel => featLevel <= level)
        .map(featLevel => ({
        label: classLevels.length > 1 ? `${className} level ${featLevel}` : `Level ${featLevel}`,
        className,
        level: featLevel
    })));
}
function featName(value) {
    return value.split(":")[0].trim();
}
// Rolls one feat that the character can take, given the feats already taken.
// What the build can make use of, for leaving out feats that would do nothing.
function featContext(armor) {
    const classLevels = getClassLevels();
    const subclasses = (character.class || []).flatMap(entryValues);
    return {
        shields: armor.has("Shields"),
        spells: classLevels.some(({ className, level }) => level >= (CASTER_CLASSES[className] ?? Infinity)) ||
            CASTER_SUBCLASSES.some(subclass => subclasses.includes(subclass))
    };
}
// The order to level a multiclass build in, as runs of class levels, like Paladin 1–5, Warlock 1–2,
// Paladin 6–8, Warlock 3–4. A single-class build is one run.
function levelUpOrder(classEntries = character.class) {
    const classes = getClassLevels(classEntries);
    const taken = new Map(classes.map(({ className }) => [className, 0]));
    const runs = [];
    const takeUpTo = (className, target) => {
        const from = taken.get(className) + 1;
        if (target < from)
            return;
        taken.set(className, target);
        const last = runs[runs.length - 1];
        if (last?.className === className)
            last.to = target;
        else
            runs.push({ className, from, to: target });
    };
    const [first, ...others] = classes;
    if (!first)
        return runs;
    takeUpTo(first.className, Math.min(first.level, KEY_CLASS_LEVELS[first.className] ?? 5));
    for (const { className, level } of others) {
        takeUpTo(className, Math.min(level, DIP_LEVELS[className] ?? SUBCLASS_LEVELS[className] ?? 3));
    }
    for (const { className, level } of classes)
        takeUpTo(className, level);
    return runs;
}
// One line on why the order starts the way it does, like "Bard to 5 first for 3rd-level spells,
// then Wizard 2 for your subclass."
function levelUpReason(classEntries = character.class) {
    const [first, second] = levelUpOrder(classEntries);
    if (!first || !second)
        return "";
    const firstKey = KEY_CLASS_LEVELS[first.className] ?? 5;
    const start = first.to >= firstKey
        ? `${first.className} to ${first.to} first for ${KEY_LEVEL_REASONS[first.className] ?? "its key features"}`
        : `All ${first.to} ${first.className} levels first`;
    const dip = DIP_LEVELS[second.className] ?? SUBCLASS_LEVELS[second.className] ?? 3;
    const range = second.from === second.to ? `${second.to}` : `${second.from}–${second.to}`;
    const then = second.to >= dip
        ? `${second.className} ${range} for ${DIP_REASONS[second.className] ?? "your subclass"}`
        : `${second.className} ${range}`;
    return `${start}, then ${then}.`;
}
function levelUpOrderText(classEntries = character.class) {
    return levelUpOrder(classEntries)
        .map(({ className, from, to }) => `${className} ${from === to ? from : `${from}–${to}`}`)
        .join(" → ");
}
// The character's ability scores from the Ability Scores card, racial bonuses included.
// A build from before that card existed counts every score as 10.
function startingScores() {
    return Object.fromEntries(ABILITIES.map(ability => [ability, Number((character.abilities || []).find(entry => entry.label === ability)?.value) || 10]));
}
// The increases a feat gives: "Ability Improvement: +2 Dexterity", "Ability Improvement: +1 Strength,
// +1 Constitution" or "Resilient: Wisdom". Other feats raise nothing the generator tracks.
function featIncreases(feat) {
    const increases = {};
    const [name, choice = ""] = feat.split(":").map(part => part.trim());
    if (name === "Ability Improvement") {
        for (const [, amount, ability] of choice.matchAll(/\+(\d) (\w+)/g))
            increases[ability] = (increases[ability] ?? 0) + Number(amount);
    }
    else if (name === "Resilient" && choice) {
        increases[choice] = 1;
    }
    return increases;
}
// Whether a feat fits under the cap of 20, and if so, adds its increases to the scores.
function applyFeat(scores, feat) {
    const increases = Object.entries(featIncreases(feat));
    if (increases.some(([ability, amount]) => !(ability in scores) || scores[ability] + amount > MAX_ABILITY_SCORE))
        return false;
    increases.forEach(([ability, amount]) => { scores[ability] += amount; });
    return true;
}
// +2 to one ability or +1 to two, never past 20. The starting class's main abilities come first,
// then any other score with room.
function rollAbilityImprovement(scores) {
    const room = (ability) => MAX_ABILITY_SCORE - scores[ability];
    const main = CLASS_MAIN_ABILITIES[getClassLevels()[0]?.className ?? ""] ?? ["Constitution"];
    const choices = [
        ...pickMany(main.filter(ability => room(ability) > 0), main.length),
        ...pickMany(ABILITIES.filter(ability => !main.includes(ability) && room(ability) > 0), ABILITIES.length)
    ];
    const [first, second] = choices;
    const feat = !first ? "Ability Improvement"
        : second && (room(first) < 2 || Math.random() < 0.4) ? `Ability Improvement: +1 ${first}, +1 ${second}`
            : room(first) >= 2 ? `Ability Improvement: +2 ${first}`
                : `Ability Improvement: +1 ${first}`;
    applyFeat(scores, feat);
    return feat;
}
function rollFeat(taken, armor, scores) {
    if (Math.random() * 100 < ABILITY_IMPROVEMENT_CHANCE)
        return rollAbilityImprovement(scores);
    const takenNames = new Set(taken.map(featName));
    const can = featContext(armor);
    const hasWeaponStyle = WEAPON_STYLE_FEATS.some(feat => takenNames.has(feat));
    const options = data.feats.filter(feat => {
        if (feat === "Ability Improvement" || takenNames.has(feat))
            return false;
        const rule = FEAT_ARMOR_RULES[feat];
        if (rule?.requires && !armor.has(rule.requires))
            return false;
        if (rule?.grants && armor.has(rule.grants))
            return false;
        if (feat === "Shield Master" && !can.shields)
            return false;
        if (WEAPON_STYLE_FEATS.includes(feat) && hasWeaponStyle)
            return false;
        if (SPELL_FEATS.includes(feat) && !can.spells)
            return false;
        return true;
    });
    const feat = pick(options);
    if (!feat)
        return rollAbilityImprovement(scores);
    const grants = FEAT_ARMOR_RULES[feat]?.grants;
    if (grants)
        armor.add(grants);
    // Resilient raises the chosen ability by 1, so it skips one that's already 20.
    const choices = feat === "Resilient" ? (FEAT_CHOICES[feat] ?? []).filter(ability => scores[ability] < MAX_ABILITY_SCORE) : FEAT_CHOICES[feat];
    const choice = pick(choices);
    const value = choice ? `${feat}: ${choice}` : feat;
    applyFeat(scores, value);
    return value;
}
// Keeps the given feats (in order) and fills any remaining feat levels with new ones. A kept
// Ability Improvement or Resilient that would now push a score past 20, say after new ability
// scores, is rolled again so it fits, and so is an armor feat that no longer fits the armor.
function rollFeats(keep = []) {
    const armor = getArmorProficiencies();
    const scores = startingScores();
    const taken = [];
    return featLevels().map((slot, index) => {
        const kept = index < keep.length && fitsArmor(keep[index], armor) ? keep[index] : null;
        // A new feat in the middle of the list steers clear of the kept feats after it, too.
        const feat = kept === null ? rollFeat([...taken, ...keep.slice(index + 1)], armor, scores)
            : applyFeat(scores, kept) ? kept
                : featName(kept) === "Resilient" ? fitResilient(scores)
                    : rollAbilityImprovement(scores);
        if (feat) {
            taken.push(feat);
            const grants = FEAT_ARMOR_RULES[featName(feat)]?.grants;
            if (grants)
                armor.add(grants);
        }
        return { label: slot.label, value: feat };
    });
}
// Whether a kept armor feat still makes sense, say after a new race: it needs the armor it builds
// on and mustn't grant armor the character already has.
function fitsArmor(feat, armor) {
    const rule = FEAT_ARMOR_RULES[featName(feat)];
    return !(rule?.requires && !armor.has(rule.requires)) && !(rule?.grants && armor.has(rule.grants));
}
// After a new race with the class kept, a race-locked deity follows the race: Lolth-Sworn Drow
// always follow Lolth, and a deity only another race may follow is picked again.
function repairDeity(classEntries, races) {
    return classEntries.map(entry => {
        if (entry.label !== "Deity" || typeof entry.value !== "string")
            return entry;
        const lockedRace = DEITY_RACES[entry.value];
        const fits = races.includes("Lolth-Sworn Drow") ? entry.value === "Lolth" : !lockedRace || races.includes(lockedRace);
        return fits ? entry : { ...entry, value: rollDeity(races) };
    });
}
// A Resilient pick on an ability with room, for a kept Resilient whose ability is now at 20.
function fitResilient(scores) {
    const choice = pick((FEAT_CHOICES.Resilient ?? []).filter(ability => scores[ability] < MAX_ABILITY_SCORE));
    const feat = choice ? `Resilient: ${choice}` : "Resilient";
    applyFeat(scores, feat);
    return feat;
}
// Feat names from either the current format or an older saved list of names.
function featValues(feats = character.feats) {
    return (feats || []).flatMap(feat => typeof feat === "string" ? [feat] : entryValues(feat));
}
// A background's entries, with an alignment to play it with.
function backgroundEntries(background) {
    return [
        { label: "Background", value: background },
        { label: "Background Skill Proficiencies", value: BACKGROUND_SKILLS[background] || [] },
        { label: "Alignment", value: pick(ALIGNMENTS) }
    ];
}
function rollBackground(avoidSkills = []) {
    const fixed = originProfile()?.background ?? (character.origin === DARK_URGE_ORIGIN ? DARK_URGE_BACKGROUND : null);
    if (fixed)
        return backgroundEntries(fixed);
    const takenSkills = new Set([...getRacialSkillProficiencies(), ...avoidSkills]);
    const availableBackgrounds = data.backgrounds.filter(background => (BACKGROUND_SKILLS[background] || []).every(skill => !takenSkills.has(skill)));
    const background = pick(availableBackgrounds.length ? availableBackgrounds : data.backgrounds) ?? data.backgrounds[0];
    return backgroundEntries(background);
}
// You can't romance yourself, so an origin character drops out of the romance options.
function rollRomance() {
    return pick(data.romances.filter(name => name !== character.origin));
}
function primaryClassAndSubclass(classEntries = character.class) {
    const className = getClassLevels(classEntries)[0]?.className ?? "Fighter";
    return { className, subclass: entryText(classEntries, SUBCLASS_LABELS[className] ?? "Subclass")[0] ?? null };
}
// Starting ability scores for the starting class: a 27-point buy plus the racial +2 and +1.
function rollAbilities() {
    const { className, subclass } = primaryClassAndSubclass();
    const priority = [...(CLASS_ABILITY_PRIORITY[className] ?? ABILITIES)];
    const swap = (a, b) => {
        const i = priority.indexOf(a), j = priority.indexOf(b);
        [priority[i], priority[j]] = [priority[j], priority[i]];
    };
    if (className === "Cleric" && HEAVY_ARMOR_DOMAINS.includes(subclass ?? ""))
        swap("Dexterity", "Strength");
    // Half of fighters are archers or finesse fighters.
    if (className === "Fighter" && Math.random() < 0.5)
        swap("Strength", "Dexterity");
    if (INTELLIGENCE_SUBCLASSES.includes(subclass ?? "")) {
        priority.splice(priority.indexOf("Intelligence"), 1);
        priority.splice(2, 0, "Intelligence");
    }
    const spread = pick(POINT_BUY_SPREADS) ?? POINT_BUY_SPREADS[0];
    const scores = {};
    priority.forEach((ability, index) => { scores[ability] = spread[index]; });
    scores[priority[0]] += 2;
    scores[priority[1]] += 1;
    return [
        ...ABILITIES.map(ability => ({ label: ability, value: String(scores[ability]) })),
        { label: "Racial bonuses", value: `+2 ${priority[0]}, +1 ${priority[1]}` }
    ];
}
// Three companions for the party: the romance (if any) plus others who can travel with them,
// never the origin character you're playing.
function rollParty(romance = character.romance) {
    const members = romance && COMPANION_DEFAULT_CLASSES[romance] && romance !== character.origin ? [romance] : [];
    const pool = Object.keys(COMPANION_DEFAULT_CLASSES).filter(name => name !== character.origin && !members.includes(name));
    while (members.length < PARTY_SIZE && pool.length) {
        members.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return members.flatMap(name => rollCompanionBuild(name));
}
function rollCompanionBuild(romance = character.romance) {
    const isHireling = (romance ?? "").trim().toLowerCase() === "no one";
    const partyMember = isHireling
        ? pick(BASE_HIRELINGS) ?? BASE_HIRELINGS[0]
        : {
            name: romance ?? "Unknown companion",
            defaultClass: COMPANION_DEFAULT_CLASSES[romance ?? ""] ?? "Fighter",
            race: COMPANION_RACES[romance ?? ""] ?? ""
        };
    const usesDefaultClass = isHireling || Math.random() < 0.5;
    const classNames = Object.keys(data.classes);
    const randomClassOptions = classNames.filter(className => className !== partyMember.defaultClass);
    const className = usesDefaultClass
        ? partyMember.defaultClass
        : pick(randomClassOptions) ?? partyMember.defaultClass;
    const subclass = pick(data.classes[className].subclasses);
    const weapons = WEAPON_PREFERENCES[className];
    const entries = [
        { label: isHireling ? "Hireling" : "Companion", value: partyMember.name },
        ...(!isHireling ? [{ label: "Class choice", value: usesDefaultClass ? "Default class" : "Random class" }] : []),
        { label: "Class", value: className },
        { label: "Subclass", value: subclass }
    ];
    entries.push(...rollStartingMagic(className));
    if (className === "Cleric") {
        // Shadowheart's faith is fixed by her story; other clerics follow a deity their race allows.
        const deity = partyMember.name === "Shadowheart"
            ? "Shar or Selûne (set by her story)"
            : rollDeity([partyMember.race, ...partyMember.race.split(" ")]);
        entries.push({ label: "Deity", value: deity });
    }
    entries.push({ label: "Preferred melee weapon", value: pick(meleeWeapons(className, subclass)) });
    entries.push({ label: "Preferred ranged weapon", value: pick(weapons.ranged) });
    return entries;
}
