"use strict";
// The Generator page: rolling, locks, saving and sharing the build on screen.
const ROLLS = {
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
const ROLL_ORDER = ["origin", "darkUrge", "race", "background", "class", "abilities", "feats", "romance", "companionBuild"];
const CLASS_DIVIDERS = ["", "Second class", "Third class"];
function rollCompanions() {
    return settings.party ? rollParty(character.romance) : rollCompanionBuild(character.romance);
}
// Race and background can't be rerolled while the origin sets them.
function isSetByOrigin(key) {
    if (key === "race")
        return !!originProfile();
    if (key === "background")
        return !!originProfile() || character.origin === DARK_URGE_ORIGIN;
    return false;
}
function currentEntry() {
    return character.class ? { character: structuredClone(character), savedId: currentSavedId, sharedName } : null;
}
let lockedCards = loadLockedCards();
let rolledCards = new Set();
// Whether the level-up order is open under the Multiclass badge. It stays open across new builds.
let levelOrderOpen = false;
// The build on screen keeps a name while it is a saved build or came from a named link;
// any roll makes it a new, unnamed build.
let currentSavedId = null;
let sharedName = null;
function currentBuildName() {
    if (currentSavedId)
        return getSavedCharacters().find(item => item.id === currentSavedId)?.name ?? null;
    return sharedName;
}
function loadLockedCards() {
    try {
        const saved = JSON.parse(localStorage.getItem(LOCKED_CARDS_KEY) || "[]");
        return new Set(Array.isArray(saved) ? saved.filter((key) => cardOrder.includes(key)) : []);
    }
    catch {
        return new Set();
    }
}
// The companion comes from the romance, so a locked companion build keeps its romance too.
function isLockedByCompanion(key) {
    return key === "romance" && lockedCards.has("companionBuild");
}
function isLocked(key) {
    return lockedCards.has(key) || isLockedByCompanion(key);
}
function toggleLock(key) {
    if (lockedCards.has(key))
        lockedCards.delete(key);
    else
        lockedCards.add(key);
    try {
        localStorage.setItem(LOCKED_CARDS_KEY, JSON.stringify([...lockedCards]));
    }
    catch {
        // Locks still work for this visit without storage.
    }
    rolledCards = new Set();
    renderCards();
    document.querySelector(`[data-lock="${key}"]`)?.focus();
}
function rollCards(keys) {
    // A locked card with nothing to keep yet (first page load) still gets rolled.
    const targets = new Set(keys.filter(key => !isLocked(key) || character[key] === undefined));
    const keptClassSkills = targets.has("class") ? [] : getClassSkillProficiencies();
    pushHistory(currentEntry());
    for (const key of ROLL_ORDER) {
        if (!targets.has(key))
            continue;
        if (key === "origin") {
            const keptNames = [
                ...(!targets.has("romance") && character.romance ? [character.romance] : []),
                ...(!targets.has("companionBuild") ? entryText(character.companionBuild, "Companion") : [])
            ];
            character.origin = rollOrigin(!targets.has("race") && !!character.race, !targets.has("background") && !!character.background, keptNames);
        }
        else if (key === "race") {
            const keptBackgroundSkills = targets.has("background") ? [] : getBackgroundSkillProficiencies();
            character.race = rollRaceAvoiding([...keptClassSkills, ...keptBackgroundSkills]);
        }
        else if (key === "background") {
            character.background = rollBackground(keptClassSkills);
        }
        else if (key === "companionBuild") {
            character.companionBuild = rollCompanions();
        }
        else if (key === "feats") {
            character.feats = rollFeats();
        }
        else {
            character = { ...character, [key]: ROLLS[key]() };
        }
    }
    // A kept class's Expertise has to stay on skills the character still has, and its deity has to
    // be one the new race may follow.
    if (!targets.has("class") && (targets.has("race") || targets.has("background")) && character.class) {
        character.class = repairExpertise(character.class, [...getRacialSkillProficiencies(), ...getBackgroundSkillProficiencies(), ...getClassSkillProficiencies()]);
        if (targets.has("race"))
            character.class = repairDeity(character.class, raceNames());
    }
    // Kept feats survive a new class, trimmed or topped up to the new number of feat levels, new
    // ability scores and a new race, with any that no longer fit the scores or armor rolled again.
    if ((targets.has("class") || targets.has("abilities") || targets.has("race")) && !targets.has("feats")) {
        character.feats = rollFeats(featValues());
    }
    rolledCards = targets;
    setNotice("");
    currentSavedId = null;
    sharedName = null;
    clearSharedBuildLink();
    renderCards();
}
// Rerolling a card only rerolls the cards built from it: ability scores and feats are arranged for
// the class. A new race or background keeps everything else, with the bits that depend on it
// (Expertise, a race-locked deity, armor feats) fixed up in rollCards.
function reroll(key) {
    trackEvent(`reroll-${key}`);
    if (key === "origin")
        rollCards(["origin", "race", "background", "class", "abilities", "feats", "romance", "companionBuild"]);
    else if (key === "class")
        rollCards(["class", "abilities", "feats"]);
    else if (key === "romance")
        rollCards(["romance", "companionBuild"]);
    else
        rollCards([key]);
}
// Pressing Generate spins the d20 on the button, and one roll in 20 is a natural 20.
const NATURAL_20_CHANCE = 1 / 20;
function rollDie() {
    const die = document.querySelector("#generateAll .roll-die");
    if (!die)
        return;
    die.classList.remove("is-rolling");
    void die.offsetWidth; // Restarts the spin when Generate is pressed again mid-roll.
    die.classList.add("is-rolling");
}
function generateAll() {
    trackEvent("generate");
    rollCards(ROLL_ORDER);
    rollDie();
    if (Math.random() < NATURAL_20_CHANCE)
        setNotice("Natural 20!");
}
// Puts a build on screen that came from somewhere else: a saved build, a link, or this tab's last visit.
function showBuild(build, savedId, name) {
    character = build;
    // Builds from before these cards existed get filled in.
    if (!character.origin)
        character.origin = CUSTOM_ORIGIN;
    if (!character.abilities)
        character.abilities = rollAbilities();
    if (!character.companionBuild)
        character.companionBuild = rollCompanions();
    currentSavedId = savedId;
    sharedName = name;
    rolledCards = new Set(cardOrder);
    renderCards();
}
function saveCharacter() {
    const saved = getSavedCharacters();
    const savedAt = new Date();
    const id = `${savedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    // A build opened from a named link keeps its name when saved.
    const name = currentBuildName();
    saved.unshift({
        id,
        label: `${describeCharacter(character)} · ${savedAt.toLocaleString()}`,
        ...(name ? { name } : {}),
        character: structuredClone(character)
    });
    try {
        storeSavedCharacters(saved);
        trackEvent("save");
        currentSavedId = id;
        sharedName = null;
        renderCards();
        setNotice("Saved. Find it on the Saved page.");
    }
    catch {
        setNotice("Could not save. Browser storage may be full or unavailable.");
    }
}
// A new roll no longer matches the shared build in the address bar.
function clearSharedBuildLink() {
    if (!SHARE_PATTERN.test(location.hash))
        return;
    history.replaceState(null, "", location.pathname + location.search);
    setNotice("");
}
async function loadSharedBuild() {
    const match = SHARE_PATTERN.exec(location.hash);
    if (!match)
        return false;
    const shared = await decodeBuild(match[2]);
    if (!shared) {
        setNotice("That build link couldn't be read.");
        return false;
    }
    pushHistory(currentEntry());
    showBuild(shared, null, match[1] ? slugToName(match[1]) : null);
    trackEvent("open-shared-build");
    // A named build's title already says it's shared.
    setNotice(sharedName ? "" : "Shared build loaded.");
    return true;
}
function undo() {
    const previous = popHistory();
    if (!previous)
        return;
    trackEvent("undo");
    clearSharedBuildLink();
    showBuild(previous.character, previous.savedId, previous.sharedName);
    setNotice("Previous build restored.");
}
function setShareMenu(open) {
    document.getElementById("shareMenu").hidden = !open;
    document.getElementById("shareToggle").setAttribute("aria-expanded", String(open));
}
async function copyCurrentLink() {
    setShareMenu(false);
    trackEvent("copy-link");
    await copyToClipboard(await buildLink(character, currentBuildName()), "Build link copied.");
}
async function copyCurrentText() {
    setShareMenu(false);
    trackEvent("copy-text");
    await copyToClipboard(await buildText(character, currentBuildName()), "Build text copied.");
}
// The heading beside the buttons: a named build shows its name with race and class below;
// any other build uses its race and class as the heading.
function renderBuildTitle() {
    const name = currentBuildName();
    const summary = document.getElementById("buildSummary");
    const isSaved = !!currentSavedId && getSavedCharacters().some(item => item.id === currentSavedId);
    document.getElementById("buildKind").textContent =
        isSaved ? "Saved build" : name ? "Shared build" : "Your character";
    document.getElementById("buildName").textContent = name ?? describeCharacter(character);
    summary.textContent = name ? describeCharacter(character) : "";
    summary.hidden = !name;
    const note = currentSavedId ? getSavedCharacters().find(item => item.id === currentSavedId)?.note : undefined;
    const noteLine = document.getElementById("buildNote");
    noteLine.textContent = note ?? "";
    noteLine.hidden = !note;
    renderBuildPicture(isSaved ? currentSavedId : null);
}
// A saved build's picture sits beside its heading. It loads after the rest, so a later build
// that has already replaced this one isn't given the wrong picture.
async function renderBuildPicture(savedId) {
    const image = document.getElementById("buildPicture");
    const picture = savedId ? await getPicture(savedId) : null;
    if (savedId !== currentSavedId)
        return;
    image.hidden = !picture;
    if (picture)
        image.src = picture;
    else
        image.removeAttribute("src");
    image.alt = picture ? `Picture of ${currentBuildName() ?? describeCharacter(character)}` : "";
    document.getElementById("buildTitle").classList.toggle("has-picture", !!picture);
}
// A multiclass build's level-up order, in a dark panel that opens as the first item in the Class
// card, so the class details flow beside and below it: one numbered box per character level,
// colored by class, and a line on why it starts that way. It stays open across new builds until
// it's closed.
function levelUpOrderHTML() {
    const classes = getClassLevels().map(({ className }) => className);
    const boxes = levelUpOrder().flatMap(({ className, from, to }) => Array.from({ length: to - from + 1 }, () => className));
    const strip = boxes.map((className, index) => `<li class="level-box level-class-${classes.indexOf(className)}" title="Level ${index + 1}: ${escapeHTML(className)}">${index + 1}</li>`).join("");
    return `<div class="level-order-pop" id="levelOrder"${levelOrderOpen ? "" : " hidden"}>
    <ol class="level-strip" aria-label="${escapeHTML(levelUpOrderText())}">${strip}</ol>
    <p class="level-reason">${escapeHTML(levelUpReason())}</p>
  </div>`;
}
// Shows or hides the level-up order without redrawing the cards.
function setLevelOrderOpen(open) {
    levelOrderOpen = open;
    const panel = document.getElementById("levelOrder");
    const toggle = document.querySelector("[data-level-order]");
    if (panel)
        panel.hidden = !open;
    toggle?.setAttribute("aria-expanded", String(open));
    const caret = toggle?.querySelector(".level-order-caret");
    if (caret)
        caret.textContent = open ? "▴" : "▾";
}
function entryHTML(entry) {
    const value = entry.value;
    let htmlValue;
    if (Array.isArray(value)) {
        htmlValue = value.length
            ? `<ul>${value.map(v => `<li>${escapeHTML(v)}</li>`).join("")}</ul>`
            : `<span class="empty">No options</span>`;
    }
    else {
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
function gridAreas(columns, visible) {
    const story = ["origin", "darkUrge", "romance"].filter(key => visible.includes(key));
    const row = (...cells) => `"${cells.join(" ")}"`;
    const span = (key, width) => Array(width).fill(key);
    const rows = [];
    if (columns === 2) {
        rows.push(row("class", "class"));
        if (visible.includes("abilities"))
            rows.push(row("abilities", "abilities"));
        rows.push(row("race", "background"), row("feats", "feats"));
        for (let i = 0; i < story.length; i += 2)
            rows.push(row(story[i], story[i + 1] ?? story[i]));
        if (visible.includes("companionBuild"))
            rows.push(row("companionBuild", "companionBuild"));
        return rows.join(" ");
    }
    rows.push(row(...span("class", 6)));
    if (visible.includes("abilities"))
        rows.push(row(...span("abilities", 6)));
    rows.push(row(...span("race", 2), ...span("background", 2), ...span("feats", 2)));
    if (story.length)
        rows.push(row(...story.flatMap(key => span(key, 6 / story.length))));
    if (visible.includes("companionBuild"))
        rows.push(row(...span("companionBuild", 6)));
    return rows.join(" ");
}
// A party shows each companion in its own column; a single companion keeps the two-column layout.
function companionHTML() {
    const members = [];
    for (const entry of buildCardEntries(character, "companionBuild")) {
        const startsMember = ["Companion", "Hireling", "Companion or hireling"].includes(entry.label);
        if (startsMember || !members.length)
            members.push([]);
        members[members.length - 1].push(entry);
    }
    if (members.length < 2)
        return members.flat().map(entryHTML).join("");
    return `<div class="party">${members.map(member => `<div class="party-member">${member.map(entryHTML).join("")}</div>`).join("")}</div>`;
}
// Ability scores as six boxes with their modifiers, then the racial bonuses.
function abilitiesHTML() {
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
function renderCards() {
    renderBuildTitle();
    document.getElementById("undo").disabled = !loadHistory().length;
    storeCurrentBuild({ character, savedId: currentSavedId, sharedName });
    const host = document.getElementById("cards");
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
        if (isMulticlass)
            classes.push("card-multiclass");
        if (locked)
            classes.push("is-locked");
        if (rolledCards.has(key))
            classes.push("card-rolled");
        // Each later class starts after a divider.
        let classIndex = 0;
        const content = key === "abilities" ? abilitiesHTML()
            : key === "companionBuild" ? companionHTML()
                : buildCardEntries(character, key).map(entry => {
                    if (key === "class" && entry.label === "Class" && classIndex++ > 0) {
                        return `<div class="class-divider">${CLASS_DIVIDERS[classIndex - 1] ?? "Next class"}</div>${entryHTML({ ...entry, label: "" })}`;
                    }
                    return entryHTML(entry);
                }).join("");
        // With the level-up order on, the Multiclass badge drops it down over the Class card.
        const hasLevelOrder = key === "class" && isMulticlass && settings.showLevelOrder;
        const badgeText = classCount > 2 ? "Triple class" : "Multiclass";
        const badge = !isMulticlass ? ""
            : hasLevelOrder ? `<button class="multiclass-badge level-order-toggle" data-level-order aria-expanded="${levelOrderOpen}" aria-controls="levelOrder">Level-up order <span class="level-order-caret" aria-hidden="true">${levelOrderOpen ? "▴" : "▾"}</span></button>`
                : `<span class="multiclass-badge">${badgeText}</span>`;
        const setByOrigin = isSetByOrigin(key);
        const rerollLabel = setByOrigin ? `${title} is set by your origin` : `Reroll ${title}`;
        return `<article class="${classes.join(" ")}"${rolledCards.has(key) ? ` style="--roll-index: ${rollIndex++}"` : ""}>
      <div class="card-head">
        <h2>${escapeHTML(title)}</h2>
        ${badge}
        <div class="card-actions">
          <button class="text-button lock-button" data-lock="${key}" aria-pressed="${locked}" aria-label="${escapeHTML(lockLabel)}" title="${escapeHTML(lockLabel)}"${lockedByCompanion ? " disabled" : ""}>${locked ? "Locked" : "Lock"}</button>
          <button class="text-button reroll-button" data-reroll="${key}" aria-label="${escapeHTML(rerollLabel)}" title="${escapeHTML(rerollLabel)}"${locked || setByOrigin ? " disabled" : ""}>Reroll</button>
        </div>
      </div>
      <div class="card-body">${hasLevelOrder ? levelUpOrderHTML() : ""}${content}</div>
    </article>`;
    }).join("");
    host.querySelectorAll("[data-reroll]").forEach(button => {
        button.addEventListener("click", () => reroll(button.dataset.reroll));
    });
    host.querySelectorAll("[data-lock]").forEach(button => {
        button.addEventListener("click", () => toggleLock(button.dataset.lock));
    });
    host.querySelector("[data-level-order]")?.addEventListener("click", () => setLevelOrderOpen(!levelOrderOpen));
}
document.getElementById("generateAll").addEventListener("click", generateAll);
document.getElementById("saveCharacter").addEventListener("click", saveCharacter);
document.getElementById("undo").addEventListener("click", undo);
document.getElementById("shareToggle").addEventListener("click", () => {
    setShareMenu(document.getElementById("shareMenu").hidden === true);
});
document.getElementById("copyLink").addEventListener("click", copyCurrentLink);
document.getElementById("copyText").addEventListener("click", copyCurrentText);
document.addEventListener("click", event => {
    if (!event.target.closest(".share"))
        setShareMenu(false);
});
// Single-key shortcuts, ignored while typing or when a modifier key is held.
const SHORTCUTS = {
    g: generateAll,
    z: undo,
    s: saveCharacter,
    c: copyCurrentLink
};
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        const inMenu = !!document.activeElement?.closest("#shareMenu");
        setShareMenu(false);
        if (inMenu)
            document.getElementById("shareToggle")?.focus();
        if (levelOrderOpen) {
            setLevelOrderOpen(false);
            document.querySelector("[data-level-order]")?.focus();
        }
    }
    const target = event.target;
    if (event.ctrlKey || event.metaKey || event.altKey || target.closest("input, textarea, select, [contenteditable]"))
        return;
    const action = SHORTCUTS[event.key.toLowerCase()];
    if (!action)
        return;
    event.preventDefault();
    action();
});
window.addEventListener("hashchange", loadSharedBuild);
// The update banner shows until dismissed. Change LATEST_UPDATE with each release to show it again.
const LATEST_UPDATE = "2026-10-pictures";
const DISMISSED_UPDATE_KEY = "bg3-character-generator-dismissed-update";
function showUpdateBanner() {
    const banner = document.getElementById("updateBanner");
    try {
        banner.hidden = localStorage.getItem(DISMISSED_UPDATE_KEY) === LATEST_UPDATE;
    }
    catch {
        banner.hidden = false;
    }
}
document.getElementById("dismissUpdate").addEventListener("click", () => {
    document.getElementById("updateBanner").hidden = true;
    try {
        localStorage.setItem(DISMISSED_UPDATE_KEY, LATEST_UPDATE);
    }
    catch {
        // It just shows again next visit.
    }
});
showUpdateBanner();
// A link wins; otherwise come back to this tab's last build, or roll a new one.
loadSharedBuild().then(loaded => {
    if (loaded)
        return;
    const current = loadCurrentBuild();
    if (current)
        showBuild(current.character, current.savedId, current.sharedName);
    // Rolled directly so the first build of a visit isn't counted as a Generate press, or rolls the die.
    else
        rollCards(ROLL_ORDER);
});
