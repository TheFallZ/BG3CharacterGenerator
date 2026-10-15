"use strict";

// Shared by every page: storage, saved builds, share links and the copy helpers.
// Loaded after generator.js and before the page's own script.

const SAVED_CHARACTERS_KEY = "bg3-character-generator-saved-results";
const SETTINGS_KEY = "bg3-character-generator-settings";
const LOCKED_CARDS_KEY = "bg3-character-generator-locked-cards";
// The build on the Generator page, kept for this tab so visiting another page and coming back keeps it.
const CURRENT_BUILD_KEY = "bg3-character-generator-current";
const SITE_URL = "https://thefallz.github.io/BG3CharacterGenerator/";
// Share links look like "#build=<code>", or "#Karlach-Tank&build=<code>" for a named build.
const SHARE_PATTERN = /^#(?:([^&]*)&)?build=(.+)$/;
const MAX_NAME_LENGTH = 60;

// Page order; the grid in styles.css places each card by its card-<key> class.
const cardOrder: CardKey[] = ["class", "race", "background", "feats", "darkUrge", "romance", "companionBuild"];

const CARD_TITLES: Record<CardKey, string> = {
  class: "Class",
  race: "Race",
  background: "Background",
  feats: "Feats",
  darkUrge: "Should I accept the tadpole?",
  romance: "Romance",
  companionBuild: "Companion Build"
};

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

interface CurrentBuild {
  character: Character;
  savedId: string | null;
  sharedName: string | null;
}

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

// Throws when storage is full or blocked, so callers can say so.
function storeSavedCharacters(saved: SavedCharacter[]): void {
  localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
  updateNav();
}

function storeCurrentBuild(current: CurrentBuild): void {
  try {
    sessionStorage.setItem(CURRENT_BUILD_KEY, JSON.stringify(current));
  } catch {
    // Without storage the Generator page just rolls a new build next time.
  }
}

function loadCurrentBuild(): CurrentBuild | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CURRENT_BUILD_KEY) || "null");
    const build = sanitizeCharacter(stored?.character);
    if (!build) return null;
    return {
      character: build,
      savedId: typeof stored.savedId === "string" ? stored.savedId : null,
      sharedName: typeof stored.sharedName === "string" ? stored.sharedName.slice(0, MAX_NAME_LENGTH) : null
    };
  } catch {
    return null;
  }
}

function entryText(entries: ClassEntry[] | undefined, label: string): string[] {
  return (entries || [])
    .filter(entry => entry.label === label && typeof entry.value === "string")
    .map(entry => entry.value as string);
}

function describeCharacter(build: Character): string {
  const race = entryText(build.race, "Subrace")[0] ?? entryText(build.race, "Race")[0];
  const classLevels = getClassLevels(build.class);
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

function escapeHTML(value: unknown): string {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char] ?? char);
}

function normalizeResult(value: unknown): ClassEntry[] {
  if (Array.isArray(value)) return value;
  return [{label: "", value: value as string | null}];
}

// What a card shows, shared by the cards and the copied text. Each class carries its level, e.g. "Sorcerer, level 8".
function buildCardEntries(build: Character, key: CardKey): ClassEntry[] {
  const value = build[key];
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

// Rebuilds a character from untrusted data (a shared link or stored state), keeping only well-formed fields.
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

// The Generator page's address. Pages set data-root to the path back to it ("../" from a sub-page);
// opened from disk, links point at the live site instead.
function homeURL(): string {
  if (!location.protocol.startsWith("http")) return SITE_URL;
  const url = new URL(document.body.dataset.root || "./", location.href);
  url.hash = "";
  url.search = "";
  return url.href;
}

async function buildLink(build: Character, name: string | null): Promise<string> {
  return `${homeURL()}#${name ? `${nameToSlug(name)}&` : ""}build=${await encodeBuild(build)}`;
}

// Markdown-friendly text for Reddit and Discord: a bold heading per card and a bullet per entry.
async function buildText(build: Character, name: string | null): Promise<string> {
  const lines = name
    ? [`**${name}**`, describeCharacter(build), ""]
    : [`**${describeCharacter(build)}**`, ""];
  for (const key of visibleCards()) {
    lines.push(`**${CARD_TITLES[key]}**`, "");
    for (const entry of buildCardEntries(build, key)) {
      const value = Array.isArray(entry.value) ? entry.value.join(", ") : entry.value ?? "Not available";
      lines.push(`- ${entry.label ? `${entry.label}: ` : ""}${value}`);
    }
    lines.push("");
  }
  lines.push(`[Open this build in the BG3 Character Generator](${await buildLink(build, name)})`);
  return lines.join("\n");
}

function setNotice(message: string): void {
  const notice = document.getElementById("notice");
  if (notice) notice.textContent = message;
}

async function copyToClipboard(text: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    hideCopyBox();
    setNotice(message);
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
  setNotice("");
  field.focus();
  field.select();
}

function hideCopyBox(): void {
  const box = document.getElementById("copyBox");
  if (box) box.hidden = true;
}

// The Saved link in the header shows how many builds are saved.
function updateNav(): void {
  const count = getSavedCharacters().length;
  document.querySelectorAll<HTMLElement>("[data-saved-count]").forEach(badge => {
    badge.textContent = count ? String(count) : "";
  });
}

settings = loadSettings();
updateNav();
document.getElementById("copyClose")?.addEventListener("click", hideCopyBox);
