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

const SETTINGS_KEY = "bg3-character-generator-settings";
const SITE_URL = "https://thefallz.github.io/BG3CharacterGenerator/";
// Share links look like "#build=<code>", or "#Karlach-Tank&build=<code>" for a named build.
const SHARE_PATTERN = /^#(?:([^&]*)&)?build=(.+)$/;
const MAX_NAME_LENGTH = 60;

// The build on screen keeps a name while it is a saved build or came from a named link;
// any roll makes it a new, unnamed build.
let currentSavedId: string | null = null;
let sharedName: string | null = null;

function currentBuildName(): string | null {
  if (currentSavedId) return getSavedCharacters().find(item => item.id === currentSavedId)?.name ?? null;
  return sharedName;
}

// Spaces become hyphens so the name reads cleanly in the link; real hyphens stay encoded.
function nameToSlug(name: string): string {
  return encodeURIComponent(name.replace(/-/g, "%2D")).replace(/%252D/g, "%2D").replace(/%20/g, "-");
}

function slugToName(slug: string): string | null {
  try {
    const name = decodeURIComponent(slug.replace(/-/g, "%20")).trim().slice(0, MAX_NAME_LENGTH);
    return name || null;
  } catch {
    return null;
  }
}
// Story cards a visitor can hide; the build cards always show.
const HIDEABLE_CARDS: {key: CardKey; label: string}[] = [
  {key: "romance", label: "Romance"},
  {key: "darkUrge", label: "Tadpole choice"},
  {key: "companionBuild", label: "Companion build"}
];
const MULTICLASS_MODES: {mode: MulticlassMode; label: string}[] = [
  {mode: "never", label: "Never"},
  {mode: "sometimes", label: "Sometimes"},
  {mode: "always", label: "Always"}
];

function loadSettings(): Settings {
  const defaults = defaultSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const strings = (value: unknown, known: string[]) =>
      Array.isArray(value) ? value.filter((item): item is string => known.includes(item)) : [];
    return {
      excludedClasses: strings(saved.excludedClasses, Object.keys(data.classes)),
      excludedRaces: strings(saved.excludedRaces, Object.keys(data.races)),
      multiclass: MULTICLASS_MODES.some(({mode}) => mode === saved.multiclass) ? saved.multiclass : defaults.multiclass,
      tripleClass: saved.tripleClass === true,
      hiddenCards: strings(saved.hiddenCards, HIDEABLE_CARDS.map(({key}) => key)) as CardKey[]
    };
  } catch {
    return defaults;
  }
}

function storeSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings still apply for this visit without storage.
  }
}

function visibleCards(): CardKey[] {
  return cardOrder.filter(key => !settings.hiddenCards.includes(key));
}

function checkboxHTML(name: string, value: string, label: string, checked: boolean): string {
  return `<label class="check"><input type="checkbox" name="${name}" value="${escapeHTML(value)}"${checked ? " checked" : ""}> ${escapeHTML(label)}</label>`;
}

function renderSettings(): void {
  const panel = document.getElementById("settingsPanel") as HTMLElement;
  panel.innerHTML = `
    <fieldset class="settings-group">
      <legend>Multiclass</legend>
      <div class="segmented">
        ${MULTICLASS_MODES.map(({mode, label}) => `<label><input type="radio" name="multiclass" value="${mode}"${settings.multiclass === mode ? " checked" : ""}><span>${label}</span></label>`).join("")}
      </div>
      <label class="check"><input type="checkbox" name="tripleClass"${settings.tripleClass ? " checked" : ""}> Allow triple classing</label>
      <p class="settings-note">"Sometimes" is a ${data.settings.multiclassChance}% chance. With triple classing on, ${data.settings.tripleClassChance}% of multiclass builds get three classes.</p>
    </fieldset>
    <fieldset class="settings-group">
      <legend>Show cards</legend>
      ${HIDEABLE_CARDS.map(({key, label}) => checkboxHTML("showCard", key, label, !settings.hiddenCards.includes(key))).join("")}
    </fieldset>
    <fieldset class="settings-group settings-list">
      <legend>Classes</legend>
      ${Object.keys(data.classes).map(name => checkboxHTML("class", name, name, !settings.excludedClasses.includes(name))).join("")}
    </fieldset>
    <fieldset class="settings-group settings-list">
      <legend>Races</legend>
      ${Object.keys(data.races).map(name => checkboxHTML("race", name, name, !settings.excludedRaces.includes(name))).join("")}
    </fieldset>
    <div class="settings-foot">
      <p class="settings-note">Class, race and multiclass changes apply the next time you generate or reroll.</p>
      <button type="button" id="resetSettings">Reset to defaults</button>
    </div>`;
  updateSettingsControls();
}

// Keeps at least one class and race checked, and turns off triple classing where it can't happen.
function updateSettingsControls(): void {
  const panel = document.getElementById("settingsPanel") as HTMLElement;
  for (const name of ["class", "race"]) {
    const boxes = [...panel.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)];
    const checked = boxes.filter(box => box.checked);
    boxes.forEach(box => { box.disabled = checked.length === 1 && box.checked; });
  }
  const triple = panel.querySelector<HTMLInputElement>('input[name="tripleClass"]')!;
  triple.disabled = settings.multiclass === "never" || allowedClasses().length < 3;
}

function readSettings(): void {
  const panel = document.getElementById("settingsPanel") as HTMLElement;
  const unchecked = (name: string) =>
    [...panel.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:not(:checked)`)].map(box => box.value);
  settings = {
    excludedClasses: unchecked("class"),
    excludedRaces: unchecked("race"),
    multiclass: (panel.querySelector<HTMLInputElement>('input[name="multiclass"]:checked')?.value ?? "sometimes") as MulticlassMode,
    tripleClass: panel.querySelector<HTMLInputElement>('input[name="tripleClass"]')!.checked,
    hiddenCards: unchecked("showCard") as CardKey[]
  };
  storeSettings();
  updateSettingsControls();
  renderCards();
}

function toggleSettings(): void {
  const panel = document.getElementById("settingsPanel") as HTMLElement;
  const button = document.getElementById("settingsToggle") as HTMLButtonElement;
  panel.hidden = !panel.hidden;
  button.setAttribute("aria-expanded", String(!panel.hidden));
}

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
  currentSavedId = null;
  sharedName = null;
  clearSharedBuildLink();
  renderCards();
}

function normalizeResult(value: unknown): ClassEntry[] {
  if (Array.isArray(value)) return value;
  return [{label: "", value: value as string | null}];
}

// Feats follow the class levels, and race and class decide which armor feats are allowed.
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

// A named build gets a title over the cards; unnamed builds don't.
function renderBuildTitle(): void {
  const header = document.getElementById("buildTitle") as HTMLElement;
  const name = currentBuildName();
  header.hidden = !name;
  if (!name) return;
  (document.getElementById("buildName") as HTMLElement).textContent = name;
  (document.getElementById("buildSummary") as HTMLElement).textContent = describeCharacter(character);
}

function renderSavedCharacters(): void {
  renderBuildTitle();
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
  // A build opened from a named link keeps its name when saved.
  const name = currentBuildName();
  saved.unshift({
    id,
    label: `${describeCharacter(character)} · ${savedAt.toLocaleString()}`,
    ...(name ? {name} : {}),
    character: structuredClone(character)
  });

  try {
    localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
    currentSavedId = id;
    sharedName = null;
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
  currentSavedId = id;
  sharedName = null;
  clearSharedBuildLink();
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
  input.maxLength = MAX_NAME_LENGTH;
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

// Asks on the page rather than with confirm(), which some in-app browsers block.
function askToDelete(id: string): void {
  const item = getSavedCharacters().find(saved => saved.id === id);
  const li = document.querySelector<HTMLElement>(`.saved-item[data-id="${CSS.escape(id)}"]`);
  if (!item || !li) return;

  const question = document.createElement("span");
  question.className = "saved-confirm";
  question.textContent = `Delete "${savedTitle(item)}"?`;
  const yes = document.createElement("button");
  yes.className = "saved-confirm-yes";
  yes.dataset.confirmDelete = id;
  yes.textContent = "Delete";
  const no = document.createElement("button");
  no.className = "saved-confirm-no";
  no.dataset.cancelDelete = id;
  no.textContent = "Keep";
  li.replaceChildren(question, yes, no);
  li.addEventListener("keydown", event => {
    if (event.key === "Escape") cancelDelete(id);
  });
  no.focus();
}

function cancelDelete(id: string): void {
  renderSavedCharacters();
  document.querySelector<HTMLButtonElement>(`.saved-item[data-id="${CSS.escape(id)}"] .saved-delete`)?.focus();
}

function deleteCharacter(id: string): void {
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

// What a card shows, shared by the page and the copied text. Each class carries its level, e.g. "Sorcerer, level 8".
function cardEntries(key: CardKey): ClassEntry[] {
  const value = character[key];
  if (key === "class" || key === "race") {
    const entries = normalizeResult(value);
    return entries.flatMap((entry, index) => {
      if (entry.label === "Level") return [];
      const level = entries[index + 1]?.label === "Level" ? entries[index + 1].value : null;
      return key === "class" && entry.label === "Class" && level ? [{...entry, value: `${entry.value}, level ${level}`}] : [entry];
    });
  }
  if (key === "feats") {
    const feats = (value || []) as ClassEntry[] | string[];
    if (!feats.length) return [{label: "", value: "No feats before level 4"}];
    return typeof feats[0] === "string" ? [{label: "", value: feats as string[]}] : feats as ClassEntry[];
  }
  if (key === "companionBuild" || key === "background") return normalizeResult(value);
  return [{label: "", value: value as string | null}];
}

function isEntryList(value: unknown): value is ClassEntry[] {
  return Array.isArray(value) && value.every(entry =>
    typeof entry === "object" && entry !== null &&
    typeof entry.label === "string" &&
    (entry.value === null || typeof entry.value === "string" ||
      Array.isArray(entry.value) && entry.value.every((item: unknown) => typeof item === "string"))
  );
}

// Rebuilds a character from untrusted data (a shared link), keeping only well-formed fields.
function sanitizeCharacter(value: unknown): Character | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  if (!isEntryList(input.class) || !isEntryList(input.race)) return null;
  const text = (item: unknown) => typeof item === "string" ? item : null;
  const result: Character = {class: input.class, race: input.race, darkUrge: text(input.darkUrge), romance: text(input.romance)};
  if (isEntryList(input.feats)) result.feats = input.feats;
  else if (Array.isArray(input.feats) && input.feats.every(item => typeof item === "string")) result.feats = input.feats;
  if (isEntryList(input.background) || typeof input.background === "string") result.background = input.background;
  if (isEntryList(input.companionBuild)) result.companionBuild = input.companionBuild;
  return result;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

// Links hold the whole build, compressed where the browser supports it ("z"), or plain JSON ("j").
async function encodeBuild(build: Character): Promise<string> {
  const json = JSON.stringify(build);
  if (typeof CompressionStream === "function") {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return "z" + toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  return "j" + toBase64Url(new TextEncoder().encode(json));
}

async function decodeBuild(code: string): Promise<Character | null> {
  try {
    const bytes = fromBase64Url(code.slice(1));
    let json: string;
    if (code[0] === "z") {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      json = await new Response(stream).text();
    } else if (code[0] === "j") {
      json = new TextDecoder().decode(bytes);
    } else {
      return null;
    }
    return sanitizeCharacter(JSON.parse(json));
  } catch {
    return null;
  }
}

// Links point at this page when it's served over the web, and at the live site when opened from disk.
async function shareLink(): Promise<string> {
  const base = location.protocol.startsWith("http") ? location.origin + location.pathname : SITE_URL;
  const name = currentBuildName();
  return `${base}#${name ? `${nameToSlug(name)}&` : ""}build=${await encodeBuild(character)}`;
}

// A new roll no longer matches the shared build in the address bar.
function clearSharedBuildLink(): void {
  if (!SHARE_PATTERN.test(location.hash)) return;
  history.replaceState(null, "", location.pathname + location.search);
  setSaveNotice("");
}

async function loadSharedBuild(): Promise<boolean> {
  const match = SHARE_PATTERN.exec(location.hash);
  if (!match) return false;
  const shared = await decodeBuild(match[2]);
  if (!shared) {
    setSaveNotice("That build link couldn't be read.");
    return false;
  }
  character = shared;
  if (!character.companionBuild) character.companionBuild = rollCompanionBuild(character.romance);
  currentSavedId = null;
  sharedName = match[1] ? slugToName(match[1]) : null;
  rolledCards = new Set(cardOrder);
  renderCards();
  setSaveNotice("Shared build loaded.");
  return true;
}

async function copyToClipboard(text: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    hideCopyBox();
    setSaveNotice(message);
  } catch {
    // Clipboard access can be blocked; show the text on the page to copy by hand.
    showCopyBox(text);
  }
}

function showCopyBox(text: string): void {
  const box = document.getElementById("copyBox") as HTMLElement;
  const field = document.getElementById("copyField") as HTMLTextAreaElement;
  field.value = text;
  field.rows = Math.min(12, text.split("\n").length + 1);
  box.hidden = false;
  setSaveNotice("");
  field.focus();
  field.select();
}

function hideCopyBox(): void {
  (document.getElementById("copyBox") as HTMLElement).hidden = true;
}

async function copyShareLink(): Promise<void> {
  await copyToClipboard(await shareLink(), "Build link copied.");
}

// Markdown-friendly text for Reddit and Discord: a bold heading per card and a bullet per entry.
async function copyBuildText(): Promise<void> {
  const name = currentBuildName();
  const lines = name
    ? [`**${name}**`, describeCharacter(character), ""]
    : [`**${describeCharacter(character)}**`, ""];
  for (const key of visibleCards()) {
    lines.push(`**${definitions[key].title}**`, "");
    for (const entry of cardEntries(key)) {
      const value = Array.isArray(entry.value) ? entry.value.join(", ") : entry.value ?? "Not available";
      lines.push(`- ${entry.label ? `${entry.label}: ` : ""}${value}`);
    }
    lines.push("");
  }
  lines.push(`[Open this build in the BG3 Character Generator](${await shareLink()})`);
  await copyToClipboard(lines.join("\n"), "Build text copied.");
}

// Grid areas for the visible cards, so hiding a story card doesn't leave a gap.
function gridAreas(columns: 2 | 3, visible: CardKey[]): string {
  const story = (["darkUrge", "romance"] as CardKey[]).filter(key => visible.includes(key));
  const companion = visible.includes("companionBuild");
  const row = (...cells: string[]) => `"${cells.join(" ")}"`;
  const rows: string[] = [];

  if (columns === 2) {
    rows.push(row("class", "class"), row("race", "background"), row("feats", "feats"));
    if (story.length === 2) rows.push(row(story[0], story[1]));
    else if (story.length === 1) rows.push(row(story[0], story[0]));
    if (companion) rows.push(row("companionBuild", "companionBuild"));
    return rows.join(" ");
  }

  rows.push(row("class", "class", "class"), row("race", "background", "feats"));
  if (companion) {
    if (story.length) story.forEach(key => rows.push(row(key, "companionBuild", "companionBuild")));
    else rows.push(row("companionBuild", "companionBuild", "companionBuild"));
  } else if (story.length === 2) {
    rows.push(row(story[0], story[0], story[1]));
  } else if (story.length === 1) {
    rows.push(row(story[0], story[0], story[0]));
  }
  return rows.join(" ");
}

const CLASS_DIVIDERS = ["", "Second class", "Third class"];

function renderCards(): void {
  renderBuildTitle();
  const host = document.getElementById("cards") as HTMLElement;
  const visible = visibleCards();
  host.style.setProperty("--areas-2", gridAreas(2, visible));
  host.style.setProperty("--areas-3", gridAreas(3, visible));
  let rollIndex = 0;
  host.innerHTML = visible.map(key => {
    const def = definitions[key];
    const value = character[key];
    const classCount = key === "class" ? normalizeResult(value).filter(entry => entry.label === "Class").length : 0;
    const isMulticlass = classCount > 1;
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
      let classIndex = 0;
      content = cardEntries(key).map(entry => {
        if (key === "class" && entry.label === "Class" && classIndex++ > 0) {
          return `<div class="class-divider">${CLASS_DIVIDERS[classIndex - 1] ?? "Next class"}</div>${entryHTML({...entry, label: ""})}`;
        }
        return entryHTML(entry);
      }).join("");
    } else {
      content = cardEntries(key).map(entryHTML).join("");
    }

    return `<article class="${classes.join(" ")}"${rolledCards.has(key) ? ` style="--roll-index: ${rollIndex++}"` : ""}>
      <div class="card-head">
        <h2>${escapeHTML(def.title)}</h2>
        ${isMulticlass ? `<span class="multiclass-badge">${classCount > 2 ? "Triple class" : "Multiclass"}</span>` : ""}
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
document.getElementById("shareLink")!.addEventListener("click", copyShareLink);
document.getElementById("copyText")!.addEventListener("click", copyBuildText);
document.getElementById("settingsToggle")!.addEventListener("click", toggleSettings);
document.getElementById("settingsPanel")!.addEventListener("change", readSettings);
document.getElementById("settingsPanel")!.addEventListener("click", event => {
  if ((event.target as HTMLElement).id !== "resetSettings") return;
  settings = defaultSettings();
  storeSettings();
  renderSettings();
  renderCards();
});
window.addEventListener("hashchange", loadSharedBuild);
document.getElementById("copyClose")!.addEventListener("click", hideCopyBox);
document.getElementById("savedCharacters")!.addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (button?.dataset.load) loadCharacter(button.dataset.load);
  else if (button?.dataset.rename) startRename(button.dataset.rename);
  else if (button?.dataset.delete) askToDelete(button.dataset.delete);
  else if (button?.dataset.confirmDelete) deleteCharacter(button.dataset.confirmDelete);
  else if (button?.dataset.cancelDelete) cancelDelete(button.dataset.cancelDelete);
});

settings = loadSettings();
renderSettings();
renderSavedCharacters();
loadSharedBuild().then(loaded => { if (!loaded) generateAll(); });
