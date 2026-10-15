"use strict";

// The Generator page: rolling, locks, saving and sharing the build on screen.

const ROLLS: Record<CardKey, () => GeneratorResult> = {
  darkUrge: rollDarkUrge,
  race: rollRace,
  class: rollClass,
  feats: () => rollFeats(),
  background: rollBackground,
  romance: rollRomance,
  companionBuild: rollCompanionBuild
};

// Rolled in dependency order: background avoids racial skills, class avoids both.
const ROLL_ORDER: CardKey[] = ["darkUrge", "race", "background", "class", "feats", "romance", "companionBuild"];
const CLASS_DIVIDERS = ["", "Second class", "Third class"];

let lockedCards = loadLockedCards();
let rolledCards = new Set<CardKey>();

// The build on screen keeps a name while it is a saved build or came from a named link;
// any roll makes it a new, unnamed build.
let currentSavedId: string | null = null;
let sharedName: string | null = null;

function currentBuildName(): string | null {
  if (currentSavedId) return getSavedCharacters().find(item => item.id === currentSavedId)?.name ?? null;
  return sharedName;
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
      character = {...character, [key]: ROLLS[key]()} as Character;
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

// Puts a build on screen that came from somewhere else: a saved build, a link, or this tab's last visit.
function showBuild(build: Character, savedId: string | null, name: string | null): void {
  character = build;
  if (!character.companionBuild) character.companionBuild = rollCompanionBuild(character.romance);
  currentSavedId = savedId;
  sharedName = name;
  rolledCards = new Set(cardOrder);
  renderCards();
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
    storeSavedCharacters(saved);
    currentSavedId = id;
    sharedName = null;
    renderCards();
    setNotice("Saved. Find it on the Saved page.");
  } catch {
    setNotice("Could not save. Browser storage may be full or unavailable.");
  }
}

// A new roll no longer matches the shared build in the address bar.
function clearSharedBuildLink(): void {
  if (!SHARE_PATTERN.test(location.hash)) return;
  history.replaceState(null, "", location.pathname + location.search);
  setNotice("");
}

async function loadSharedBuild(): Promise<boolean> {
  const match = SHARE_PATTERN.exec(location.hash);
  if (!match) return false;
  const shared = await decodeBuild(match[2]);
  if (!shared) {
    setNotice("That build link couldn't be read.");
    return false;
  }
  showBuild(shared, null, match[1] ? slugToName(match[1]) : null);
  setNotice("Shared build loaded.");
  return true;
}

function setShareMenu(open: boolean): void {
  (document.getElementById("shareMenu") as HTMLElement).hidden = !open;
  document.getElementById("shareToggle")!.setAttribute("aria-expanded", String(open));
}

async function copyCurrentLink(): Promise<void> {
  setShareMenu(false);
  await copyToClipboard(await buildLink(character, currentBuildName()), "Build link copied.");
}

async function copyCurrentText(): Promise<void> {
  setShareMenu(false);
  await copyToClipboard(await buildText(character, currentBuildName()), "Build text copied.");
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

function renderCards(): void {
  renderBuildTitle();
  storeCurrentBuild({character, savedId: currentSavedId, sharedName});
  const host = document.getElementById("cards") as HTMLElement;
  const visible = visibleCards();
  host.style.setProperty("--areas-2", gridAreas(2, visible));
  host.style.setProperty("--areas-3", gridAreas(3, visible));
  let rollIndex = 0;
  host.innerHTML = visible.map(key => {
    const title = CARD_TITLES[key];
    const value = character[key];
    const classCount = key === "class" ? normalizeResult(value).filter(entry => entry.label === "Class").length : 0;
    const isMulticlass = classCount > 1;
    const locked = isLocked(key);
    const lockedByCompanion = isLockedByCompanion(key);
    const lockLabel = lockedByCompanion
      ? `${title} is kept because Companion Build is locked`
      : `Lock ${title}`;
    const classes = ["card", `card-${key}`];
    if (isMulticlass) classes.push("card-multiclass");
    if (locked) classes.push("is-locked");
    if (rolledCards.has(key)) classes.push("card-rolled");

    let classIndex = 0;
    const content = buildCardEntries(character, key).map(entry => {
      if (key === "class" && entry.label === "Class" && classIndex++ > 0) {
        return `<div class="class-divider">${CLASS_DIVIDERS[classIndex - 1] ?? "Next class"}</div>${entryHTML({...entry, label: ""})}`;
      }
      return entryHTML(entry);
    }).join("");

    return `<article class="${classes.join(" ")}"${rolledCards.has(key) ? ` style="--roll-index: ${rollIndex++}"` : ""}>
      <div class="card-head">
        <h2>${escapeHTML(title)}</h2>
        ${isMulticlass ? `<span class="multiclass-badge">${classCount > 2 ? "Triple class" : "Multiclass"}</span>` : ""}
        <div class="card-actions">
          <button class="text-button lock-button" data-lock="${key}" aria-pressed="${locked}" aria-label="${escapeHTML(lockLabel)}" title="${escapeHTML(lockLabel)}"${lockedByCompanion ? " disabled" : ""}>${locked ? "Locked" : "Lock"}</button>
          <button class="text-button reroll-button" data-reroll="${key}" aria-label="Reroll ${escapeHTML(title)}"${locked ? " disabled" : ""}>Reroll</button>
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
document.getElementById("shareToggle")!.addEventListener("click", () => {
  setShareMenu((document.getElementById("shareMenu") as HTMLElement).hidden === true);
});
document.getElementById("copyLink")!.addEventListener("click", copyCurrentLink);
document.getElementById("copyText")!.addEventListener("click", copyCurrentText);
document.addEventListener("click", event => {
  if (!(event.target as HTMLElement).closest(".share")) setShareMenu(false);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") setShareMenu(false);
});
window.addEventListener("hashchange", loadSharedBuild);

// A link wins; otherwise come back to this tab's last build, or roll a new one.
loadSharedBuild().then(loaded => {
  if (loaded) return;
  const current = loadCurrentBuild();
  if (current) showBuild(current.character, current.savedId, current.sharedName);
  else generateAll();
});
