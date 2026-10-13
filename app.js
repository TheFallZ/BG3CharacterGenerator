"use strict";
const DEFAULT_DATA = {
    darkUrge: [
        "Nope",
        "What sort of monster would do that?",
        "No",
        "I think you already know the answer to that one",
        "Why would you want to do that?",
        "Yes, but only if you are a monster",
        "Yes yes yes YES YES",
        "What do you think?",
        "Of course not",
        "Yes",
        "Naturally",
        "Yes, do it"
    ],
    races: {
        "Dragonborn": {
            subraces: ["Black Dragonborn", "Blue Dragonborn", "Brass Dragonborn", "Bronze Dragonborn", "Copper Dragonborn", "Gold Dragonborn", "Green Dragonborn", "Red Dragonborn", "Silver Dragonborn", "White Dragonborn"]
        },
        "Dwarf": {
            subraces: ["Duergar", "Gold Dwarf", "Shield Dwarf"]
        },
        "Elf": {
            subraces: ["High Elf", "Wood Elf"]
        },
        "Gnome": {
            subraces: ["Deep Gnome", "Forest Gnome", "Rock Gnome"]
        },
        "Half-Elf": {
            subraces: ["Drow Half-Elf", "High Half-Elf", "Wood Half-Elf"]
        },
        "Halfling": {
            subraces: ["Lightfoot Halfling", "Strongheart Halfling"]
        },
        "Half-Orc": {},
        "Human": {
            extra: {
                label: "Additional Skill Proficiency",
                options: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"]
            }
        },
        "Githyanki": {},
        "Tiefling": {
            subraces: ["Asmodeus Tiefling", "Mephistopheles Tiefling", "Zariel Tiefling"]
        },
        "Drow": {
            subraces: ["Lolth-Sworn Drow", "Seldarine Drow"]
        }
    },
    highElfCantrips: [
        "Acid Splash", "Blade Ward", "Bone Chill", "Dancing Lights", "Fire Bolt",
        "Friends", "Light", "Mage Hand", "Minor Illusion", "Poison Spray",
        "Ray of Frost", "Shocking Grasp", "True Strike"
    ],
    classes: {
        "Barbarian": {
            skills: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
            skillCount: 2,
            subclasses: ["Berserker", "Wildheart", "Wild Magic", "Path of the Giant"],
            options: {
                "Wildheart": {
                    "Animal Aspects": ["Badger", "Bear", "Chimpanzee", "Crocodile", "Eagle", "Elk", "Honey", "Stallion", "Tiger", "Wolf", "Wolverine"],
                    "Bestial Heart": ["Bear", "Eagle", "Elk", "Tiger", "Wolf"]
                }
            }
        },
        "Bard": {
            skills: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
            skillCount: 3,
            subclasses: ["College of Lore", "College of Valour", "College of Swords", "College of Glamour"],
            options: {
                "Starting Instrument": ["Flute", "Hand Drum", "Lute", "Lyre", "Violin"],
                "College of Swords": {
                    "Fighting Style": ["Dueling", "Two-Weapon Fighting"]
                }
            }
        },
        "Cleric": {
            skills: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
            skillCount: 2,
            subclasses: ["Knowledge", "Life", "Light", "Nature", "Tempest", "Trickery", "War", "Death Domain"],
            options: {
                "Deity": ["Bahamut", "Corellon Larethian", "Eilistraee", "Garl Glittergold", "Gruumsh", "Helm", "Ilmater", "Kelemvor", "Lathander", "Lolth", "Mielikki", "Moradin", "Mystra", "Oghma", "Selûne", "Talos", "Tempus", "Tiamat", "Tymora", "Tyr", "Yondalla"]
            }
        },
        "Druid": {
            skills: ["Animal Handling", "Arcana", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
            skillCount: 2,
            subclasses: ["Circle of the Land", "Circle of the Moon", "Circle of Spores", "Circle of the Stars"],
            options: {
                "Circle of the Land": {
                    "Land": ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"]
                }
            }
        },
        "Fighter": {
            skills: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
            skillCount: 2,
            subclasses: ["Battle Master", "Champion", "Eldritch Knight", "Arcane Archer"],
            options: {
                "Fighting Style": ["Archery", "Defence", "Duelling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"],
                "Champion": {
                    "Second Fighting Style": ["Archery", "Defence", "Duelling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"]
                },
                "Battle Master": {
                    "Manoeuvres": ["Commander's Strike", "Disarming Attack", "Distracting Strike", "Evasive Footwork", "Feinting Attack", "Goading Attack", "Menacing Attack", "Manoeuvring Attack", "Pushing Attack", "Precision Attack", "Rally", "Riposte", "Sweeping Attack", "Trip Attack"]
                }
            }
        },
        "Monk": {
            skills: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
            skillCount: 2,
            subclasses: ["Way of the Four Elements", "Way of Shadow", "Way of the Open Hand", "Way of the Drunken Master"]
        },
        "Paladin": {
            skills: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
            skillCount: 2,
            subclasses: ["Oath of the Ancients", "Oath of Devotion", "Oath of Vengeance", "Oath of the Crown"],
            options: {
                "What if I break my Oath?": ["Embrace your new path", "Redeem yourself"],
                "How devoted to my oath should I be?": [
                    "You will break it at the first chance you get",
                    "You feel temptation to break your oath, but you try to resist it",
                    "You are devoted to your oath, but you are not a zealot",
                    "You are absolutely devoted to your oath"
                ],
                "Fighting Style": ["Defence", "Duelling", "Great Weapon Fighting", "Protection"]
            }
        },
        "Ranger": {
            skills: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
            skillCount: 3,
            subclasses: ["Beast Master", "Gloom Stalker", "Hunter", "Swarmkeeper"],
            options: {
                "Natural Explorer": [
                    "Wasteland Wanderer: Cold", "Wasteland Wanderer: Fire", "Wasteland Wanderer: Poison",
                    "Urban Tracker", "Beast Tamer"
                ],
                "Favoured Enemy": ["Bounty Hunter", "Keeper of the Veil", "Mage Breaker", "Ranger Knight", "Sanctified Stalker"],
                "Fighting Style": ["Archery", "Defence", "Duelling", "Two-Weapon Fighting"],
                "Wisdom": ["Wisdom"],
                "Beast Master": {
                    "Preferred Companion": ["Bear", "Boar", "Giant Spider", "Raven", "Wolf"]
                },
                "Hunter": {
                    "Defensive Tactics": ["Escape the Horde", "Multiattack Defence", "Steel Will"],
                    "Hunter's Prey": ["Colossus Slayer", "Giant Killer", "Horde Breaker"]
                }
            }
        },
        "Rogue": {
            skills: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth", "Survival"],
            skillCount: 4,
            subclasses: ["Arcane Trickster", "Assassin", "Thief", "Swashbuckler"]
        },
        "Sorcerer": {
            skills: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
            skillCount: 2,
            subclasses: ["Draconic Bloodline", "Storm Sorcery", "Wild Magic", "Shadow Magic"],
            options: {
                "Metamagic": ["Careful Spell", "Distant Spell", "Extended Spell", "Heightened Spell", "Quickened Spell", "Subtle Spell", "Twinned Spell"],
                "Draconic Bloodline": {
                    "Draconic Ancestry": [
                        "Black (Acid)", "Blue (Lightning)", "Brass (Fire)", "Bronze (Lightning)",
                        "Copper (Acid)", "Gold (Fire)", "Green (Poison)", "Red (Fire)",
                        "Silver (Cold)", "White (Cold)"
                    ]
                }
            }
        },
        "Warlock": {
            skills: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
            skillCount: 2,
            subclasses: ["The Archfey", "The Fiend", "The Great Old One", "Hexblade"],
            options: {
                "Pact Boon": ["Pact Of The Blade", "Pact Of The Chain", "Pact Of The Tome"],
                "Warlock Patron": ["The Archfey", "The Fiend", "The Great Old One", "Hexblade"],
                "Preferred Weapon": ["Battleaxe", "Glaive", "Greatsword", "Rapier", "Trident", "Warhammer"],
                "Preferred Familiar": ["Animal Spirit", "Imp", "Quasit"],
                "Eldritch Invocations (Level 2)": [
                    "Agonizing Blast", "Armour of Shadows", "Beast Speech", "Beguiling Influence",
                    "Devil's Sight", "Fiendish Vigor", "Mask of Many Faces", "One with Shadows",
                    "Repelling Blast", "Thief of Five Fates"
                ],
                "Eldritch Invocations (Level 5)": ["Beast Speech", "Mire the Mind", "Sign of Ill Omen"],
                "Eldritch Invocations (Level 7)": ["Agonizing Blast", "Book of Ancient Secrets", "Dreadful Word", "Sculptor of Flesh"],
                "Eldritch Invocations (Level 9)": ["Armour of Shadows", "Minions of Chaos", "Otherworldly Leap", "Whispers of the Grave"],
                "Eldritch Invocations (Level 12)": ["Lifedrinker", "Mask of Many Faces"],
                "Mystic Arcanum": ["Arcane Gate", "Circle of Death", "Eyebite", "Flesh to Stone"]
            }
        },
        "Wizard": {
            skills: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
            skillCount: 2,
            subclasses: ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation", "Bladesinging"]
        }
    },
    feats: [
        "Ability Improvements", "Actor", "Alert", "Athlete", "Charger: Charge",
        "Charger: Shove", "Crossbow Expert: Point-Blank", "Crossbow Expert: Wounding",
        "Defensive Duellist", "Dual Wielder", "Dungeon Delver: Detection",
        "Dungeon Delver: Resistance", "Durable", "Elemental Adept: Acid",
        "Elemental Adept: Cold", "Elemental Adept: Fire", "Elemental Adept: Lightning",
        "Elemental Adept: Thunder", "Great Weapon Master", "Heavily Armoured",
        "Heavy Armour Master", "Lightly Armoured", "Lucky", "Mage Slayer: Break Concentration",
        "Mage Slayer: Protect Against Spells", "Magic Initiate: Bard", "Magic Initiate: Cleric",
        "Magic Initiate: Druid", "Magic Initiate: Sorcerer", "Magic Initiate: Warlock",
        "Magic Initiate: Wizard", "Martial Adept", "Medium Armour Master", "Mobile: Evade Opportunity Attack",
        "Mobile: Increased Movement Speed", "Moderately Armoured", "Performer",
        "Polearm Master: Bonus Attack", "Polearm Master: Opportunity Attack",
        "Resilient: Charisma", "Resilient: Constitution", "Resilient: Dexterity",
        "Resilient: Intelligence", "Resilient: Strength", "Resilient: Wisdom",
        "Ritual Caster", "Savage Attacker", "Sentinel", "Sentinel: Snare",
        "Sharpshooter: Low Ground", "Sharpshooter: Ranged Attacks",
        "Shield Master: Shield Bash", "Shield Master: Shield Master",
        "Skilled", "Spell Sniper", "Tavern Brawler", "Tough",
        "War Caster", "Weapon Master"
    ],
    backgrounds: [
        "Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero",
        "Guild Artisan", "Noble", "Outlander", "Sage", "Soldier", "Urchin",
        "The Haunted One"
    ],
    romances: ["Astarion", "Gale", "Halsin", "Karlach", "Lae'zel", "Minthara", "Shadowheart", "Wyll", "Jaheriah", "Minsc", "No One"],
    settings: {
        multiclassChance: 8,
        featCount: 4
    }
};
const SAVED_CHARACTERS_KEY = "bg3-character-generator-saved-results";
const BACKGROUND_SKILLS = {
    Acolyte: ["Insight", "Religion"],
    Charlatan: ["Deception", "Sleight of Hand"],
    Criminal: ["Deception", "Stealth"],
    Entertainer: ["Acrobatics", "Performance"],
    "Folk Hero": ["Animal Handling", "Survival"],
    "Guild Artisan": ["Insight", "Persuasion"],
    "The Haunted One": ["Intimidation", "Medicine"],
    Noble: ["History", "Persuasion"],
    Outlander: ["Athletics", "Survival"],
    Sage: ["Arcana", "History"],
    Soldier: ["Athletics", "Intimidation"],
    Urchin: ["Sleight of Hand", "Stealth"]
};
const RACIAL_PROFICIENCIES = {
    Drow: { "*": ["Perception", "Rapiers", "Shortswords", "Hand Crossbows"] },
    Dwarf: { "*": ["Battleaxes", "Handaxes", "Light Hammers", "Warhammers"], "Shield Dwarf": ["Light Armour", "Medium Armour"] },
    Elf: { "*": ["Perception", "Longswords", "Shortswords", "Longbows", "Shortbows"], "Wood Elf": ["Stealth"] },
    Githyanki: { "*": ["Light Armour", "Medium Armour", "Greatswords", "Longswords", "Shortswords"] },
    Gnome: { "Rock Gnome": ["Expertise in History"] },
    "Half-Elf": { "*": ["Light Armour", "Shields", "Pikes", "Spears", "Halberds", "Glaives"] },
    "Half-Orc": { "*": ["Intimidation"] },
    Human: { "*": ["Light Armour", "Shields", "Pikes", "Spears", "Halberds", "Glaives"] }
};
const MULTICLASS_PROFICIENCIES = {
    Barbarian: ["Shields", "Simple Weapons", "Martial Weapons"],
    Bard: ["Light Armour", "Musical Instruments"],
    Cleric: ["Light Armour", "Medium Armour", "Shields", "Flails", "Morningstars"],
    Druid: ["Light Armour", "Medium Armour", "Shields"],
    Fighter: ["Light Armour", "Medium Armour", "Shields", "Simple Weapons", "Martial Weapons"],
    Monk: ["Simple Weapons", "Shortswords"],
    Paladin: ["Light Armour", "Medium Armour", "Shields", "Simple Weapons", "Martial Weapons"],
    Ranger: ["Light Armour", "Medium Armour", "Shields", "Simple Weapons", "Martial Weapons"],
    Rogue: ["Light Armour"],
    Sorcerer: [],
    Warlock: ["Light Armour", "Simple Weapons"],
    Wizard: []
};
const MULTICLASS_SKILL_COUNTS = {
    Bard: 1,
    Cleric: 2,
    Ranger: 1,
    Rogue: 1
};
const SUBCLASS_PROFICIENCIES = {
    Bard: {
        "College of Swords": ["Medium Armour", "Scimitars"],
        "College of Valour": ["Medium Armour", "Shields", "Martial Weapons"]
    },
    Cleric: {
        Life: ["Heavy Armour"],
        Nature: ["Heavy Armour"],
        Tempest: ["Heavy Armour", "Martial Weapons"],
        War: ["Heavy Armour", "Martial Weapons"]
    }
};
const KNOWLEDGE_DOMAIN_SKILLS = ["Arcana", "History", "Nature", "Religion"];
const NATURE_DOMAIN_SKILLS = ["Animal Handling", "Nature", "Survival"];
const ASTRAL_KNOWLEDGE_SKILLS = {
    Strength: ["Athletics"],
    Dexterity: ["Acrobatics", "Sleight of Hand", "Stealth"],
    Intelligence: ["Arcana", "History", "Investigation", "Nature", "Religion"],
    Wisdom: ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"],
    Charisma: ["Deception", "Intimidation", "Performance", "Persuasion"]
};
let data = structuredClone(DEFAULT_DATA);
let character = {};
let cardOrder = ["class", "race", "feats", "background", "darkUrge", "romance", "companionBuild"];
const COMPANION_DEFAULT_CLASSES = {
    Astarion: "Rogue",
    Gale: "Wizard",
    Halsin: "Druid",
    Karlach: "Barbarian",
    "Lae'zel": "Fighter",
    Minthara: "Paladin",
    Shadowheart: "Cleric",
    Wyll: "Warlock",
    Jaheriah: "Druid",
    Minsc: "Ranger"
};
const BASE_HIRELINGS = [
    { name: "Brinna Brightsong", defaultClass: "Bard" },
    { name: "Danton", defaultClass: "Druid" },
    { name: "Eldra Luthrinn", defaultClass: "Barbarian" },
    { name: "Sir Fuzzalump", defaultClass: "Wizard" },
    { name: "Jacelyn", defaultClass: "Sorcerer" },
    { name: "Kerz", defaultClass: "Paladin" },
    { name: "Kree Derryck", defaultClass: "Warlock" },
    { name: "Maddala Deadeye", defaultClass: "Rogue" },
    { name: "Sina'zith", defaultClass: "Monk" },
    { name: "Varanna Sunblossom", defaultClass: "Fighter" },
    { name: "Ver'yll Wenkiir", defaultClass: "Ranger" },
    { name: "Zenith Feur'sel", defaultClass: "Cleric" }
];
const WEAPON_PREFERENCES = {
    Barbarian: { melee: ["Greataxe", "Greatsword", "Maul"], ranged: ["Longbow", "Heavy Crossbow"] },
    Bard: { melee: ["Rapier", "Shortsword", "Longsword"], ranged: ["Shortbow", "Hand Crossbow"] },
    Cleric: { melee: ["Mace", "Quarterstaff", "Warhammer"], ranged: ["Light Crossbow", "Heavy Crossbow"] },
    Druid: { melee: ["Quarterstaff", "Scimitar", "Sickle"], ranged: ["Shortbow", "Light Crossbow"] },
    Fighter: { melee: ["Greatsword", "Longsword", "Greataxe"], ranged: ["Longbow", "Heavy Crossbow"] },
    Monk: { melee: ["Quarterstaff", "Shortsword", "Spear"], ranged: ["Shortbow", "Light Crossbow"] },
    Paladin: { melee: ["Greatsword", "Longsword", "Warhammer"], ranged: ["Longbow", "Heavy Crossbow"] },
    Ranger: { melee: ["Longsword", "Shortsword", "Scimitar"], ranged: ["Longbow", "Hand Crossbow"] },
    Rogue: { melee: ["Shortsword", "Rapier", "Dagger"], ranged: ["Hand Crossbow", "Shortbow"] },
    Sorcerer: { melee: ["Quarterstaff", "Dagger"], ranged: ["Light Crossbow", "Sling"] },
    Warlock: { melee: ["Quarterstaff", "Dagger", "Rapier"], ranged: ["Light Crossbow", "Sling"] },
    Wizard: { melee: ["Quarterstaff", "Dagger"], ranged: ["Light Crossbow", "Sling"] }
};
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
function randomSkills(className, count) {
    const cls = data.classes[className];
    return pickMany(cls?.skills || [], count);
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
function rollSubclassProficiencies(className, subclass) {
    const entries = [];
    const proficiencies = SUBCLASS_PROFICIENCIES[className]?.[subclass ?? ""] || [];
    if (proficiencies.length) {
        entries.push({ label: "Subclass Proficiencies", value: proficiencies });
    }
    if (className === "Cleric" && subclass === "Knowledge") {
        entries.push({ label: "Knowledge Domain Expertise", value: pickMany(KNOWLEDGE_DOMAIN_SKILLS, 2) });
    }
    if (className === "Cleric" && subclass === "Nature") {
        entries.push({ label: "Nature Domain Skill Proficiency", value: pick(NATURE_DOMAIN_SKILLS) });
    }
    return entries;
}
function rollSingleClass(className, isMulticlass = false) {
    const cls = data.classes[className];
    const subclass = pick(cls.subclasses || []);
    const entries = [{ label: "Class", value: className }];
    if (isMulticlass) {
        const skillCount = MULTICLASS_SKILL_COUNTS[className] || 0;
        if (skillCount) {
            entries.push({ label: "Multiclass Skill Proficiencies", value: randomSkills(className, skillCount) });
        }
        entries.push({
            label: "Multiclass Proficiencies",
            value: MULTICLASS_PROFICIENCIES[className]?.length
                ? MULTICLASS_PROFICIENCIES[className]
                : ["None"]
        });
    }
    else {
        entries.push({ label: "Skill Proficiencies", value: randomSkills(className, cls.skillCount || 2) });
    }
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
    entries.push(...rollSubclassProficiencies(className, subclass));
    return entries;
}
function rollClass() {
    const names = Object.keys(data.classes);
    const primary = pick(names) ?? names[0];
    const entries = [];
    const multi = Math.random() * 100 < Number(data.settings?.multiclassChance ?? 8);
    if (multi) {
        const remaining = names.filter(n => n !== primary);
        const secondary = pick(remaining) ?? primary;
        const first = rollSingleClass(primary);
        const second = rollSingleClass(secondary, true);
        entries.push(...first, ...second);
    }
    else {
        entries.push(...rollSingleClass(primary));
    }
    return entries;
}
function rollFeats() {
    return pickMany(data.feats, Number(data.settings?.featCount ?? 4), true);
}
function rollBackground() {
    const background = pick(data.backgrounds) ?? data.backgrounds[0];
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
    if (className === "Cleric") {
        const deities = data.classes.Cleric.options?.["Deity"];
        if (Array.isArray(deities))
            entries.push({ label: "Deity", value: pick(deities) });
    }
    entries.push({ label: "Preferred melee weapon", value: pick(weapons.melee) });
    entries.push({ label: "Preferred ranged weapon", value: pick(weapons.ranged) });
    return entries;
}
const definitions = {
    darkUrge: { title: "Should I accept the tadpole?", wide: false, roll: rollDarkUrge },
    race: { title: "Race", wide: false, roll: rollRace },
    class: { title: "Class", wide: true, roll: rollClass },
    feats: { title: "Feat options", wide: false, roll: rollFeats },
    background: { title: "Background", wide: false, roll: rollBackground },
    romance: { title: "Romance", wide: false, roll: rollRomance },
    companionBuild: { title: "Companion Build", wide: false, roll: rollCompanionBuild }
};
function normalizeResult(value) {
    if (Array.isArray(value))
        return value;
    return [{ label: "", value: value }];
}
function reroll(key) {
    character = { ...character, [key]: definitions[key].roll() };
    if (key === "romance")
        character.companionBuild = rollCompanionBuild(character.romance);
    renderCards();
}
function generateAll() {
    character.darkUrge = rollDarkUrge();
    for (const key of cardOrder) {
        if (key !== "darkUrge") {
            character = { ...character, [key]: definitions[key].roll() };
        }
    }
    renderCards();
}
function isSavedCharacter(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const candidate = value;
    return typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.character === "object" && candidate.character !== null;
}
function getSavedCharacters() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVED_CHARACTERS_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter(isSavedCharacter) : [];
    }
    catch {
        return [];
    }
}
function renderSavedCharacters(selectedId = "") {
    const select = document.getElementById("savedCharacters");
    const saved = getSavedCharacters();
    select.replaceChildren();
    if (!saved.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No saved results";
        select.append(option);
    }
    else {
        for (const item of saved) {
            const option = document.createElement("option");
            option.value = item.id;
            option.textContent = item.label;
            select.append(option);
        }
        if (saved.some(item => item.id === selectedId))
            select.value = selectedId;
    }
    const hasSelection = Boolean(select.value);
    document.getElementById("loadCharacter").disabled = !hasSelection;
    document.getElementById("deleteCharacter").disabled = !hasSelection;
}
function saveCharacter() {
    const saved = getSavedCharacters();
    const savedAt = new Date();
    const id = `${savedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    saved.unshift({
        id,
        label: `Character · ${savedAt.toLocaleString()}`,
        character: structuredClone(character)
    });
    try {
        localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
        renderSavedCharacters(id);
        document.getElementById("saveNotice").textContent = "Character saved on this device.";
    }
    catch {
        document.getElementById("saveNotice").textContent = "Could not save. Browser storage may be full or unavailable.";
    }
}
function loadCharacter() {
    const id = document.getElementById("savedCharacters").value;
    const saved = getSavedCharacters().find(item => item.id === id);
    if (!saved)
        return;
    character = structuredClone(saved.character);
    if (!character.companionBuild)
        character.companionBuild = rollCompanionBuild(character.romance);
    renderCards();
    document.getElementById("saveNotice").textContent = "Saved character loaded.";
}
function deleteCharacter() {
    const select = document.getElementById("savedCharacters");
    const id = select.value;
    if (!id)
        return;
    try {
        const saved = getSavedCharacters().filter(item => item.id !== id);
        localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
        renderSavedCharacters();
        document.getElementById("saveNotice").textContent = "Saved character deleted.";
    }
    catch {
        document.getElementById("saveNotice").textContent = "Could not delete the saved character.";
    }
}
function entryHTML(entry) {
    const value = entry.value;
    let htmlValue;
    if (Array.isArray(value)) {
        htmlValue = value.length
            ? `<ul>${value.map(v => `<li>${escapeHTML(v)}</li>`).join("")}</ul>`
            : `<span class="empty">No options</span>`;
    }
    else {
        htmlValue = escapeHTML(value ?? "Not available");
    }
    return `<div class="entry">
    ${entry.label ? `<span class="entry-label">${escapeHTML(entry.label)}</span>` : ""}
    <div class="entry-value">${htmlValue}</div>
  </div>`;
}
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char] ?? char);
}
function renderCards() {
    const host = document.getElementById("cards");
    host.innerHTML = cardOrder.map(key => {
        const def = definitions[key];
        const value = character[key];
        const isMulticlass = key === "class" &&
            normalizeResult(value).filter(entry => entry.label === "Class").length > 1;
        let content = "";
        if (key === "class" || key === "race") {
            let classCount = 0;
            content = normalizeResult(value).map(entry => {
                if (key === "class" && entry.label === "Class" && ++classCount === 2) {
                    return `<div class="class-divider">Second class</div>${entryHTML({ ...entry, label: "" })}`;
                }
                return entryHTML(entry);
            }).join("");
        }
        else if (key === "companionBuild") {
            content = normalizeResult(value).map(entryHTML).join("");
        }
        else if (key === "feats") {
            content = entryHTML({ label: "", value: value });
        }
        else {
            content = entryHTML({ label: "", value: value });
        }
        return `<article class="card card-${key} ${def.wide ? "wide" : ""} ${isMulticlass ? "card-multiclass" : ""}">
      <div class="card-head">
        <h2>${escapeHTML(def.title)}</h2>
        ${isMulticlass ? '<span class="multiclass-badge">Multiclass</span>' : ""}
        <button class="small reroll-button" data-reroll="${key}" aria-label="Reroll ${escapeHTML(def.title)}"><span class="reroll-icon" aria-hidden="true">↻</span>Reroll</button>
      </div>
      <div class="card-body">${content}</div>
    </article>`;
    }).join("");
    host.querySelectorAll("[data-reroll]").forEach(button => {
        button.addEventListener("click", () => reroll(button.dataset.reroll));
    });
}
document.getElementById("generateAll").addEventListener("click", generateAll);
document.getElementById("saveCharacter").addEventListener("click", saveCharacter);
document.getElementById("loadCharacter").addEventListener("click", loadCharacter);
document.getElementById("deleteCharacter").addEventListener("click", deleteCharacter);
const savedCharactersSelect = document.getElementById("savedCharacters");
savedCharactersSelect.addEventListener("change", () => renderSavedCharacters(savedCharactersSelect.value));
generateAll();
renderSavedCharacters();
