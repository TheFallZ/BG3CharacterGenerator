"use strict";

// The Saved page: every saved build with open, share, rename and delete, plus sorting,
// search, and backing builds up to a file.

const SAVED_SORT_KEY = "bg3-character-generator-saved-sort";
const BACKUP_FORMAT = "bg3-character-generator-saved-builds";

function savedTime(item: SavedCharacter): number {
  return Number(item.id.split("-")[0]) || 0;
}

function startingClass(item: SavedCharacter): string {
  return getClassLevels(item.character.class)[0]?.className ?? "";
}

const SAVED_SORTS: Record<string, (a: SavedCharacter, b: SavedCharacter) => number> = {
  newest: (a, b) => savedTime(b) - savedTime(a),
  oldest: (a, b) => savedTime(a) - savedTime(b),
  name: (a, b) => savedTitle(a).localeCompare(savedTitle(b)),
  class: (a, b) => startingClass(a).localeCompare(startingClass(b)) || savedTitle(a).localeCompare(savedTitle(b))
};

function savedSort(): string {
  return (document.getElementById("savedSort") as HTMLSelectElement).value;
}

function renderSavedPage(): void {
  const list = document.getElementById("savedList") as HTMLElement;
  const all = getSavedCharacters();
  const query = (document.getElementById("savedSearch") as HTMLInputElement).value.trim().toLowerCase();
  const saved = all
    .filter(item => !query || `${savedTitle(item)} ${describeCharacter(item.character)}`.toLowerCase().includes(query))
    .sort(SAVED_SORTS[savedSort()] ?? SAVED_SORTS.newest);
  (document.getElementById("savedEmpty") as HTMLElement).hidden = all.length > 0;
  (document.getElementById("savedNoMatch") as HTMLElement).hidden = !all.length || saved.length > 0;
  (document.getElementById("exportSaved") as HTMLButtonElement).disabled = !all.length;
  list.innerHTML = saved.map(item => {
    const title = savedTitle(item);
    const id = escapeHTML(item.id);
    // A named build still shows what it is under the name.
    const summary = item.name ? describeCharacter(item.character) : "";
    return `<li class="saved-card" data-id="${id}">
      <div class="saved-card-text">
        <h2 class="saved-card-title">${escapeHTML(title)}</h2>
        ${summary ? `<p class="saved-card-summary">${escapeHTML(summary)}</p>` : ""}
        <p class="saved-card-date">Saved ${escapeHTML(savedDate(item))}</p>
      </div>
      <div class="saved-card-actions">
        <button class="primary" data-open="${id}">Open</button>
        <button data-copy-link="${id}">Copy link</button>
        <button data-copy-text="${id}">Copy text</button>
        <button data-rename="${id}">Rename</button>
        <button data-delete="${id}" aria-label="Delete ${escapeHTML(title)}">Delete</button>
      </div>
    </li>`;
  }).join("");
}

function savedCard(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.saved-card[data-id="${CSS.escape(id)}"]`);
}

// Opens the build on the Generator page, which picks it up from this tab's storage.
function openSaved(id: string): void {
  const item = getSavedCharacters().find(saved => saved.id === id);
  if (!item) return;
  pushHistory(loadCurrentBuild());
  storeCurrentBuild({character: structuredClone(item.character), savedId: id, sharedName: null});
  location.href = homeURL();
}

async function copySavedLink(id: string): Promise<void> {
  const item = getSavedCharacters().find(saved => saved.id === id);
  if (item) await copyToClipboard(await buildLink(item.character, item.name ?? null), `Link to "${savedTitle(item)}" copied.`);
}

async function copySavedText(id: string): Promise<void> {
  const item = getSavedCharacters().find(saved => saved.id === id);
  if (item) await copyToClipboard(await buildText(item.character, item.name ?? null), `Text for "${savedTitle(item)}" copied.`);
}

function startRename(id: string): void {
  const item = getSavedCharacters().find(saved => saved.id === id);
  const title = savedCard(id)?.querySelector<HTMLElement>(".saved-card-title");
  if (!item || !title) return;

  const input = document.createElement("input");
  input.className = "saved-name-input";
  input.value = item.name ?? "";
  input.placeholder = describeCharacter(item.character);
  input.maxLength = MAX_NAME_LENGTH;
  input.setAttribute("aria-label", "Build name");
  title.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    if (save) renameSaved(id, input.value);
    else renderSavedPage();
  };
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") finish(true);
    else if (event.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

// An empty name goes back to the automatic race and class description.
function renameSaved(id: string, name: string): void {
  try {
    storeSavedCharacters(getSavedCharacters().map(item => {
      if (item.id !== id) return item;
      const {name: _old, ...rest} = item;
      return name.trim() ? {...rest, name: name.trim()} : rest;
    }));
    setNotice("Build renamed.");
  } catch {
    setNotice("Could not rename the saved build.");
  }
  renderSavedPage();
  savedCard(id)?.querySelector<HTMLButtonElement>("[data-rename]")?.focus();
}

// Asks on the page rather than with confirm(), which some in-app browsers block.
function askToDelete(id: string): void {
  const item = getSavedCharacters().find(saved => saved.id === id);
  const actions = savedCard(id)?.querySelector<HTMLElement>(".saved-card-actions");
  if (!item || !actions) return;
  actions.innerHTML = `<span class="saved-confirm">Delete this build?</span>
    <button class="danger" data-confirm-delete="${escapeHTML(id)}">Delete</button>
    <button data-cancel-delete="${escapeHTML(id)}">Keep</button>`;
  actions.addEventListener("keydown", event => {
    if (event.key === "Escape") cancelDelete(id);
  });
  actions.querySelector<HTMLButtonElement>("[data-cancel-delete]")!.focus();
}

function cancelDelete(id: string): void {
  renderSavedPage();
  savedCard(id)?.querySelector<HTMLButtonElement>("[data-delete]")?.focus();
}

function deleteSaved(id: string): void {
  try {
    storeSavedCharacters(getSavedCharacters().filter(saved => saved.id !== id));
    setNotice("Build deleted.");
  } catch {
    setNotice("Could not delete the saved build.");
  }
  renderSavedPage();
}

// Downloads every saved build as a file that Import can read back, here or on another device.
function exportSaved(): void {
  const saved = getSavedCharacters();
  if (!saved.length) return;
  const backup = {format: BACKUP_FORMAT, version: 1, exported: new Date().toISOString(), builds: saved};
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type: "application/json"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = `bg3-saved-builds-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setNotice(`Backed up ${saved.length} ${saved.length === 1 ? "build" : "builds"}.`);
}

// Adds the builds from a backup file, skipping any already saved here. The file is checked
// build by build, since it may have come from anywhere.
async function importSaved(file: File): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    setNotice("That file isn't a saved builds backup.");
    return;
  }
  const builds: unknown[] = Array.isArray(parsed) ? parsed
    : Array.isArray((parsed as {builds?: unknown})?.builds) ? (parsed as {builds: unknown[]}).builds
    : [];
  const existing = getSavedCharacters();
  const ids = new Set(existing.map(item => item.id));
  const added: SavedCharacter[] = [];
  for (const build of builds) {
    if (!isSavedCharacter(build) || ids.has(build.id)) continue;
    const character = sanitizeCharacter(build.character);
    if (!character) continue;
    const name = typeof build.name === "string" ? build.name.trim().slice(0, MAX_NAME_LENGTH) : "";
    added.push({id: build.id, label: build.label, ...(name ? {name} : {}), character});
    ids.add(build.id);
  }
  if (!builds.length) {
    setNotice("That file isn't a saved builds backup.");
    return;
  }
  if (!added.length) {
    setNotice("Everything in that backup is already saved here.");
    return;
  }
  try {
    storeSavedCharacters([...added, ...existing]);
    setNotice(`Imported ${added.length} ${added.length === 1 ? "build" : "builds"}.`);
  } catch {
    setNotice("Could not import. Browser storage may be full or unavailable.");
  }
  renderSavedPage();
}

document.getElementById("savedSearch")!.addEventListener("input", renderSavedPage);
document.getElementById("savedSort")!.addEventListener("change", () => {
  try {
    localStorage.setItem(SAVED_SORT_KEY, savedSort());
  } catch {
    // The sort still applies for this visit.
  }
  renderSavedPage();
});
document.getElementById("exportSaved")!.addEventListener("click", exportSaved);
document.getElementById("importSaved")!.addEventListener("click", () => document.getElementById("importFile")!.click());
document.getElementById("importFile")!.addEventListener("change", event => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) importSaved(file);
});

try {
  const sort = localStorage.getItem(SAVED_SORT_KEY);
  if (sort && SAVED_SORTS[sort]) (document.getElementById("savedSort") as HTMLSelectElement).value = sort;
} catch {
  // Newest first is the default.
}

document.getElementById("savedList")!.addEventListener("click", event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  const set = button?.dataset ?? {};
  if (set.open) openSaved(set.open);
  else if (set.copyLink) copySavedLink(set.copyLink);
  else if (set.copyText) copySavedText(set.copyText);
  else if (set.rename) startRename(set.rename);
  else if (set.delete) askToDelete(set.delete);
  else if (set.confirmDelete) deleteSaved(set.confirmDelete);
  else if (set.cancelDelete) cancelDelete(set.cancelDelete);
});

renderSavedPage();
