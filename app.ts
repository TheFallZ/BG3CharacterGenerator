"use strict";

interface ClassEntry {
  label: string;
  value: string | string[] | null;
}

interface RaceInfo {
  subraces?: string[];
  extra?: { label: string; options: string[] };
}

interface ClassInfo {
  skills: string[];
  skillCount?: number;
  subclasses: string[];
  options?: Record<string, any>;
}

interface GeneratorData {
  darkUrge: string[];
  races: Record<string, RaceInfo>;
  highElfCantrips: string[];
  classes: Record<string, ClassInfo>;
  feats: string[];
  backgrounds: string[];
  romances: string[];
  settings: { multiclassChance: number; featCount: number };
}

interface Character {
  darkUrge?: string | null;
  race?: ClassEntry[];
  class?: ClassEntry[];
  feats?: string[];
  background?: string | ClassEntry[] | null;
  romance?: string | null;
  companionBuild?: ClassEntry[];
}

interface SavedCharacter {
  id: string;
  label: string;
  character: Character;
}

interface PartyMemberProfile {
  name: string;
  defaultClass: string;
}

interface WeaponPreferences {
  melee: string[];
  ranged: string[];
}

type CardKey = keyof Character;
type GeneratorResult = ClassEntry[] | string[] | string | null;

const DEFAULT_DATA: GeneratorData = {
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

const BACKGROUND_SKILLS: Record<string, string[]> = {
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

const RACIAL_PROFICIENCIES: Record<string, Record<string, string[]>> = {
  Drow: {"*": ["Perception", "Rapiers", "Shortswords", "Hand Crossbows"]},
  Dwarf: {"*": ["Battleaxes", "Handaxes", "Light Hammers", "Warhammers"], "Shield Dwarf": ["Light Armour", "Medium Armour"]},
  Elf: {"*": ["Perception", "Longswords", "Shortswords", "Longbows", "Shortbows"], "Wood Elf": ["Stealth"]},
  Githyanki: {"*": ["Light Armour", "Medium Armour", "Greatswords", "Longswords", "Shortswords"]},
  Gnome: {"Rock Gnome": ["Expertise in History"]},
  "Half-Elf": {"*": ["Light Armour", "Shields", "Pikes", "Spears", "Halberds", "Glaives"]},
  "Half-Orc": {"*": ["Intimidation"]},
  Human: {"*": ["Light Armour", "Shields", "Pikes", "Spears", "Halberds", "Glaives"]}
};

const MULTICLASS_PROFICIENCIES: Record<string, string[]> = {
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

const MULTICLASS_SKILL_COUNTS: Record<string, number> = {
  Bard: 1,
  Cleric: 2,
  Ranger: 1,
  Rogue: 1
};

const SUBCLASS_PROFICIENCIES: Record<string, Record<string, string[]>> = {
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
const ASTRAL_KNOWLEDGE_SKILLS: Record<string, string[]> = {
  Strength: ["Athletics"],
  Dexterity: ["Acrobatics", "Sleight of Hand", "Stealth"],
  Intelligence: ["Arcana", "History", "Investigation", "Nature", "Religion"],
  Wisdom: ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"],
  Charisma: ["Deception", "Intimidation", "Performance", "Persuasion"]
};

const STARTING_MAGIC: Record<string, {cantrips: string[]; cantripCount: number; spells: string[]; spellCount: number; spellLabel?: string}> = {
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

function rollStartingMagic(className: string): ClassEntry[] {
  const magic = STARTING_MAGIC[className];
  if (!magic) return [];
  return [
    {label: "Starting Cantrips", value: pickMany(magic.cantrips, magic.cantripCount)},
    {label: magic.spellLabel ?? "Starting Spells", value: pickMany(magic.spells, magic.spellCount)}
  ];
}

let data: GeneratorData = structuredClone(DEFAULT_DATA);
let character: Character = {};
let cardOrder: CardKey[] = ["class", "race", "feats", "background", "darkUrge", "romance", "companionBuild"];

const COMPANION_DEFAULT_CLASSES: Record<string, string> = {
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

const BASE_HIRELINGS: PartyMemberProfile[] = [
  {name: "Brinna Brightsong", defaultClass: "Bard"},
  {name: "Danton", defaultClass: "Druid"},
  {name: "Eldra Luthrinn", defaultClass: "Barbarian"},
  {name: "Sir Fuzzalump", defaultClass: "Wizard"},
  {name: "Jacelyn", defaultClass: "Sorcerer"},
  {name: "Kerz", defaultClass: "Paladin"},
  {name: "Kree Derryck", defaultClass: "Warlock"},
  {name: "Maddala Deadeye", defaultClass: "Rogue"},
  {name: "Sina'zith", defaultClass: "Monk"},
  {name: "Varanna Sunblossom", defaultClass: "Fighter"},
  {name: "Ver'yll Wenkiir", defaultClass: "Ranger"},
  {name: "Zenith Feur'sel", defaultClass: "Cleric"}
];

const WEAPON_PREFERENCES: Record<string, WeaponPreferences> = {
  Barbarian: {melee: ["Greataxe", "Greatsword", "Maul"], ranged: ["Longbow", "Heavy Crossbow"]},
  Bard: {melee: ["Rapier", "Shortsword", "Longsword"], ranged: ["Shortbow", "Hand Crossbow"]},
  Cleric: {melee: ["Mace", "Quarterstaff", "Warhammer"], ranged: ["Light Crossbow", "Heavy Crossbow"]},
  Druid: {melee: ["Quarterstaff", "Scimitar", "Sickle"], ranged: ["Shortbow", "Light Crossbow"]},
  Fighter: {melee: ["Greatsword", "Longsword", "Greataxe"], ranged: ["Longbow", "Heavy Crossbow"]},
  Monk: {melee: ["Quarterstaff", "Shortsword", "Spear"], ranged: ["Shortbow", "Light Crossbow"]},
  Paladin: {melee: ["Greatsword", "Longsword", "Warhammer"], ranged: ["Longbow", "Heavy Crossbow"]},
  Ranger: {melee: ["Longsword", "Shortsword", "Scimitar"], ranged: ["Longbow", "Hand Crossbow"]},
  Rogue: {melee: ["Shortsword", "Rapier", "Dagger"], ranged: ["Hand Crossbow", "Shortbow"]},
  Sorcerer: {melee: ["Quarterstaff", "Dagger"], ranged: ["Light Crossbow", "Sling"]},
  Warlock: {melee: ["Quarterstaff", "Dagger", "Rapier"], ranged: ["Light Crossbow", "Sling"]},
  Wizard: {melee: ["Quarterstaff", "Dagger"], ranged: ["Light Crossbow", "Sling"]}
};

function pick<T>(list: T[] | null | undefined): T | null {
  if (!Array.isArray(list) || !list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function pickMany<T>(list: T[] | null | undefined, count: number, allowDuplicates = false): T[] {
  if (!Array.isArray(list) || !list.length) return [];
  if (allowDuplicates) return Array.from({length: count}, () => pick(list) as T);
  const pool = [...list];
  const result = [];
  while (pool.length && result.length < count) {
    result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return result;
}

function randomSkills(className: string, count: number, excludedSkills: string[] = [], reservedSkills: string[] = [], reservedCount = 0): string[] {
  const cls = data.classes[className];
  const availableSkills = (cls?.skills || []).filter(skill => !excludedSkills.includes(skill));
  if (!reservedSkills.length) return pickMany(availableSkills, count);

  const reservedSet = new Set(reservedSkills);
  const safeSkills = availableSkills.filter(skill => !reservedSet.has(skill));
  const overlappingSkills = availableSkills.filter(skill => reservedSet.has(skill));
  const safePicks = pickMany(safeSkills, Math.min(count, safeSkills.length));
  const overlapCapacity = Math.max(0, reservedSkills.length - reservedCount);
  const overlappingPicks = pickMany(overlappingSkills, Math.min(count - safePicks.length, overlapCapacity));
  return [...safePicks, ...overlappingPicks];
}

function getRacialSkillProficiencies(race: Character["race"] = character.race): string[] {
  const skillNames = new Set(Object.values(data.classes).flatMap(classInfo => classInfo.skills));
  const racialEntries = race || [];
  const skills = racialEntries.flatMap(entry => {
    if (entry.label !== "Racial Proficiencies" && entry.label !== "Additional Skill Proficiency") return [];
    const values = Array.isArray(entry.value) ? entry.value : [entry.value];
    return values.filter((skill): skill is string => typeof skill === "string" && skillNames.has(skill));
  });
  return [...new Set(skills)];
}

function getBackgroundSkillProficiencies(background: Character["background"] = character.background): string[] {
  if (typeof background === "string") return BACKGROUND_SKILLS[background] || [];
  if (!Array.isArray(background)) return [];

  const skillEntry = background.find(entry => entry.label === "Background Skill Proficiencies");
  if (Array.isArray(skillEntry?.value)) return skillEntry.value.filter((skill): skill is string => typeof skill === "string");

  const backgroundName = background.find(entry => entry.label === "Background")?.value;
  return typeof backgroundName === "string" ? BACKGROUND_SKILLS[backgroundName] || [] : [];
}

function getClassSkillProficiencies(classEntries: Character["class"] = character.class): string[] {
  const skillLabels = ["Skill Proficiencies", "Multiclass Skill Proficiencies", "Nature Domain Skill Proficiency"];
  return (classEntries || [])
    .filter(entry => skillLabels.includes(entry.label))
    .flatMap(entry => Array.isArray(entry.value) ? entry.value : typeof entry.value === "string" ? [entry.value] : []);
}

function getExistingSkillProficiencies(): string[] {
  return [...new Set([...getRacialSkillProficiencies(), ...getBackgroundSkillProficiencies()])];
}

function rollDarkUrge(): string | null {
  return pick(data.darkUrge);
}

function rollRace(): ClassEntry[] {
  const race = pick(Object.keys(data.races)) ?? "Human";
  const info = data.races[race] || {};
  const result: ClassEntry[] = [{label: "Race", value: race}];

  if (info.subraces?.length) {
    result.push({label: "Subrace", value: pick(info.subraces)});
  }

  const subraceValue = result.find(x => x.label === "Subrace")?.value;
  const subrace = typeof subraceValue === "string" ? subraceValue : "";
  if (race === "Elf" && subrace === "High Elf" ||
      race === "Half-Elf" && subrace === "High Half-Elf") {
    result.push({label: "High Elf Cantrip", value: pick(data.highElfCantrips)});
  }

  const racialProficiencies = [
    ...(RACIAL_PROFICIENCIES[race]?.["*"] || []),
    ...(RACIAL_PROFICIENCIES[race]?.[subrace] || [])
  ];
  if (racialProficiencies.length) {
    result.push({label: "Racial Proficiencies", value: racialProficiencies});
  }
  if (race === "Githyanki") {
    const ability = pick(Object.keys(ASTRAL_KNOWLEDGE_SKILLS)) ?? "Strength";
    result.push({
      label: `Astral Knowledge (${ability}, until Long Rest)`,
      value: ASTRAL_KNOWLEDGE_SKILLS[ability]
    });
  }

  if (info.extra) {
    result.push({label: info.extra.label, value: pick(info.extra.options)});
  }
  return result;
}

function rollRaceAvoiding(avoidSkills: string[]): ClassEntry[] {
  let race = rollRace();
  for (let attempt = 0; attempt < 50 && getRacialSkillProficiencies(race).some(skill => avoidSkills.includes(skill)); attempt++) {
    race = rollRace();
  }
  return race;
}

function addOptionEntries(entries: ClassEntry[], options?: Record<string, any>): void {
  if (!options) return;
  for (const [label, values] of Object.entries(options)) {
    if (Array.isArray(values)) {
      entries.push({label, value: pick(values)});
    }
  }
}

function rollClassOptions(className: string, subclass: string | null): ClassEntry[] {
  const cls = data.classes[className];
  const entries: ClassEntry[] = [];
  const options = cls?.options || {};

  if (className === "Warlock") {
    const patron = pick(options["Warlock Patron"] || []) as string | null;
    const pact = pick(options["Pact Boon"] || []) as string | null;
    entries.push({label: "Mystic Arcanum", value: pick(options["Mystic Arcanum"] || [])});
    entries.push({label: "Eldritch Invocations (Level 12)", value: pick(options["Eldritch Invocations (Level 12)"] || [])});
    entries.push({label: "Eldritch Invocations (Level 9)", value: pick(options["Eldritch Invocations (Level 9)"] || [])});
    entries.push({label: "Eldritch Invocations (Level 7)", value: pick(options["Eldritch Invocations (Level 7)"] || [])});
    entries.push({label: "Eldritch Invocations (Level 5)", value: pick(options["Eldritch Invocations (Level 5)"] || [])});
    entries.push({label: "Eldritch Invocations (Level 2)", value: pickMany(options["Eldritch Invocations (Level 2)"] || [], 2)});
    entries.push({label: "Pact Boon", value: pact});
    if (pact === "Pact Of The Blade") {
      entries.push({label: "Preferred Weapon", value: pick(options["Preferred Weapon"] || [])});
    }
    if (pact === "Pact Of The Chain") {
      entries.push({label: "Preferred Familiar", value: pick(options["Preferred Familiar"] || [])});
    }
    entries.push({label: "Warlock Patron", value: patron});
    return entries;
  }

  if (className === "Bard") {
    entries.push({label: "Starting Instrument", value: pick(options["Starting Instrument"] || [])});
    if (subclass === "College of Swords") {
      entries.push({label: "Fighting Style", value: pick(options["College of Swords"]["Fighting Style"])});
    }
    return entries;
  }

  if (className === "Cleric") {
    entries.push({label: "Deity", value: pick(options["Deity"] || [])});
    return entries;
  }

  if (className === "Druid") {
    if (subclass === "Circle of the Land") {
      entries.push({label: "Land", value: pick(options["Circle of the Land"]["Land"])});
    }
    return entries;
  }

  if (className === "Fighter") {
    entries.push({label: "Fighting Style", value: pick(options["Fighting Style"] || [])});
    if (subclass === "Champion") {
      entries.push({label: "Second Fighting Style", value: pick(options.Champion["Second Fighting Style"])});
    }
    if (subclass === "Battle Master") {
      entries.push({label: "Manoeuvres", value: pickMany(options["Battle Master"]["Manoeuvres"], 7)});
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
    entries.push({label: "Natural Explorer", value: pickMany(options["Natural Explorer"], 3)});
    entries.push({label: "Favoured Enemy", value: pickMany(options["Favoured Enemy"], 3)});
    entries.push({label: "Fighting Style", value: pick(options["Fighting Style"])});
    entries.push({label: "Wisdom", value: pick(options["Wisdom"])});
    if (subclass === "Beast Master") {
      entries.push({label: "Preferred Companion", value: pick(options["Beast Master"]["Preferred Companion"])});
    }
    if (subclass === "Hunter") {
      entries.push({label: "Defensive Tactics", value: pick(options.Hunter["Defensive Tactics"])});
      entries.push({label: "Hunter's Prey", value: pick(options.Hunter["Hunter's Prey"])});
    }
    return entries;
  }

  if (className === "Sorcerer") {
    entries.push({label: "Metamagic", value: pickMany(options["Metamagic"], 4)});
    if (subclass === "Draconic Bloodline") {
      entries.push({label: "Draconic Ancestry", value: pick(options["Draconic Bloodline"]["Draconic Ancestry"])});
    }
    return entries;
  }

  if (className === "Barbarian" && subclass === "Wildheart") {
    entries.push({label: "Animal Aspects", value: pickMany(options.Wildheart["Animal Aspects"], 2)});
    entries.push({label: "Bestial Heart", value: pick(options.Wildheart["Bestial Heart"])});
    return entries;
  }

  return entries;
}

function rollSubclassProficiencies(className: string, subclass: string | null, excludedSkills: string[] = []): ClassEntry[] {
  const entries: ClassEntry[] = [];
  const proficiencies = SUBCLASS_PROFICIENCIES[className]?.[subclass ?? ""] || [];
  if (proficiencies.length) {
    entries.push({label: "Subclass Proficiencies", value: proficiencies});
  }

  if (className === "Cleric" && subclass === "Knowledge") {
    entries.push({label: "Knowledge Domain Expertise", value: pickMany(KNOWLEDGE_DOMAIN_SKILLS, 2)});
  }
  if (className === "Cleric" && subclass === "Nature") {
    const availableSkills = NATURE_DOMAIN_SKILLS.filter(skill => !excludedSkills.includes(skill));
    if (availableSkills.length) entries.push({label: "Nature Domain Skill Proficiency", value: pick(availableSkills)});
  }
  return entries;
}

function rollSingleClass(className: string, isMulticlass = false, excludedSkills: string[] = [], reservedSkills: string[] = [], reservedCount = 0): ClassEntry[] {
  const cls = data.classes[className];
  const subclass = pick(cls.subclasses || []);
  const entries: ClassEntry[] = [{label: "Class", value: className}];

  if (isMulticlass) {
    const skillCount = MULTICLASS_SKILL_COUNTS[className] || 0;
    if (skillCount) {
      entries.push({label: "Multiclass Skill Proficiencies", value: randomSkills(className, skillCount, excludedSkills)});
    }
    entries.push({
      label: "Multiclass Proficiencies",
      value: MULTICLASS_PROFICIENCIES[className]?.length
        ? MULTICLASS_PROFICIENCIES[className]
        : ["None"]
    });
  } else {
    entries.push({label: "Skill Proficiencies", value: randomSkills(className, cls.skillCount || 2, excludedSkills, reservedSkills, reservedCount)});
  }

  entries.push(...rollStartingMagic(className));
  entries.push(
    {label: className === "Wizard" ? "Wizard School" :
             className === "Monk" ? "Monastic Tradition" :
             className === "Sorcerer" ? "Sorcerer Subclass" :
             className === "Bard" ? "Bard College" :
             className === "Cleric" ? "Cleric Domain" :
             className === "Barbarian" ? "Barbarian Subclass" :
             className === "Ranger" ? "Ranger Subclass" :
             className === "Fighter" ? "Fighter Subclass" :
             className === "Rogue" ? "Rogue Subclass" :
             className === "Paladin" ? "Paladin Oath" :
             className === "Warlock" ? "Warlock Patron" : "Subclass", value: subclass}
  );

  const extra = rollClassOptions(className, subclass);
  for (const entry of extra) {
    if (entry.label === "Warlock Patron") continue;
    entries.push(entry);
  }
  entries.push(...rollSubclassProficiencies(className, subclass, excludedSkills));
  return entries;
}

function rollClass(): ClassEntry[] {
  const names = Object.keys(data.classes);
  const primary = pick(names) ?? names[0];
  const entries: ClassEntry[] = [];
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
  } else {
    entries.push(...rollSingleClass(primary, false, existingSkills));
  }

  return entries;
}

function rollFeats(): string[] {
  return pickMany(data.feats, Number(data.settings?.featCount ?? 4), true);
}

function rollBackground(avoidSkills: string[] = []): ClassEntry[] {
  const takenSkills = new Set([...getRacialSkillProficiencies(), ...avoidSkills]);
  const availableBackgrounds = data.backgrounds.filter(background =>
    (BACKGROUND_SKILLS[background] || []).every(skill => !takenSkills.has(skill))
  );
  const background = pick(availableBackgrounds.length ? availableBackgrounds : data.backgrounds) ?? data.backgrounds[0];
  return [
    {label: "Background", value: background},
    {label: "Background Skill Proficiencies", value: BACKGROUND_SKILLS[background] || []}
  ];
}
function rollRomance(): string | null { return pick(data.romances); }

function rollCompanionBuild(romance: string | null | undefined = character.romance): ClassEntry[] {
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
  const entries: ClassEntry[] = [
    {label: "Companion or hireling", value: partyMember.name},
    ...(!isHireling ? [{label: "Class choice", value: usesDefaultClass ? "Default class" : "Random class"}] : []),
    {label: "Class", value: className},
    {label: "Subclass", value: subclass}
  ];
  entries.push(...rollStartingMagic(className));

  if (className === "Cleric") {
    const deities = data.classes.Cleric.options?.["Deity"];
    if (Array.isArray(deities)) entries.push({label: "Deity", value: pick(deities as string[])});
  }

  entries.push({label: "Preferred melee weapon", value: pick(weapons.melee)});
  entries.push({label: "Preferred ranged weapon", value: pick(weapons.ranged)});
  return entries;
}

const definitions: Record<CardKey, { title: string; wide: boolean; roll: () => GeneratorResult }> = {
  darkUrge: {title: "Should I accept the tadpole?", wide: false, roll: rollDarkUrge},
  race: {title: "Race", wide: false, roll: rollRace},
  class: {title: "Class", wide: true, roll: rollClass},
  feats: {title: "Feat options", wide: false, roll: rollFeats},
  background: {title: "Background", wide: false, roll: rollBackground},
  romance: {title: "Romance", wide: false, roll: rollRomance},
  companionBuild: {title: "Companion Build", wide: false, roll: rollCompanionBuild}
};

const CARD_ICONS: Record<CardKey, string> = {
  darkUrge: '<path d="M2.5 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.2"/>',
  race: '<circle cx="10" cy="6.5" r="3"/><path d="M4 17c.8-3.4 3.1-5 6-5s5.2 1.6 6 5"/>',
  class: '<path d="M14.5 3.5h2v2L8 14l-2-2z"/><path d="M5 11l4 4M3.5 16.5l2.5-2.5"/>',
  feats: '<path d="M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7L3.2 8l4.7-.7z"/>',
  background: '<path d="M5 3.5h10v13H5z"/><path d="M8 7.5h4M8 10.5h4M8 13.5h2"/>',
  romance: '<path d="M10 16.5s-6-3.7-6-8A3.3 3.3 0 0 1 10 6.3 3.3 3.3 0 0 1 16 8.5c0 4.3-6 8-6 8z"/>',
  companionBuild: '<circle cx="7.5" cy="7" r="2.5"/><circle cx="13.5" cy="7.5" r="2"/><path d="M3 16c.6-2.8 2.4-4.2 4.5-4.2S11.4 13.2 12 16M12.5 11.8c2.2 0 3.8 1.3 4.5 4.2"/>'
};

const LOCK_ICONS = {
  locked: '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
  unlocked: '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 5.8-1.1"/>'
};

// Rolled in dependency order: background avoids racial skills, class avoids both.
const ROLL_ORDER: CardKey[] = ["darkUrge", "race", "background", "class", "feats", "romance", "companionBuild"];
const LOCKED_CARDS_KEY = "bg3-character-generator-locked-cards";
let lockedCards = loadLockedCards();
let rolledCards = new Set<CardKey>();

function loadLockedCards(): Set<CardKey> {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCKED_CARDS_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter((key): key is CardKey => cardOrder.includes(key)) : []);
  } catch {
    return new Set();
  }
}

// The companion comes from the romance, so a locked companion build keeps its romance too.
function isLockedByCompanion(key: CardKey): boolean {
  return key === "romance" && lockedCards.has("companionBuild");
}

function isLocked(key: CardKey): boolean {
  return lockedCards.has(key) || isLockedByCompanion(key);
}

function toggleLock(key: CardKey): void {
  if (lockedCards.has(key)) lockedCards.delete(key);
  else lockedCards.add(key);
  try {
    localStorage.setItem(LOCKED_CARDS_KEY, JSON.stringify([...lockedCards]));
  } catch {
    // Locks still work for this visit without storage.
  }
  rolledCards = new Set();
  renderCards();
  document.querySelector<HTMLButtonElement>(`[data-lock="${key}"]`)?.focus();
}

function rollCards(keys: CardKey[]): void {
  // A locked card with nothing to keep yet (first page load) still gets rolled.
  const targets = new Set(keys.filter(key => !isLocked(key) || character[key] === undefined));
  const keptClassSkills = targets.has("class") ? [] : getClassSkillProficiencies();

  for (const key of ROLL_ORDER) {
    if (!targets.has(key)) continue;
    if (key === "race") {
      const keptBackgroundSkills = targets.has("background") ? [] : getBackgroundSkillProficiencies();
      character.race = rollRaceAvoiding([...keptClassSkills, ...keptBackgroundSkills]);
    } else if (key === "background") {
      character.background = rollBackground(keptClassSkills);
    } else if (key === "companionBuild") {
      character.companionBuild = rollCompanionBuild(character.romance);
    } else {
      character = {...character, [key]: definitions[key].roll()} as Character;
    }
  }

  rolledCards = targets;
  renderCards();
}

function normalizeResult(value: unknown): ClassEntry[] {
  if (Array.isArray(value)) return value;
  return [{label: "", value: value as string | null}];
}

function reroll(key: CardKey): void {
  if (key === "race") rollCards(["race", "background", "class"]);
  else if (key === "background") rollCards(["background", "class"]);
  else if (key === "romance") rollCards(["romance", "companionBuild"]);
  else rollCards([key]);
}

function generateAll(): void {
  rollCards(ROLL_ORDER);
}

function isSavedCharacter(value: unknown): value is SavedCharacter {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SavedCharacter>;
  return typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.character === "object" && candidate.character !== null;
}

function getSavedCharacters(): SavedCharacter[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_CHARACTERS_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(isSavedCharacter) : [];
  } catch {
    return [];
  }
}

function entryText(entries: ClassEntry[] | undefined, label: string): string[] {
  return (entries || [])
    .filter(entry => entry.label === label && typeof entry.value === "string")
    .map(entry => entry.value as string);
}

function describeCharacter(saved: Character): string {
  const race = entryText(saved.race, "Subrace")[0] ?? entryText(saved.race, "Race")[0];
  const classes = entryText(saved.class, "Class").join(" / ");
  return [race, classes].filter(Boolean).join(" · ") || "Character";
}

function savedDate(item: SavedCharacter): string {
  const savedAt = Number(item.id.split("-")[0]);
  return Number.isFinite(savedAt) && savedAt > 0
    ? new Date(savedAt).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})
    : item.label;
}

function setSaveNotice(message: string): void {
  (document.getElementById("saveNotice") as HTMLElement).textContent = message;
}

function renderSavedCharacters(): void {
  const strip = document.getElementById("savedStrip") as HTMLElement;
  const list = document.getElementById("savedCharacters") as HTMLElement;
  const saved = getSavedCharacters();
  strip.hidden = !saved.length;
  list.replaceChildren(...saved.map(item => {
    const title = describeCharacter(item.character);
    const li = document.createElement("li");
    li.className = "saved-item";

    const load = document.createElement("button");
    load.className = "saved-load";
    load.dataset.load = item.id;
    const name = document.createElement("span");
    name.className = "saved-title";
    name.textContent = title;
    const meta = document.createElement("span");
    meta.className = "saved-meta";
    meta.textContent = savedDate(item);
    load.append(name, meta);

    const remove = document.createElement("button");
    remove.className = "saved-delete";
    remove.dataset.delete = item.id;
    remove.setAttribute("aria-label", `Delete ${title}`);
    remove.textContent = "×";

    li.append(load, remove);
    return li;
  }));
}

function saveCharacter(): void {
  const saved = getSavedCharacters();
  const savedAt = new Date();
  const id = `${savedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  saved.unshift({
    id,
    label: `${describeCharacter(character)} · ${savedAt.toLocaleString()}`,
    character: structuredClone(character)
  });

  try {
    localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
    renderSavedCharacters();
    setSaveNotice("Character saved on this device.");
  } catch {
    setSaveNotice("Could not save. Browser storage may be full or unavailable.");
  }
}

function loadCharacter(id: string): void {
  const saved = getSavedCharacters().find(item => item.id === id);
  if (!saved) return;
  character = structuredClone(saved.character);
  if (!character.companionBuild) character.companionBuild = rollCompanionBuild(character.romance);
  rolledCards = new Set(cardOrder);
  renderCards();
  setSaveNotice("Saved character loaded.");
}

function deleteCharacter(id: string): void {
  const item = getSavedCharacters().find(saved => saved.id === id);
  if (!item || !confirm(`Delete "${describeCharacter(item.character)}"?`)) return;

  try {
    const saved = getSavedCharacters().filter(saved => saved.id !== id);
    localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
    renderSavedCharacters();
    setSaveNotice("Saved character deleted.");
  } catch {
    setSaveNotice("Could not delete the saved character.");
  }
}

function entryHTML(entry: ClassEntry): string {
  const value = entry.value;
  let htmlValue;
  if (Array.isArray(value)) {
    htmlValue = value.length
      ? `<ul>${value.map(v => `<li>${escapeHTML(v)}</li>`).join("")}</ul>`
      : `<span class="empty">No options</span>`;
  } else {
    htmlValue = escapeHTML(value ?? "Not available");
  }
  return `<div class="entry">
    ${entry.label ? `<span class="entry-label">${escapeHTML(entry.label)}</span>` : ""}
    <div class="entry-value">${htmlValue}</div>
  </div>`;
}

function escapeHTML(value: unknown): string {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char] ?? char);
}

function iconSVG(paths: string, className: string): string {
  return `<svg class="${className}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function renderCards(): void {
  const host = document.getElementById("cards") as HTMLElement;
  let rollIndex = 0;
  host.innerHTML = cardOrder.map(key => {
    const def = definitions[key];
    const value = character[key];
    const isMulticlass = key === "class" &&
      normalizeResult(value).filter(entry => entry.label === "Class").length > 1;
    const primaryClass = key === "class" ? entryText(character.class, "Class")[0] ?? "" : "";
    const locked = isLocked(key);
    const lockedByCompanion = isLockedByCompanion(key);
    const lockLabel = lockedByCompanion
      ? `${def.title} is kept because Companion Build is locked`
      : `${locked ? "Unlock" : "Lock"} ${def.title}`;
    const classes = ["card", `card-${key}`];
    if (def.wide) classes.push("wide");
    if (isMulticlass) classes.push("card-multiclass");
    if (locked) classes.push("is-locked");
    if (rolledCards.has(key)) classes.push("card-rolled");
    let content = "";

    if (key === "class" || key === "race") {
      let classCount = 0;
      content = normalizeResult(value).map(entry => {
        if (key === "class" && entry.label === "Class" && ++classCount === 2) {
          return `<div class="class-divider">Second class</div>${entryHTML({...entry, label: ""})}`;
        }
        return entryHTML(entry);
      }).join("");
    } else if (key === "companionBuild") {
      content = normalizeResult(value).map(entryHTML).join("");
    } else if (key === "background") {
      content = normalizeResult(value).map(entryHTML).join("");
    } else if (key === "feats") {
      content = entryHTML({label: "", value: value as string | string[] | null});
    } else {
      content = entryHTML({label: "", value: value as string | null});
    }

    return `<article class="${classes.join(" ")}"${primaryClass ? ` data-class="${escapeHTML(primaryClass)}"` : ""}${rolledCards.has(key) ? ` style="--roll-index: ${rollIndex++}"` : ""}>
      <div class="card-head">
        <h2>${iconSVG(CARD_ICONS[key], "card-icon")}<span>${escapeHTML(def.title)}</span></h2>
        ${isMulticlass ? '<span class="multiclass-badge">Multiclass</span>' : ""}
        <div class="card-actions">
          <button class="small lock-button" data-lock="${key}" aria-pressed="${locked}" aria-label="${escapeHTML(lockLabel)}" title="${escapeHTML(lockLabel)}"${lockedByCompanion ? " disabled" : ""}>${iconSVG(locked ? LOCK_ICONS.locked : LOCK_ICONS.unlocked, "lock-icon")}</button>
          <button class="small reroll-button" data-reroll="${key}" aria-label="Reroll ${escapeHTML(def.title)}"${locked ? " disabled" : ""}><span class="reroll-icon" aria-hidden="true">↻</span>Reroll</button>
        </div>
      </div>
      <div class="card-body">${content}</div>
    </article>`;
  }).join("");

  host.querySelectorAll<HTMLButtonElement>("[data-reroll]").forEach(button => {
    button.addEventListener("click", () => reroll(button.dataset.reroll as CardKey));
  });
  host.querySelectorAll<HTMLButtonElement>("[data-lock]").forEach(button => {
    button.addEventListener("click", () => toggleLock(button.dataset.lock as CardKey));
  });
}

document.getElementById("generateAll")!.addEventListener("click", generateAll);
document.getElementById("saveCharacter")!.addEventListener("click", saveCharacter);
document.getElementById("savedCharacters")!.addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (button?.dataset.load) loadCharacter(button.dataset.load);
  else if (button?.dataset.delete) deleteCharacter(button.dataset.delete);
});

generateAll();
renderSavedCharacters();
