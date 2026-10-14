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
const STARTING_MAGIC = {
    Bard: {
        cantripCount: 2,
        cantrips: ["Blade Ward", "Dancing Lights", "Friends", "Light", "Mage Hand", "Minor Illusion", "True Strike", "Vicious Mockery"],
        spellCount: 4,
        spells: ["Animal Friendship", "Bane", "Charm Person", "Cure Wounds", "Dissonant Whispers", "Faerie Fire", "Healing Word", "Longstrider", "Sleep", "Speak with Animals", "Tasha's Hideous Laughter", "Thunderwave"]
    },
    Cleric: {
        cantripCount: 3,
        cantrips: ["Guidance", "Light", "Resistance", "Sacred Flame", "Thaumaturgy", "Toll the Dead"],
        spellCount: 4,
        spellLabel: "Prepared Level 1 Spells",
        spells: ["Bane", "Bless", "Command", "Cure Wounds", "Guiding Bolt", "Healing Word", "Inflict Wounds", "Sanctuary", "Shield of Faith"]
    },
    Druid: {
        cantripCount: 2,
        cantrips: ["Guidance", "Poison Spray", "Produce Flame", "Resistance", "Shillelagh", "Thorn Whip"],
        spellCount: 4,
        spellLabel: "Prepared Level 1 Spells",
        spells: ["Animal Friendship", "Charm Person", "Cure Wounds", "Entangle", "Faerie Fire", "Goodberry", "Healing Word", "Longstrider", "Speak with Animals", "Thunderwave"]
    },
    Sorcerer: {
        cantripCount: 4,
        cantrips: ["Acid Splash", "Blade Ward", "Bone Chill", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Minor Illusion", "Poison Spray", "Ray of Frost", "Shocking Grasp", "True Strike"],
        spellCount: 2,
        spells: ["Burning Hands", "Charm Person", "Chromatic Orb", "Colour Spray", "Expeditious Retreat", "False Life", "Mage Armour", "Magic Missile", "Shield", "Sleep", "Thunderwave", "Witch Bolt"]
    },
    Warlock: {
        cantripCount: 2,
        cantrips: ["Blade Ward", "Bone Chill", "Eldritch Blast", "Friends", "Mage Hand", "Minor Illusion", "Poison Spray", "True Strike"],
        spellCount: 2,
        spells: ["Armour of Agathys", "Arms of Hadar", "Charm Person", "Expeditious Retreat", "Hellish Rebuke", "Hex", "Protection from Evil and Good", "Witch Bolt"]
    },
    Wizard: {
        cantripCount: 3,
        cantrips: ["Acid Splash", "Blade Ward", "Bone Chill", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Minor Illusion", "Poison Spray", "Ray of Frost", "Shocking Grasp", "True Strike"],
        spellCount: 6,
        spellLabel: "Level 1 Spellbook Picks",
        spells: ["Burning Hands", "Charm Person", "Chromatic Orb", "Colour Spray", "Disguise Self", "Expeditious Retreat", "False Life", "Find Familiar", "Fog Cloud", "Grease", "Mage Armour", "Magic Missile", "Shield", "Sleep", "Tasha's Hideous Laughter", "Thunderwave", "Witch Bolt"]
    }
};
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
