"use strict";

const SAVED_CHARACTERS_KEY = "bg3-character-generator-saved-results";
// Page order; the grid in styles.css places each card by its card-<key> class.
const cardOrder: CardKey[] = ["class", "race", "background", "feats", "darkUrge", "romance", "companionBuild"];

const definitions: Record<CardKey, { title: string; roll: () => GeneratorResult }> = {
  darkUrge: {title: "Should I accept the tadpole?", roll: rollDarkUrge},
  race: {title: "Race", roll: rollRace},
  class: {title: "Class", roll: rollClass},
  feats: {title: "Feats", roll: () => rollFeats()},
  background: {title: "Background", roll: rollBackground},
  romance: {title: "Romance", roll: rollRomance},
  companionBuild: {title: "Companion Build", roll: rollCompanionBuild}
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
    } else if (key === "feats") {
      character.feats = rollFeats();
    } else {
      character = {...character, [key]: definitions[key].roll()} as Character;
    }
  }

  // Locked feats survive a new class, trimmed or topped up to the new number of feat levels.
  if (targets.has("class") && !targets.has("feats")) {
    character.feats = rollFeats(featValues());
  }

  rolledCards = targets;
  renderCards();
}

function normalizeResult(value: unknown): ClassEntry[] {
  if (Array.isArray(value)) return value;
  return [{label: "", value: value as string | null}];
}

// Feats follow the class levels, and race and class decide which armour feats are allowed.
function reroll(key: CardKey): void {
  if (key === "race") rollCards(["race", "background", "class", "feats"]);
  else if (key === "background") rollCards(["background", "class", "feats"]);
  else if (key === "class") rollCards(["class", "feats"]);
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
  const classLevels = getClassLevels(saved.class);
  const classes = classLevels
    .map(({className, level}) => classLevels.length > 1 ? `${className} ${level}` : className)
    .join(" / ");
  return [race, classes].filter(Boolean).join(" · ") || "Character";
}

function savedTitle(item: SavedCharacter): string {
  return item.name || describeCharacter(item.character);
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
    const title = savedTitle(item);
    const li = document.createElement("li");
    li.className = "saved-item";
    li.dataset.id = item.id;

    const load = document.createElement("button");
    load.className = "saved-load";
    load.dataset.load = item.id;
    const name = document.createElement("span");
    name.className = "saved-title";
    name.textContent = title;
    const meta = document.createElement("span");
    meta.className = "saved-meta";
    // A named build still shows what it is under the name.
    meta.textContent = item.name ? `${describeCharacter(item.character)} · ${savedDate(item)}` : savedDate(item);
    load.append(name, meta);

    const rename = document.createElement("button");
    rename.className = "saved-rename";
    rename.dataset.rename = item.id;
    rename.setAttribute("aria-label", `Rename ${title}`);
    rename.textContent = "Rename";

    const remove = document.createElement("button");
    remove.className = "saved-delete";
    remove.dataset.delete = item.id;
    remove.setAttribute("aria-label", `Delete ${title}`);
    remove.textContent = "×";

    li.append(load, rename, remove);
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

function startRename(id: string): void {
  const item = getSavedCharacters().find(saved => saved.id === id);
  const li = document.querySelector<HTMLElement>(`.saved-item[data-id="${CSS.escape(id)}"]`);
  const load = li?.querySelector<HTMLButtonElement>(".saved-load");
  if (!item || !li || !load) return;

  const input = document.createElement("input");
  input.className = "saved-name-input";
  input.value = item.name ?? "";
  input.placeholder = describeCharacter(item.character);
  input.maxLength = 60;
  input.setAttribute("aria-label", "Build name");
  load.replaceWith(input);
  li.querySelector<HTMLButtonElement>(".saved-rename")!.hidden = true;
  input.focus();
  input.select();

  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    if (save) renameCharacter(id, input.value);
    else renderSavedCharacters();
  };
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") finish(true);
    else if (event.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

// An empty name goes back to the automatic race and class description.
function renameCharacter(id: string, name: string): void {
  try {
    const saved = getSavedCharacters().map(item => {
      if (item.id !== id) return item;
      const {name: _old, ...rest} = item;
      return name.trim() ? {...rest, name: name.trim()} : rest;
    });
    localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
    setSaveNotice("Build renamed.");
  } catch {
    setSaveNotice("Could not rename the saved build.");
  }
  renderSavedCharacters();
  document.querySelector<HTMLButtonElement>(`.saved-item[data-id="${CSS.escape(id)}"] .saved-rename`)?.focus();
}

function deleteCharacter(id: string): void {
  const item = getSavedCharacters().find(saved => saved.id === id);
  if (!item || !confirm(`Delete "${savedTitle(item)}"?`)) return;

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

function renderCards(): void {
  const host = document.getElementById("cards") as HTMLElement;
  let rollIndex = 0;
  host.innerHTML = cardOrder.map(key => {
    const def = definitions[key];
    const value = character[key];
    const isMulticlass = key === "class" &&
      normalizeResult(value).filter(entry => entry.label === "Class").length > 1;
    const locked = isLocked(key);
    const lockedByCompanion = isLockedByCompanion(key);
    const lockLabel = lockedByCompanion
      ? `${def.title} is kept because Companion Build is locked`
      : `Lock ${def.title}`;
    const classes = ["card", `card-${key}`];
    if (isMulticlass) classes.push("card-multiclass");
    if (locked) classes.push("is-locked");
    if (rolledCards.has(key)) classes.push("card-rolled");
    let content = "";

    if (key === "class" || key === "race") {
      let classCount = 0;
      const entries = normalizeResult(value);
      content = entries.map((entry, index) => {
        if (entry.label === "Level") return "";
        // Show each class with its level, e.g. "Sorcerer, level 8".
        const level = entries[index + 1]?.label === "Level" ? entries[index + 1].value : null;
        const shown = key === "class" && entry.label === "Class" && level ? {...entry, value: `${entry.value}, level ${level}`} : entry;
        if (key === "class" && entry.label === "Class" && ++classCount === 2) {
          return `<div class="class-divider">Second class</div>${entryHTML({...shown, label: ""})}`;
        }
        return entryHTML(shown);
      }).join("");
    } else if (key === "companionBuild") {
      content = normalizeResult(value).map(entryHTML).join("");
    } else if (key === "background") {
      content = normalizeResult(value).map(entryHTML).join("");
    } else if (key === "feats") {
      const feats = (value || []) as ClassEntry[] | string[];
      content = feats.length && typeof feats[0] === "string"
        ? entryHTML({label: "", value: feats as string[]})
        : feats.length
          ? (feats as ClassEntry[]).map(entryHTML).join("")
          : entryHTML({label: "", value: "No feats before level 4"});
    } else {
      content = entryHTML({label: "", value: value as string | null});
    }

    return `<article class="${classes.join(" ")}"${rolledCards.has(key) ? ` style="--roll-index: ${rollIndex++}"` : ""}>
      <div class="card-head">
        <h2>${escapeHTML(def.title)}</h2>
        ${isMulticlass ? '<span class="multiclass-badge">Multiclass</span>' : ""}
        <div class="card-actions">
          <button class="text-button lock-button" data-lock="${key}" aria-pressed="${locked}" aria-label="${escapeHTML(lockLabel)}" title="${escapeHTML(lockLabel)}"${lockedByCompanion ? " disabled" : ""}>${locked ? "Locked" : "Lock"}</button>
          <button class="text-button reroll-button" data-reroll="${key}" aria-label="Reroll ${escapeHTML(def.title)}"${locked ? " disabled" : ""}>Reroll</button>
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
  else if (button?.dataset.rename) startRename(button.dataset.rename);
  else if (button?.dataset.delete) deleteCharacter(button.dataset.delete);
});

generateAll();
renderSavedCharacters();
