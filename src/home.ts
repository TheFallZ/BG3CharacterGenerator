"use strict";

// The Generator page: rolling, locks, saving and sharing the build on screen.

const ROLLS: Record<CardKey, () => GeneratorResult> = {
  origin: () => rollOrigin(),
  abilities: rollAbilities,
  darkUrge: rollDarkUrge,
  race: rollRace,
  class: rollClass,
  feats: () => rollFeats(),
  background: rollBackground,
  romance: rollRomance,
  companionBuild: () => rollCompanions()
};

// Rolled in dependency order: the origin can fix race and background, background avoids racial
// skills, class avoids both, and ability scores follow the class.
const ROLL_ORDER: CardKey[] = ["origin", "darkUrge", "race", "background", "class", "abilities", "feats", "romance", "companionBuild"];
const CLASS_DIVIDERS = ["", "Second class", "Third class"];

function rollCompanions(): ClassEntry[] {
  return settings.party ? rollParty(character.romance) : rollCompanionBuild(character.romance);
}

// Race and background can't be rerolled while the origin sets them.
function isSetByOrigin(key: CardKey): boolean {
  if (key === "race") return !!originProfile();
  if (key === "background") return !!originProfile() || character.origin === DARK_URGE_ORIGIN;
  return false;
}

function currentEntry(): CurrentBuild | null {
  return character.class ? {character: structuredClone(character), savedId: currentSavedId, sharedName} : null;
}

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

  pushHistory(currentEntry());

  for (const key of ROLL_ORDER) {
    if (!targets.has(key)) continue;
    if (key === "origin") {
      const keptNames = [
        ...(!targets.has("romance") && character.romance ? [character.romance] : []),
        ...(!targets.has("companionBuild") ? entryText(character.companionBuild, "Companion") : [])
      ];
      character.origin = rollOrigin(!targets.has("race") && !!character.race, !targets.has("background") && !!character.background, keptNames);
    } else if (key === "race") {
      const keptBackgroundSkills = targets.has("background") ? [] : getBackgroundSkillProficiencies();
      character.race = rollRaceAvoiding([...keptClassSkills, ...keptBackgroundSkills]);
    } else if (key === "background") {
      character.background = rollBackground(keptClassSkills);
    } else if (key === "companionBuild") {
      character.companionBuild = rollCompanions();
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
  setNotice("");
  currentSavedId = null;
  sharedName = null;
  clearSharedBuildLink();
  renderCards();
}

// Feats follow the class levels, and race and class decide which armor feats are allowed.
function reroll(key: CardKey): void {
  if (key === "origin") rollCards(["origin", "race", "background", "class", "abilities", "feats", "romance", "companionBuild"]);
  else if (key === "race") rollCards(["race", "background", "class", "abilities", "feats"]);
  else if (key === "background") rollCards(["background", "class", "abilities", "feats"]);
  else if (key === "class") rollCards(["class", "abilities", "feats"]);
  else if (key === "romance") rollCards(["romance", "companionBuild"]);
  else rollCards([key]);
}

function generateAll(): void {
  rollCards(ROLL_ORDER);
}

// Puts a build on screen that came from somewhere else: a saved build, a link, or this tab's last visit.
function showBuild(build: Character, savedId: string | null, name: string | null): void {
  character = build;
  // Builds from before these cards existed get filled in.
  if (!character.origin) character.origin = CUSTOM_ORIGIN;
  if (!character.abilities) character.abilities = rollAbilities();
  if (!character.companionBuild) character.companionBuild = rollCompanions();
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
  pushHistory(currentEntry());
  showBuild(shared, null, match[1] ? slugToName(match[1]) : null);
  // A named build's title already says it's shared.
  setNotice(sharedName ? "" : "Shared build loaded.");
  return true;
}

function undo(): void {
  const previous = popHistory();
  if (!previous) return;
  clearSharedBuildLink();
  showBuild(previous.character, previous.savedId, previous.sharedName);
  setNotice("Previous build restored.");
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
  (document.getElementById("buildKind") as HTMLElement).textContent = currentSavedId ? "Saved build" : "Shared build";
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

// Grid areas for the visible cards, so hiding a card doesn't leave a gap.
// Wide screens use six columns so two or three short story cards (origin, tadpole, romance)
// can share a row evenly, with the companion card full width below.
function gridAreas(columns: 2 | 6, visible: CardKey[]): string {
  const story = (["origin", "darkUrge", "romance"] as CardKey[]).filter(key => visible.includes(key));
  const row = (...cells: string[]) => `"${cells.join(" ")}"`;
  const span = (key: string, width: number) => Array(width).fill(key);
  const rows: string[] = [];

  if (columns === 2) {
    rows.push(row("class", "class"));
    if (visible.includes("abilities")) rows.push(row("abilities", "abilities"));
    rows.push(row("race", "background"), row("feats", "feats"));
    for (let i = 0; i < story.length; i += 2) rows.push(row(story[i], story[i + 1] ?? story[i]));
    if (visible.includes("companionBuild")) rows.push(row("companionBuild", "companionBuild"));
    return rows.join(" ");
  }

  rows.push(row(...span("class", 6)));
  if (visible.includes("abilities")) rows.push(row(...span("abilities", 6)));
  rows.push(row(...span("race", 2), ...span("background", 2), ...span("feats", 2)));
  if (story.length) rows.push(row(...story.flatMap(key => span(key, 6 / story.length))));
  if (visible.includes("companionBuild")) rows.push(row(...span("companionBuild", 6)));
  return rows.join(" ");
}

// A party shows each companion in its own column; a single companion keeps the two-column layout.
function companionHTML(): string {
  const members: ClassEntry[][] = [];
  for (const entry of buildCardEntries(character, "companionBuild")) {
    const startsMember = ["Companion", "Hireling", "Companion or hireling"].includes(entry.label);
    if (startsMember || !members.length) members.push([]);
    members[members.length - 1].push(entry);
  }
  if (members.length < 2) return members.flat().map(entryHTML).join("");
  return `<div class="party">${members.map(member =>
    `<div class="party-member">${member.map(entryHTML).join("")}</div>`
  ).join("")}</div>`;
}

// Ability scores as six boxes with their modifiers, then the racial bonuses.
function abilitiesHTML(): string {
  const entries = normalizeResult(character.abilities);
  const boxes = entries.filter(entry => ABILITIES.includes(entry.label)).map(entry => {
    const score = Number(entry.value);
    return `<div class="ability">
      <span class="ability-name">${escapeHTML(entry.label.slice(0, 3).toUpperCase())}</span>
      <span class="ability-score">${escapeHTML(entry.value)}</span>
      <span class="ability-mod">${score ? abilityModifier(score) : ""}</span>
    </div>`;
  }).join("");
  const bonus = entries.find(entry => entry.label === "Racial bonuses")?.value;
  const bonusText = typeof bonus === "string" ? bonus.replace(", ", " and ") : "";
  return `<div class="abilities">${boxes}</div>
    <p class="abilities-note">Set these in character creation${bonusText ? `, putting your bonus points into ${escapeHTML(bonusText)}` : ""}.</p>`;
}

function renderCards(): void {
  renderBuildTitle();
  (document.getElementById("undo") as HTMLButtonElement).disabled = !loadHistory().length;
  storeCurrentBuild({character, savedId: currentSavedId, sharedName});
  const host = document.getElementById("cards") as HTMLElement;
  const visible = visibleCards();
  host.style.setProperty("--areas-2", gridAreas(2, visible));
  host.style.setProperty("--areas-6", gridAreas(6, visible));
  let rollIndex = 0;
  host.innerHTML = visible.map(key => {
    const title = cardTitle(character, key);
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

    // Each later class starts after a divider.
    let classIndex = 0;
    const content = key === "abilities" ? abilitiesHTML()
      : key === "companionBuild" ? companionHTML()
      : buildCardEntries(character, key).map(entry => {
        if (key === "class" && entry.label === "Class" && classIndex++ > 0) {
          return `<div class="class-divider">${CLASS_DIVIDERS[classIndex - 1] ?? "Next class"}</div>${entryHTML({...entry, label: ""})}`;
        }
        return entryHTML(entry);
      }).join("");
    const setByOrigin = isSetByOrigin(key);
    const rerollLabel = setByOrigin ? `${title} is set by your origin` : `Reroll ${title}`;

    return `<article class="${classes.join(" ")}"${rolledCards.has(key) ? ` style="--roll-index: ${rollIndex++}"` : ""}>
      <div class="card-head">
        <h2>${escapeHTML(title)}</h2>
        ${isMulticlass ? `<span class="multiclass-badge">${classCount > 2 ? "Triple class" : "Multiclass"}</span>` : ""}
        <div class="card-actions">
          <button class="text-button lock-button" data-lock="${key}" aria-pressed="${locked}" aria-label="${escapeHTML(lockLabel)}" title="${escapeHTML(lockLabel)}"${lockedByCompanion ? " disabled" : ""}>${locked ? "Locked" : "Lock"}</button>
          <button class="text-button reroll-button" data-reroll="${key}" aria-label="${escapeHTML(rerollLabel)}" title="${escapeHTML(rerollLabel)}"${locked || setByOrigin ? " disabled" : ""}>Reroll</button>
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
document.getElementById("undo")!.addEventListener("click", undo);
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
