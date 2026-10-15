"use strict";

// The Saved page: every saved build with open, share, rename and delete.

function renderSavedPage(): void {
  const list = document.getElementById("savedList") as HTMLElement;
  const saved = getSavedCharacters();
  (document.getElementById("savedEmpty") as HTMLElement).hidden = saved.length > 0;
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
