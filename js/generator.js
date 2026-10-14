"use strict";
let data = structuredClone(DEFAULT_DATA);
let character = {};
const MAX_LEVEL = 12;
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
function getBackgroundSkillProficiencies(background = character.background) {
    if (typeof background === "string")
        return BACKGROUND_SKILLS[background] || [];
    if (!Array.isArray(background))
        return [];
    const skillEntry = background.find(entry => entry.label === "Background Skill Proficiencies");
    if (Array.isArray(skillEntry?.value))
        return skillEntry.value.filter((skill) => typeof skill === "string");
    const backgroundName = background.find(entry => entry.label === "Background")?.value;
    return typeof backgroundName === "string" ? BACKGROUND_SKILLS[backgroundName] || [] : [];
}
const CLASS_SKILL_LABELS = ["Skill Proficiencies", "Multiclass Skill Proficiencies", "Nature Domain Skill Proficiency", "Subclass Skill Proficiency"];
function getClassSkillProficiencies(classEntries = character.class) {
    return (classEntries || [])
        .filter(entry => CLASS_SKILL_LABELS.includes(entry.label))
        .flatMap(entryValues);
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
function rollRace() {
    const race = pick(Object.keys(data.races)) ?? "Human";
    const info = data.races[race] || {};
    const result = [{ label: "Race", value: race }];
    if (info.subraces?.length) {
        result.push({ label: "Subrace", value: pick(info.subraces) });
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
        result.push({ label: info.extra.label, value: pick(info.extra.options) });
    }
    return result;
}
function rollRaceAvoiding(avoidSkills) {
    let race = rollRace();
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
function rollClassOptions(className, subclass, level, cantrips) {
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
    }
    if (className === "Cleric") {
        entries.push({ label: "Deity", value: rollDeity(raceNames()) });
    }
    if (className === "Druid" && subclass === "Circle of the Land") {
        entries.push({ label: "Land", value: pick(options["Circle of the Land"]["Land"]) });
    }
    if (className === "Fighter") {
        const [style, secondStyle] = pickMany(options["Fighting Style"], 2);
        entries.push({ label: "Fighting Style", value: style });
        if (subclass === "Champion" && level >= 10) {
            entries.push({ label: "Additional Fighting Style", value: secondStyle });
        }
        if (subclass === "Battle Master") {
            const manoeuvres = level >= 10 ? 7 : level >= 7 ? 5 : 3;
            entries.push({ label: "Manoeuvres", value: pickMany(options["Battle Master"]["Manoeuvres"], manoeuvres) });
        }
    }
    if (className === "Paladin") {
        entries.push({ label: "What if I break my Oath?", value: pick(options["What if I break my Oath?"]) });
        entries.push({ label: "How devoted to my oath should I be?", value: pick(options["How devoted to my oath should I be?"]) });
        if (level >= 2)
            entries.push({ label: "Fighting Style", value: pick(options["Fighting Style"]) });
    }
    if (className === "Ranger") {
        const picks = 1 + (level >= 6 ? 1 : 0) + (level >= 10 ? 1 : 0);
        entries.push({ label: "Favoured Enemy", value: pickMany(options["Favoured Enemy"], picks) });
        entries.push({ label: "Natural Explorer", value: pickMany(options["Natural Explorer"], picks) });
        if (level >= 2)
            entries.push({ label: "Fighting Style", value: pick(options["Fighting Style"]) });
        if (subclass === "Beast Master") {
            entries.push({ label: "Ranger's Companion", value: pick(options["Beast Master"]["Ranger's Companion"]) });
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
            if (pact === "Pact of the Blade")
                entries.push({ label: "Preferred Weapon", value: pick(options["Preferred Weapon"]) });
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
    entries.push(...rollClassOptions(className, subclass, level, cantrips));
    if (subclass)
        entries.push(...rollSubclassProficiencies(className, subclass, excludedSkills));
    return entries;
}
function rollClass() {
    const names = Object.keys(data.classes);
    const primary = pick(names) ?? names[0];
    const existingSkills = getExistingSkillProficiencies();
    const multi = Math.random() * 100 < Number(data.settings?.multiclassChance ?? 8);
    if (!multi)
        return rollSingleClass(primary, MAX_LEVEL, false, existingSkills);
    // The starting class keeps at least half of the 12 levels.
    const primaryLevel = 6 + Math.floor(Math.random() * 6);
    const secondary = pick(names.filter(n => n !== primary)) ?? primary;
    const secondarySkillCount = MULTICLASS_SKILL_COUNTS[secondary] || 0;
    const secondarySkills = secondarySkillCount
        ? (data.classes[secondary]?.skills || []).filter(skill => !existingSkills.includes(skill))
        : [];
    const first = rollSingleClass(primary, primaryLevel, false, existingSkills, secondarySkills, secondarySkillCount);
    const second = rollSingleClass(secondary, MAX_LEVEL - primaryLevel, true, [...existingSkills, ...getClassSkillProficiencies(first)]);
    return [...first, ...second];
}
// Armour proficiencies from race, starting class, multiclass grants and subclasses.
function getArmourProficiencies() {
    const armour = new Set();
    const classLevels = getClassLevels();
    for (const value of (character.race || []).filter(entry => entry.label === "Racial Proficiencies").flatMap(entryValues))
        armour.add(value);
    (CLASS_ARMOUR[classLevels[0]?.className ?? ""] || []).forEach(value => armour.add(value));
    for (const entry of character.class || []) {
        if (entry.label === "Multiclass Proficiencies" || entry.label === "Subclass Proficiencies") {
            entryValues(entry).forEach(value => armour.add(value));
        }
    }
    return armour;
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
function rollFeat(taken, armour) {
    const takenNames = new Set(taken.map(featName));
    const options = data.feats.filter(feat => {
        if (feat !== "Ability Improvement" && takenNames.has(feat))
            return false;
        const rule = FEAT_ARMOUR_RULES[feat];
        if (rule?.requires && !armour.has(rule.requires))
            return false;
        if (rule?.grants && armour.has(rule.grants))
            return false;
        return true;
    });
    const feat = pick(options);
    if (!feat)
        return null;
    const grants = FEAT_ARMOUR_RULES[feat]?.grants;
    if (grants)
        armour.add(grants);
    const choice = pick(FEAT_CHOICES[feat]);
    return choice ? `${feat}: ${choice}` : feat;
}
// Keeps the given feats (in order) and fills any remaining feat levels with new ones.
function rollFeats(keep = []) {
    const armour = getArmourProficiencies();
    const taken = [];
    return featLevels().map((slot, index) => {
        const feat = index < keep.length ? keep[index] : rollFeat(taken, armour);
        if (feat) {
            taken.push(feat);
            const grants = FEAT_ARMOUR_RULES[featName(feat)]?.grants;
            if (grants)
                armour.add(grants);
        }
        return { label: slot.label, value: feat };
    });
}
// Feat names from either the current format or an older saved list of names.
function featValues(feats = character.feats) {
    return (feats || []).flatMap(feat => typeof feat === "string" ? [feat] : entryValues(feat));
}
function rollBackground(avoidSkills = []) {
    const takenSkills = new Set([...getRacialSkillProficiencies(), ...avoidSkills]);
    const availableBackgrounds = data.backgrounds.filter(background => (BACKGROUND_SKILLS[background] || []).every(skill => !takenSkills.has(skill)));
    const background = pick(availableBackgrounds.length ? availableBackgrounds : data.backgrounds) ?? data.backgrounds[0];
    return [
        { label: "Background", value: background },
        { label: "Background Skill Proficiencies", value: BACKGROUND_SKILLS[background] || [] }
    ];
}
function rollRomance() { return pick(data.romances); }
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
        { label: "Companion or hireling", value: partyMember.name },
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
    entries.push({ label: "Preferred melee weapon", value: pick(weapons.melee) });
    entries.push({ label: "Preferred ranged weapon", value: pick(weapons.ranged) });
    return entries;
}
