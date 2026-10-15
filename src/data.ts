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
  // Percent chances: a multiclass on "Sometimes", and three classes when a multiclass rolls with triple classing on.
  settings: { multiclassChance: number; tripleClassChance: number };
}

interface Character {
  // Who you play: "Custom character", "The Dark Urge", or an origin character's name.
  origin?: string | null;
  abilities?: ClassEntry[];
  darkUrge?: string | null;
  race?: ClassEntry[];
  class?: ClassEntry[];
  // Saves made before feats were tied to levels hold a plain list of names.
  feats?: ClassEntry[] | string[];
  background?: string | ClassEntry[] | null;
  romance?: string | null;
  companionBuild?: ClassEntry[];
}

interface SavedCharacter {
  id: string;
  label: string;
  name?: string;
  character: Character;
}

interface PartyMemberProfile {
  name: string;
  defaultClass: string;
  race: string;
}

interface WeaponPreferences {
  melee: string[];
  ranged: string[];
}

type CardKey = keyof Character;
type GeneratorResult = ClassEntry[] | string[] | string | null;

type MulticlassMode = "never" | "sometimes" | "always";

// The visitor's choices from the Settings panel. Excluded classes and races only apply to their own character.
interface Settings {
  excludedClasses: string[];
  excludedRaces: string[];
  multiclass: MulticlassMode;
  tripleClass: boolean;
  hiddenCards: CardKey[];
  // Roll three companions for the Companion card instead of one.
  party: boolean;
  // Show the Origin card, which can make you the Dark Urge or an origin character like Astarion.
  // Off means you always play a custom character.
  originCharacters: boolean;
}

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
    "Acid Splash", "Blade Ward", "Bone Chill", "Booming Blade", "Bursting Sinew", "Dancing Lights",
    "Fire Bolt", "Friends", "Light", "Mage Hand", "Minor Illusion", "Poison Spray",
    "Ray of Frost", "Shocking Grasp", "Toll the Dead", "True Strike"
  ],

  classes: {
    "Barbarian": {
      skills: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
      skillCount: 2,
      subclasses: ["Berserker", "Wildheart", "Wild Magic", "Path of the Giant"],
      options: {
        "Wildheart": {
          "Bestial Heart": ["Bear", "Eagle", "Elk", "Tiger", "Wolf"],
          "Aspect of the Beast": ["Bear", "Chimpanzee", "Crocodile", "Eagle", "Elk", "Honey Badger", "Stallion", "Tiger", "Wolf", "Wolverine"]
        }
      }
    },
    "Bard": {
      skills: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
      skillCount: 3,
      subclasses: ["College of Lore", "College of Valor", "College of Swords", "College of Glamour"],
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
        "Deity": ["Bahamut", "Corellon Larethian", "Eilistraee", "Garl Glittergold", "Gruumsh", "Helm", "Ilmater", "Kelemvor", "Laduguer", "Lathander", "Lolth", "Mielikki", "Moradin", "Mystra", "Oghma", "Selûne", "Talos", "Tempus", "Tiamat", "Tymora", "Tyr", "Vlaakith", "Yondalla"]
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
        "Fighting Style": ["Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"],
        "Champion": {
          "Second Fighting Style": ["Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"]
        },
        "Battle Master": {
          "Maneuvers": ["Commander's Strike", "Disarming Attack", "Distracting Strike", "Evasive Footwork", "Feinting Attack", "Goading Attack", "Menacing Attack", "Maneuvering Attack", "Pushing Attack", "Precision Attack", "Rally", "Riposte", "Sweeping Attack", "Trip Attack"]
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
        "Fighting Style": ["Defense", "Dueling", "Great Weapon Fighting", "Protection"]
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
        "Favored Enemy": ["Bounty Hunter", "Keeper of the Veil", "Mage Breaker", "Ranger Knight", "Sanctified Stalker"],
        "Fighting Style": ["Archery", "Defense", "Dueling", "Two-Weapon Fighting"],
        "Beast Master": {
          "Ranger's Companion": ["Bear", "Boar", "Dire Raven", "Wolf", "Wolf Spider"]
        },
        "Hunter": {
          "Hunter's Prey": ["Colossus Slayer", "Giant Killer", "Horde Breaker"],
          "Defensive Tactics": ["Escape the Horde", "Multiattack Defense", "Steel Will"],
          "Multiattack": ["Volley", "Whirlwind Attack"]
        }
      }
    },
    "Rogue": {
      skills: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
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
        "Pact Boon": ["Pact of the Blade", "Pact of the Chain", "Pact of the Tome"],
        "Preferred Weapon": ["Battleaxe", "Glaive", "Greatsword", "Rapier", "Trident", "Warhammer"],
        "Preferred Familiar": ["Animal Spirit", "Imp", "Quasit"],
        "Mystic Arcanum": ["Arcane Gate", "Circle of Death", "Create Undead", "Eyebite", "Flesh to Stone"]
      }
    },
    "Wizard": {
      skills: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
      skillCount: 2,
      subclasses: ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation", "Bladesinging"]
    }
  },

  feats: [
    "Ability Improvement", "Actor", "Alert", "Athlete", "Charger", "Crossbow Expert",
    "Defensive Duelist", "Dual Wielder", "Dungeon Delver", "Durable", "Elemental Adept",
    "Great Weapon Master", "Heavily Armored", "Heavy Armor Master", "Lightly Armored",
    "Lucky", "Mage Slayer", "Magic Initiate", "Martial Adept", "Medium Armor Master",
    "Mobile", "Moderately Armored", "Performer", "Polearm Master", "Resilient",
    "Ritual Caster", "Savage Attacker", "Sentinel", "Sharpshooter", "Shield Master",
    "Skilled", "Spell Sniper", "Tavern Brawler", "Tough", "War Caster", "Weapon Master"
  ],

  backgrounds: [
    "Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero",
    "Guild Artisan", "Noble", "Outlander", "Sage", "Soldier", "Urchin",
    "The Haunted One"
  ],

  romances: ["Astarion", "Gale", "Halsin", "Karlach", "Lae'zel", "Minthara", "Shadowheart", "Wyll", "Jaheira", "Minsc", "No One"],

  settings: {
    multiclassChance: 8,
    tripleClassChance: 20
  }
};

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
  Dwarf: {"*": ["Battleaxes", "Handaxes", "Light Hammers", "Warhammers"], "Shield Dwarf": ["Light Armor", "Medium Armor"]},
  Elf: {"*": ["Perception", "Longswords", "Shortswords", "Longbows", "Shortbows"], "Wood Elf": ["Stealth"]},
  Githyanki: {"*": ["Light Armor", "Medium Armor", "Greatswords", "Longswords", "Shortswords"]},
  Gnome: {"Rock Gnome": ["Expertise in History"]},
  "Half-Elf": {"*": ["Light Armor", "Shields", "Pikes", "Spears", "Halberds", "Glaives"]},
  "Half-Orc": {"*": ["Intimidation"]},
  Human: {"*": ["Light Armor", "Shields", "Pikes", "Spears", "Halberds", "Glaives"]}
};

const MULTICLASS_PROFICIENCIES: Record<string, string[]> = {
  Barbarian: ["Shields", "Simple Weapons", "Martial Weapons"],
  Bard: ["Light Armor", "Musical Instruments"],
  Cleric: ["Light Armor", "Medium Armor", "Shields", "Flails", "Morningstars"],
  Druid: ["Light Armor", "Medium Armor", "Shields"],
  Fighter: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
  Monk: ["Simple Weapons", "Shortswords"],
  Paladin: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
  Ranger: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
  Rogue: ["Light Armor"],
  Sorcerer: [],
  Warlock: ["Light Armor", "Simple Weapons"],
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
    "College of Swords": ["Medium Armor", "Scimitars"],
    "College of Valor": ["Medium Armor", "Shields", "Martial Weapons"]
  },
  Cleric: {
    "Death Domain": ["Martial Weapons"],
    Life: ["Heavy Armor"],
    Nature: ["Heavy Armor"],
    Tempest: ["Heavy Armor", "Martial Weapons"],
    War: ["Heavy Armor", "Martial Weapons"]
  },
  Warlock: {
    Hexblade: ["Medium Armor", "Shields", "Martial Weapons"]
  },
  Wizard: {
    Bladesinging: ["Light Armor", "Daggers", "Longswords", "Rapiers", "Scimitars", "Shortswords", "Sickles"]
  }
};

// Skill proficiencies granted by a subclass itself.
const SUBCLASS_SKILLS: Record<string, Record<string, string[]>> = {
  Wizard: {Bladesinging: ["Performance"]}
};

// Levels at which BG3 grants each class its subclass.
const SUBCLASS_LEVELS: Record<string, number> = {
  Barbarian: 3, Bard: 3, Cleric: 1, Druid: 2, Fighter: 3, Monk: 3,
  Paladin: 1, Ranger: 3, Rogue: 3, Sorcerer: 1, Warlock: 1, Wizard: 2
};

const SUBCLASS_LABELS: Record<string, string> = {
  Barbarian: "Barbarian Subclass", Bard: "Bard College", Cleric: "Cleric Domain", Druid: "Druid Circle",
  Fighter: "Fighter Subclass", Monk: "Monastic Tradition", Paladin: "Paladin Oath", Ranger: "Ranger Subclass",
  Rogue: "Rogue Subclass", Sorcerer: "Sorcerer Subclass", Warlock: "Warlock Patron", Wizard: "Wizard School"
};

// Armor a character gets from its starting (first) class.
const CLASS_ARMOR: Record<string, string[]> = {
  Barbarian: ["Light Armor", "Medium Armor", "Shields"],
  Bard: ["Light Armor"],
  Cleric: ["Light Armor", "Medium Armor", "Shields"],
  Druid: ["Light Armor", "Medium Armor", "Shields"],
  Fighter: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
  Monk: [],
  Paladin: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
  Ranger: ["Light Armor", "Medium Armor", "Shields"],
  Rogue: ["Light Armor"],
  Sorcerer: [],
  Warlock: ["Light Armor"],
  Wizard: []
};

// Every class gets a feat at levels 4, 8 and 12; Fighters also at 6, Rogues also at 10.
const FEAT_LEVELS: Record<string, number[]> = {
  Fighter: [4, 6, 8, 12],
  Rogue: [4, 8, 10, 12]
};
const DEFAULT_FEAT_LEVELS = [4, 8, 12];

const FEAT_CHOICES: Record<string, string[]> = {
  "Elemental Adept": ["Acid", "Cold", "Fire", "Lightning", "Thunder"],
  "Magic Initiate": ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"],
  "Resilient": ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]
};

// Armor feats need the armor below them, and are pointless if you already have what they grant.
const FEAT_ARMOR_RULES: Record<string, {requires?: string; grants?: string}> = {
  "Lightly Armored": {grants: "Light Armor"},
  "Moderately Armored": {requires: "Light Armor", grants: "Medium Armor"},
  "Heavily Armored": {requires: "Medium Armor", grants: "Heavy Armor"},
  "Medium Armor Master": {requires: "Medium Armor"},
  "Heavy Armor Master": {requires: "Heavy Armor"}
};

// BG3 has no pact or cantrip prerequisites; Agonizing and Repelling Blast are only offered here
// when the warlock knows Eldritch Blast, since they do nothing without it.
const INVOCATIONS: {name: string; level: number; needsEldritchBlast?: boolean}[] = [
  {name: "Agonizing Blast", level: 2, needsEldritchBlast: true},
  {name: "Armor of Shadows", level: 2},
  {name: "Beast Speech", level: 2},
  {name: "Beguiling Influence", level: 2},
  {name: "Devil's Sight", level: 2},
  {name: "Fiendish Vigor", level: 2},
  {name: "Mask of Many Faces", level: 2},
  {name: "One with Shadows", level: 2},
  {name: "Repelling Blast", level: 2, needsEldritchBlast: true},
  {name: "Thief of Five Fates", level: 2},
  {name: "Mire the Mind", level: 5},
  {name: "Sign of Ill Omen", level: 5},
  {name: "Book of Ancient Secrets", level: 7},
  {name: "Dreadful Word", level: 7},
  {name: "Sculptor of Flesh", level: 7},
  {name: "Minions of Chaos", level: 9},
  {name: "Otherworldly Leap", level: 9},
  {name: "Whispers of the Grave", level: 9},
  {name: "Lifedrinker", level: 12}
];
// New invocations learned at each warlock level (2 at level 2, then one more at 5, 7, 9 and 12).
const INVOCATION_GAINS: [number, number][] = [[2, 2], [5, 1], [7, 1], [9, 1], [12, 1]];

// Deities only some races may follow.
const DEITY_RACES: Record<string, string> = {
  Laduguer: "Duergar",
  Lolth: "Lolth-Sworn Drow",
  Vlaakith: "Githyanki"
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
    spells: ["Animal Friendship", "Bane", "Charm Person", "Cure Wounds", "Disguise Self", "Dissonant Whispers", "Faerie Fire", "Feather Fall", "Healing Word", "Heroism", "Longstrider", "Sleep", "Speak with Animals", "Tasha's Hideous Laughter", "Thunderwave"]
  },
  Cleric: {
    cantripCount: 3,
    cantrips: ["Blade Ward", "Bursting Sinew", "Guidance", "Light", "Produce Flame", "Resistance", "Sacred Flame", "Thaumaturgy", "Toll the Dead"],
    spellCount: 4,
    spellLabel: "Prepared Level 1 Spells",
    spells: ["Bane", "Bless", "Command", "Create or Destroy Water", "Cure Wounds", "Guiding Bolt", "Healing Word", "Inflict Wounds", "Protection from Evil and Good", "Sanctuary", "Shield of Faith"]
  },
  Druid: {
    cantripCount: 2,
    cantrips: ["Guidance", "Poison Spray", "Produce Flame", "Resistance", "Shillelagh", "Thorn Whip"],
    spellCount: 4,
    spellLabel: "Prepared Level 1 Spells",
    spells: ["Animal Friendship", "Charm Person", "Create or Destroy Water", "Cure Wounds", "Enhance Leap", "Entangle", "Faerie Fire", "Fog Cloud", "Goodberry", "Healing Word", "Ice Knife", "Longstrider", "Speak with Animals", "Thunderwave"]
  },
  Sorcerer: {
    cantripCount: 4,
    cantrips: ["Acid Splash", "Blade Ward", "Bone Chill", "Booming Blade", "Bursting Sinew", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Minor Illusion", "Poison Spray", "Ray of Frost", "Shocking Grasp", "True Strike"],
    spellCount: 2,
    spells: ["Burning Hands", "Charm Person", "Chromatic Orb", "Color Spray", "Disguise Self", "Enhance Leap", "Expeditious Retreat", "False Life", "Feather Fall", "Fog Cloud", "Ice Knife", "Mage Armor", "Magic Missile", "Ray of Sickness", "Shield", "Sleep", "Thunderwave", "Witch Bolt"]
  },
  Warlock: {
    cantripCount: 2,
    cantrips: ["Blade Ward", "Bone Chill", "Booming Blade", "Eldritch Blast", "Friends", "Mage Hand", "Minor Illusion", "Poison Spray", "Toll the Dead", "True Strike"],
    spellCount: 2,
    spells: ["Armor of Agathys", "Arms of Hadar", "Charm Person", "Expeditious Retreat", "Hellish Rebuke", "Hex", "Protection from Evil and Good", "Witch Bolt"]
  },
  Wizard: {
    cantripCount: 3,
    cantrips: ["Acid Splash", "Blade Ward", "Bone Chill", "Booming Blade", "Bursting Sinew", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Minor Illusion", "Poison Spray", "Ray of Frost", "Shocking Grasp", "Toll the Dead", "True Strike"],
    spellCount: 6,
    spellLabel: "Level 1 Spellbook Picks",
    spells: ["Burning Hands", "Charm Person", "Chromatic Orb", "Color Spray", "Disguise Self", "Enhance Leap", "Expeditious Retreat", "False Life", "Feather Fall", "Find Familiar", "Fog Cloud", "Grease", "Ice Knife", "Longstrider", "Mage Armor", "Magic Missile", "Protection from Evil and Good", "Ray of Sickness", "Shield", "Sleep", "Tasha's Hideous Laughter", "Thunderwave", "Witch Bolt"]
  }
};

const CUSTOM_ORIGIN = "Custom character";
const DARK_URGE_ORIGIN = "The Dark Urge";
const DARK_URGE_BACKGROUND = "The Haunted One";

// Playable origin characters: race and background are fixed, but you can pick any class.
const ORIGIN_CHARACTERS: Record<string, {race: string; subrace?: string; background: string}> = {
  Astarion: {race: "Elf", subrace: "High Elf", background: "Charlatan"},
  Gale: {race: "Human", background: "Sage"},
  Karlach: {race: "Tiefling", subrace: "Zariel Tiefling", background: "Outlander"},
  "Lae'zel": {race: "Githyanki", background: "Soldier"},
  Shadowheart: {race: "Half-Elf", subrace: "High Half-Elf", background: "Acolyte"},
  Wyll: {race: "Human", background: "Folk Hero"}
};

// Percent chances for who you play; the rest of the origin chance is split between the origin characters.
const ORIGIN_CHANCES = {custom: 45, darkUrge: 15};

// Companions who can't travel together in an ordinary playthrough.
const COMPANION_CONFLICTS: [string, string][] = [["Halsin", "Minthara"]];
const PARTY_SIZE = 3;

const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];

// Point-buy spreads worth 27 points (8 costs 0, 15 costs 9), highest first. They are handed out in
// the class's priority order, then the racial +2 and +1 go to the top two.
const POINT_BUY_SPREADS = [
  [15, 15, 14, 10, 8, 8],
  [15, 15, 13, 12, 8, 8],
  [15, 14, 14, 12, 8, 8],
  [15, 14, 13, 12, 10, 8]
];

// Which abilities each class wants most, first to last.
const CLASS_ABILITY_PRIORITY: Record<string, string[]> = {
  Barbarian: ["Strength", "Constitution", "Dexterity", "Wisdom", "Charisma", "Intelligence"],
  Bard: ["Charisma", "Dexterity", "Constitution", "Wisdom", "Intelligence", "Strength"],
  Cleric: ["Wisdom", "Constitution", "Dexterity", "Strength", "Charisma", "Intelligence"],
  Druid: ["Wisdom", "Constitution", "Dexterity", "Intelligence", "Charisma", "Strength"],
  Fighter: ["Strength", "Constitution", "Dexterity", "Wisdom", "Charisma", "Intelligence"],
  Monk: ["Dexterity", "Wisdom", "Constitution", "Strength", "Intelligence", "Charisma"],
  Paladin: ["Strength", "Charisma", "Constitution", "Wisdom", "Dexterity", "Intelligence"],
  Ranger: ["Dexterity", "Wisdom", "Constitution", "Strength", "Intelligence", "Charisma"],
  Rogue: ["Dexterity", "Constitution", "Wisdom", "Intelligence", "Charisma", "Strength"],
  Sorcerer: ["Charisma", "Constitution", "Dexterity", "Wisdom", "Intelligence", "Strength"],
  Warlock: ["Charisma", "Constitution", "Dexterity", "Wisdom", "Intelligence", "Strength"],
  Wizard: ["Intelligence", "Constitution", "Dexterity", "Wisdom", "Charisma", "Strength"]
};

// Subclasses that change what a class needs: heavy-armor clerics use Strength over Dexterity,
// and the spellcasting fighter and rogue want Intelligence third.
const HEAVY_ARMOR_DOMAINS = ["Life", "Nature", "Tempest", "War"];
const INTELLIGENCE_SUBCLASSES = ["Eldritch Knight", "Arcane Trickster"];

const COMPANION_DEFAULT_CLASSES: Record<string, string> = {
  Astarion: "Rogue",
  Gale: "Wizard",
  Halsin: "Druid",
  Karlach: "Barbarian",
  "Lae'zel": "Fighter",
  Minthara: "Paladin",
  Shadowheart: "Cleric",
  Wyll: "Warlock",
  Jaheira: "Druid",
  Minsc: "Ranger"
};

const COMPANION_RACES: Record<string, string> = {
  Astarion: "High Elf",
  Gale: "Human",
  Halsin: "Wood Elf",
  Karlach: "Zariel Tiefling",
  "Lae'zel": "Githyanki",
  Minthara: "Lolth-Sworn Drow",
  Shadowheart: "High Half-Elf",
  Wyll: "Human",
  Jaheira: "High Half-Elf",
  Minsc: "Human"
};

const BASE_HIRELINGS: PartyMemberProfile[] = [
  {name: "Brinna Brightsong", defaultClass: "Bard", race: "Lightfoot Halfling"},
  {name: "Danton", defaultClass: "Druid", race: "Mephistopheles Tiefling"},
  {name: "Eldra Luthrinn", defaultClass: "Barbarian", race: "Gold Dwarf"},
  {name: "Sir Fuzzalump", defaultClass: "Wizard", race: "Rock Gnome"},
  {name: "Jacelyn", defaultClass: "Sorcerer", race: "High Half-Elf"},
  {name: "Kerz", defaultClass: "Paladin", race: "Half-Orc"},
  {name: "Kree Derryck", defaultClass: "Warlock", race: "Duergar"},
  {name: "Maddala Deadeye", defaultClass: "Rogue", race: "Human"},
  {name: "Sina'zith", defaultClass: "Monk", race: "Githyanki"},
  {name: "Varanna Sunblossom", defaultClass: "Fighter", race: "Wood Half-Elf"},
  {name: "Ver'yll Wenkiir", defaultClass: "Ranger", race: "Seldarine Drow"},
  {name: "Zenith Feur'sel", defaultClass: "Cleric", race: "High Elf"}
];

// Melee weapons that suit a fighting style, for classes that pick one.
const FIGHTING_STYLE_WEAPONS: Record<string, string[]> = {
  "Great Weapon Fighting": ["Greatsword", "Greataxe", "Maul", "Glaive", "Halberd"],
  "Dueling": ["Longsword", "Rapier", "Warhammer", "Scimitar"],
  "Two-Weapon Fighting": ["Shortsword", "Scimitar", "Rapier", "Dagger"],
  "Protection": ["Longsword", "Warhammer", "Morningstar"]
};

const BARD_BLADES = ["Rapier", "Longsword", "Shortsword", "Scimitar", "Dagger"];

const WEAPON_PREFERENCES: Record<string, WeaponPreferences> = {
  Barbarian: {melee: ["Greataxe", "Greatsword", "Maul"], ranged: ["Longbow", "Heavy Crossbow"]},
  Bard: {melee: ["Rapier", "Shortsword", "Longsword"], ranged: ["Shortbow", "Hand Crossbow"]},
  Cleric: {melee: ["Mace", "Morningstar", "Flail", "Quarterstaff"], ranged: ["Light Crossbow", "Shortbow"]},
  Druid: {melee: ["Quarterstaff", "Scimitar", "Sickle", "Spear"], ranged: ["Javelin"]},
  Fighter: {melee: ["Greatsword", "Longsword", "Greataxe"], ranged: ["Longbow", "Heavy Crossbow"]},
  Monk: {melee: ["Quarterstaff", "Shortsword", "Spear"], ranged: ["Shortbow", "Light Crossbow"]},
  Paladin: {melee: ["Greatsword", "Longsword", "Warhammer"], ranged: ["Longbow", "Heavy Crossbow"]},
  Ranger: {melee: ["Longsword", "Shortsword", "Scimitar"], ranged: ["Longbow", "Hand Crossbow"]},
  Rogue: {melee: ["Shortsword", "Rapier", "Dagger"], ranged: ["Hand Crossbow", "Shortbow"]},
  Sorcerer: {melee: ["Quarterstaff", "Dagger"], ranged: ["Light Crossbow"]},
  Warlock: {melee: ["Quarterstaff", "Dagger", "Mace"], ranged: ["Light Crossbow", "Shortbow"]},
  Wizard: {melee: ["Quarterstaff", "Dagger"], ranged: ["Light Crossbow"]}
};
