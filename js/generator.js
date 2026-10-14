"use strict";
let data = structuredClone(DEFAULT_DATA);
let character = {};
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
function pickMany(list, count, allowDuplicates = false) {
    if (!Array.isArray(list) || !list.length)
        return [];
    if (allowDuplicates)
        return Array.from({ length: count }, () => pick(list));
    const pool = [...list];
    const result = [];
    while (pool.length && result.length < count) {
        result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return result;
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
        const values = Array.isArray(entry.value) ? entry.value : [entry.value];
        return values.filter((skill) => typeof skill === "string" && skillNames.has(skill));
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
function getClassSkillProficiencies(classEntries = character.class) {
    const skillLabels = ["Skill Proficiencies", "Multiclass Skill Proficiencies", "Nature Domain Skill Proficiency"];
    return (classEntries || [])
        .filter(entry => skillLabels.includes(entry.label))
        .flatMap(entry => Array.isArray(entry.value) ? entry.value : typeof entry.value === "string" ? [entry.value] : []);
}
function getExistingSkillProficiencies() {
    return [...new Set([...getRacialSkillProficiencies(), ...getBackgroundSkillProficiencies()])];
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
function addOptionEntries(entries, options) {
    if (!options)
        return;
    for (const [label, values] of Object.entries(options)) {
        if (Array.isArray(values)) {
            entries.push({ label, value: pick(values) });
        }
    }
}
function rollClassOptions(className, subclass) {
    const cls = data.classes[className];
    const entries = [];
    const options = cls?.options || {};
    if (className === "Warlock") {
        const patron = pick(options["Warlock Patron"] || []);
        const pact = pick(options["Pact Boon"] || []);
        entries.push({ label: "Mystic Arcanum", value: pick(options["Mystic Arcanum"] || []) });
        entries.push({ label: "Eldritch Invocations (Level 12)", value: pick(options["Eldritch Invocations (Level 12)"] || []) });
        entries.push({ label: "Eldritch Invocations (Level 9)", value: pick(options["Eldritch Invocations (Level 9)"] || []) });
        entries.push({ label: "Eldritch Invocations (Level 7)", value: pick(options["Eldritch Invocations (Level 7)"] || []) });
        entries.push({ label: "Eldritch Invocations (Level 5)", value: pick(options["Eldritch Invocations (Level 5)"] || []) });
        entries.push({ label: "Eldritch Invocations (Level 2)", value: pickMany(options["Eldritch Invocations (Level 2)"] || [], 2) });
        entries.push({ label: "Pact Boon", value: pact });
        if (pact === "Pact Of The Blade") {
            entries.push({ label: "Preferred Weapon", value: pick(options["Preferred Weapon"] || []) });
        }
        if (pact === "Pact Of The Chain") {
            entries.push({ label: "Preferred Familiar", value: pick(options["Preferred Familiar"] || []) });
        }
        entries.push({ label: "Warlock Patron", value: patron });
        return entries;
    }
    if (className === "Bard") {
        entries.push({ label: "Starting Instrument", value: pick(options["Starting Instrument"] || []) });
        if (subclass === "College of Swords") {
            entries.push({ label: "Fighting Style", value: pick(options["College of Swords"]["Fighting Style"]) });
        }
        return entries;
    }
    if (className === "Cleric") {
        entries.push({ label: "Deity", value: pick(options["Deity"] || []) });
        return entries;
    }
    if (className === "Druid") {
        if (subclass === "Circle of the Land") {
            entries.push({ label: "Land", value: pick(options["Circle of the Land"]["Land"]) });
        }
        return entries;
    }
    if (className === "Fighter") {
        entries.push({ label: "Fighting Style", value: pick(options["Fighting Style"] || []) });
        if (subclass === "Champion") {
            entries.push({ label: "Second Fighting Style", value: pick(options.Champion["Second Fighting Style"]) });
        }
        if (subclass === "Battle Master") {
            entries.push({ label: "Manoeuvres", value: pickMany(options["Battle Master"]["Manoeuvres"], 7) });
        }
        return entries;
    }
    if (className === "Paladin") {
        addOptionEntries(entries, {
            "What if I break my Oath?": options["What if I break my Oath?"],
            "How devoted to my oath should I be?": options["How devoted to my oath should I be?"],
            "Fighting Style": options["Fighting Style"]
        });
        return entries;
    }
    if (className === "Ranger") {
        entries.push({ label: "Natural Explorer", value: pickMany(options["Natural Explorer"], 3) });
        entries.push({ label: "Favoured Enemy", value: pickMany(options["Favoured Enemy"], 3) });
        entries.push({ label: "Fighting Style", value: pick(options["Fighting Style"]) });
        entries.push({ label: "Wisdom", value: pick(options["Wisdom"]) });
        if (subclass === "Beast Master") {
            entries.push({ label: "Preferred Companion", value: pick(options["Beast Master"]["Preferred Companion"]) });
        }
        if (subclass === "Hunter") {
            entries.push({ label: "Defensive Tactics", value: pick(options.Hunter["Defensive Tactics"]) });
            entries.push({ label: "Hunter's Prey", value: pick(options.Hunter["Hunter's Prey"]) });
        }
        return entries;
    }
    if (className === "Sorcerer") {
        entries.push({ label: "Metamagic", value: pickMany(options["Metamagic"], 4) });
        if (subclass === "Draconic Bloodline") {
            entries.push({ label: "Draconic Ancestry", value: pick(options["Draconic Bloodline"]["Draconic Ancestry"]) });
        }
        return entries;
    }
    if (className === "Barbarian" && subclass === "Wildheart") {
        entries.push({ label: "Animal Aspects", value: pickMany(options.Wildheart["Animal Aspects"], 2) });
        entries.push({ label: "Bestial Heart", value: pick(options.Wildheart["Bestial Heart"]) });
        return entries;
    }
    return entries;
}
function rollSubclassProficiencies(className, subclass, excludedSkills = []) {
    const entries = [];
    const proficiencies = SUBCLASS_PROFICIENCIES[className]?.[subclass ?? ""] || [];
    if (proficiencies.length) {
        entries.push({ label: "Subclass Proficiencies", value: proficiencies });
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
function rollSingleClass(className, isMulticlass = false, excludedSkills = [], reservedSkills = [], reservedCount = 0) {
    const cls = data.classes[className];
    const subclass = pick(cls.subclasses || []);
    const entries = [{ label: "Class", value: className }];
    if (isMulticlass) {
        const skillCount = MULTICLASS_SKILL_COUNTS[className] || 0;
        if (skillCount) {
            entries.push({ label: "Multiclass Skill Proficiencies", value: randomSkills(className, skillCount, excludedSkills) });
        }
        entries.push({
            label: "Multiclass Proficiencies",
            value: MULTICLASS_PROFICIENCIES[className]?.length
                ? MULTICLASS_PROFICIENCIES[className]
                : ["None"]
        });
    }
    else {
        entries.push({ label: "Skill Proficiencies", value: randomSkills(className, cls.skillCount || 2, excludedSkills, reservedSkills, reservedCount) });
    }
    entries.push(...rollStartingMagic(className));
    entries.push({ label: className === "Wizard" ? "Wizard School" :
            className === "Monk" ? "Monastic Tradition" :
                className === "Sorcerer" ? "Sorcerer Subclass" :
                    className === "Bard" ? "Bard College" :
                        className === "Cleric" ? "Cleric Domain" :
                            className === "Barbarian" ? "Barbarian Subclass" :
                                className === "Ranger" ? "Ranger Subclass" :
                                    className === "Fighter" ? "Fighter Subclass" :
                                        className === "Rogue" ? "Rogue Subclass" :
                                            className === "Paladin" ? "Paladin Oath" :
                                                className === "Warlock" ? "Warlock Patron" : "Subclass", value: subclass });
    const extra = rollClassOptions(className, subclass);
    for (const entry of extra) {
        if (entry.label === "Warlock Patron")
            continue;
        entries.push(entry);
    }
    entries.push(...rollSubclassProficiencies(className, subclass, excludedSkills));
    return entries;
}
function rollClass() {
    const names = Object.keys(data.classes);
    const primary = pick(names) ?? names[0];
    const entries = [];
    const existingSkills = getExistingSkillProficiencies();
    const multi = Math.random() * 100 < Number(data.settings?.multiclassChance ?? 8);
    if (multi) {
        const remaining = names.filter(n => n !== primary);
        const secondary = pick(remaining) ?? primary;
        const secondarySkillCount = MULTICLASS_SKILL_COUNTS[secondary] || 0;
        const secondarySkills = secondarySkillCount
            ? (data.classes[secondary]?.skills || []).filter(skill => !existingSkills.includes(skill))
            : [];
        const first = rollSingleClass(primary, false, existingSkills, secondarySkills, secondarySkillCount);
        const firstSkills = first
            .filter(entry => entry.label === "Skill Proficiencies" || entry.label === "Nature Domain Skill Proficiency")
            .flatMap(entry => Array.isArray(entry.value) ? entry.value : typeof entry.value === "string" ? [entry.value] : []);
        const second = rollSingleClass(secondary, true, [...existingSkills, ...firstSkills]);
        entries.push(...first, ...second);
    }
    else {
        entries.push(...rollSingleClass(primary, false, existingSkills));
    }
    return entries;
}
function rollFeats() {
    return pickMany(data.feats, Number(data.settings?.featCount ?? 4), true);
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
            defaultClass: COMPANION_DEFAULT_CLASSES[romance ?? ""] ?? "Fighter"
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
        const deities = data.classes.Cleric.options?.["Deity"];
        if (Array.isArray(deities))
            entries.push({ label: "Deity", value: pick(deities) });
    }
    entries.push({ label: "Preferred melee weapon", value: pick(weapons.melee) });
    entries.push({ label: "Preferred ranged weapon", value: pick(weapons.ranged) });
    return entries;
}
