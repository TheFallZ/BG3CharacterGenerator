"use strict";
// Shared by every page: storage, saved builds, share links and the copy helpers.
// Loaded after generator.js and before the page's own script.
const SAVED_CHARACTERS_KEY = "bg3-character-generator-saved-results";
const SETTINGS_KEY = "bg3-character-generator-settings";
const LOCKED_CARDS_KEY = "bg3-character-generator-locked-cards";
// The build on the Generator page, kept for this tab so visiting another page and coming back keeps it.
const CURRENT_BUILD_KEY = "bg3-character-generator-current";
// Earlier builds from this tab, newest last, for Undo.
const HISTORY_KEY = "bg3-character-generator-history";
const HISTORY_LIMIT = 20;
const SITE_URL = "https://thefallz.github.io/BG3CharacterGenerator/";
// Share links look like "#build=<code>", or "#Karlach-Tank&build=<code>" for a named build.
const SHARE_PATTERN = /^#(?:([^&]*)&)?build=(.+)$/;
const MAX_NAME_LENGTH = 60;
const MAX_NOTE_LENGTH = 300;
// Page order; the grid in styles.css places each card by its card-<key> class.
const cardOrder = ["class", "abilities", "race", "background", "feats", "origin", "darkUrge", "romance", "companionBuild"];
const CARD_TITLES = {
    class: "Class",
    abilities: "Ability Scores",
    origin: "Origin",
    race: "Race",
    background: "Background",
    feats: "Feats",
    darkUrge: "Should I accept the tadpole?",
    romance: "Romance",
    companionBuild: "Companion Build"
};
// Story cards a visitor can hide, in the order Settings lists them; the build cards always show.
const HIDEABLE_CARDS = [
    { key: "origin", label: "Origin" },
    { key: "romance", label: "Romance" },
    { key: "abilities", label: "Ability scores" },
    { key: "darkUrge", label: "Tadpole choice" },
    { key: "companionBuild", label: "Companion build" }
];
// The Companion card holds one companion, or three when the party setting is on.
function companionCount(build) {
    return (build.companionBuild || []).filter(entry => entry.label === "Companion" || entry.label === "Hireling" || entry.label === "Companion or hireling").length;
}
function cardTitle(build, key) {
    return key === "companionBuild" && companionCount(build) > 1 ? "Party" : CARD_TITLES[key];
}
const MULTICLASS_MODES = [
    { mode: "never", label: "Never" },
    { mode: "sometimes", label: "Sometimes" },
    { mode: "always", label: "Always" }
];
function loadSettings() {
    const defaults = defaultSettings();
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        const strings = (value, known) => Array.isArray(value) ? value.filter((item) => known.includes(item)) : [];
        return {
            excludedClasses: strings(saved.excludedClasses, Object.keys(data.classes)),
            excludedRaces: strings(saved.excludedRaces, Object.keys(data.races)),
            multiclass: MULTICLASS_MODES.some(({ mode }) => mode === saved.multiclass) ? saved.multiclass : defaults.multiclass,
            tripleClass: saved.tripleClass === true,
            hiddenCards: strings(saved.hiddenCards, HIDEABLE_CARDS.map(({ key }) => key)),
            party: saved.party === true,
            originCharacters: saved.originCharacters === true,
            showAlignment: saved.showAlignment !== false
        };
    }
    catch {
        return defaults;
    }
}
function storeSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    catch {
        // Settings still apply for this visit without storage.
    }
}
// The Origin card only exists while origin characters are allowed.
function visibleCards() {
    return cardOrder.filter(key => !settings.hiddenCards.includes(key) && (key !== "origin" || settings.originCharacters));
}
function isSavedCharacter(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const candidate = value;
    return typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.character === "object" && candidate.character !== null;
}
function getSavedCharacters() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVED_CHARACTERS_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter(isSavedCharacter) : [];
    }
    catch {
        return [];
    }
}
// Throws when storage is full or blocked, so callers can say so.
function storeSavedCharacters(saved) {
    localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(saved));
    updateNav();
}
function storeCurrentBuild(current) {
    try {
        sessionStorage.setItem(CURRENT_BUILD_KEY, JSON.stringify(current));
    }
    catch {
        // Without storage the Generator page just rolls a new build next time.
    }
}
function loadCurrentBuild() {
    try {
        const stored = JSON.parse(sessionStorage.getItem(CURRENT_BUILD_KEY) || "null");
        const build = sanitizeCharacter(stored?.character);
        if (!build)
            return null;
        return {
            character: build,
            savedId: typeof stored.savedId === "string" ? stored.savedId : null,
            sharedName: typeof stored.sharedName === "string" ? stored.sharedName.slice(0, MAX_NAME_LENGTH) : null
        };
    }
    catch {
        return null;
    }
}
function loadHistory() {
    try {
        const stored = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(stored) ? stored : [];
    }
    catch {
        return [];
    }
}
function storeHistory(history) {
    try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)));
    }
    catch {
        // Undo just has less to go back to without storage.
    }
}
// Remembers the build on screen before it's replaced, so Undo can bring it back.
function pushHistory(entry) {
    if (entry)
        storeHistory([...loadHistory(), entry]);
}
function popHistory() {
    const history = loadHistory();
    while (history.length) {
        const stored = history.pop();
        const build = sanitizeCharacter(stored?.character);
        if (build) {
            storeHistory(history);
            return {
                character: build,
                savedId: typeof stored.savedId === "string" ? stored.savedId : null,
                sharedName: typeof stored.sharedName === "string" ? stored.sharedName : null
            };
        }
    }
    storeHistory([]);
    return null;
}
function entryText(entries, label) {
    return (entries || [])
        .filter(entry => entry.label === label && typeof entry.value === "string")
        .map(entry => entry.value);
}
function describeCharacter(build) {
    const race = entryText(build.race, "Subrace")[0] ?? entryText(build.race, "Race")[0];
    const classLevels = getClassLevels(build.class);
    const classes = classLevels
        .map(({ className, level }) => classLevels.length > 1 ? `${className} ${level}` : className)
        .join(" / ");
    return [race, classes].filter(Boolean).join(" · ") || "Character";
}
function savedTitle(item) {
    return item.name || describeCharacter(item.character);
}
function savedDate(item) {
    const savedAt = Number(item.id.split("-")[0]);
    return Number.isFinite(savedAt) && savedAt > 0
        ? new Date(savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : item.label;
}
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char] ?? char);
}
function normalizeResult(value) {
    if (Array.isArray(value))
        return value;
    return [{ label: "", value: value }];
}
// What a card shows, shared by the cards and the copied text. Each class carries its level, e.g. "Sorcerer, level 8".
function buildCardEntries(build, key) {
    const value = build[key];
    if (key === "class" || key === "race") {
        const entries = normalizeResult(value);
        return entries.flatMap((entry, index) => {
            if (entry.label === "Level")
                return [];
            const level = entries[index + 1]?.label === "Level" ? entries[index + 1].value : null;
            return key === "class" && entry.label === "Class" && level ? [{ ...entry, value: `${entry.value}, level ${level}` }] : [entry];
        });
    }
    if (key === "feats") {
        const feats = (value || []);
        if (!feats.length)
            return [{ label: "", value: "No feats before level 4" }];
        return typeof feats[0] === "string" ? [{ label: "", value: feats }] : feats;
    }
    if (key === "background") {
        return normalizeResult(value).filter(entry => entry.label !== "Alignment" || settings.showAlignment);
    }
    if (key === "companionBuild")
        return normalizeResult(value);
    if (key === "abilities") {
        return normalizeResult(value).map(entry => {
            const score = Number(entry.value);
            return ABILITIES.includes(entry.label) && score ? { ...entry, value: `${score} (${abilityModifier(score)})` } : entry;
        });
    }
    if (key === "origin")
        return originEntries(value);
    return [{ label: "", value: value }];
}
function abilityModifier(score) {
    const modifier = Math.floor((score - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : String(modifier);
}
// The origin, with a note on what it fixes. Builds from before origins existed count as custom.
function originEntries(origin) {
    const name = origin || CUSTOM_ORIGIN;
    if (ORIGIN_CHARACTERS[name])
        return [{ label: "", value: name }, { label: "Set by this origin", value: "Race and background" }];
    if (name === DARK_URGE_ORIGIN)
        return [{ label: "", value: name }, { label: "Set by this origin", value: `Background (${DARK_URGE_BACKGROUND})` }];
    return [{ label: "", value: name }];
}
function isEntryList(value) {
    return Array.isArray(value) && value.every(entry => typeof entry === "object" && entry !== null &&
        typeof entry.label === "string" &&
        (entry.value === null || typeof entry.value === "string" ||
            Array.isArray(entry.value) && entry.value.every((item) => typeof item === "string")));
}
// Rebuilds a character from untrusted data (a shared link or stored state), keeping only well-formed fields.
function sanitizeCharacter(value) {
    if (typeof value !== "object" || value === null)
        return null;
    const input = value;
    if (!isEntryList(input.class) || !isEntryList(input.race))
        return null;
    const text = (item) => typeof item === "string" ? item : null;
    const result = { class: input.class, race: input.race, darkUrge: text(input.darkUrge), romance: text(input.romance) };
    if (isEntryList(input.feats))
        result.feats = input.feats;
    else if (Array.isArray(input.feats) && input.feats.every(item => typeof item === "string"))
        result.feats = input.feats;
    if (isEntryList(input.background) || typeof input.background === "string")
        result.background = input.background;
    if (isEntryList(input.companionBuild))
        result.companionBuild = input.companionBuild;
    if (isEntryList(input.abilities))
        result.abilities = input.abilities;
    if (typeof input.origin === "string")
        result.origin = input.origin;
    return result;
}
function toBase64Url(bytes) {
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(text) {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
}
// Links hold the whole build, compressed where the browser supports it ("z"), or plain JSON ("j").
async function encodeBuild(build) {
    const json = JSON.stringify(build);
    if (typeof CompressionStream === "function") {
        const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
        return "z" + toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
    }
    return "j" + toBase64Url(new TextEncoder().encode(json));
}
async function decodeBuild(code) {
    try {
        const bytes = fromBase64Url(code.slice(1));
        let json;
        if (code[0] === "z") {
            const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
            json = await new Response(stream).text();
        }
        else if (code[0] === "j") {
            json = new TextDecoder().decode(bytes);
        }
        else {
            return null;
        }
        return sanitizeCharacter(JSON.parse(json));
    }
    catch {
        return null;
    }
}
// Spaces become hyphens so the name reads cleanly in the link; real hyphens stay encoded.
function nameToSlug(name) {
    return encodeURIComponent(name.replace(/-/g, "%2D")).replace(/%252D/g, "%2D").replace(/%20/g, "-");
}
function slugToName(slug) {
    try {
        const name = decodeURIComponent(slug.replace(/-/g, "%20")).trim().slice(0, MAX_NAME_LENGTH);
        return name || null;
    }
    catch {
        return null;
    }
}
// The Generator page's address. Pages set data-root to the path back to it ("../" from a sub-page);
// opened from disk, links point at the live site instead.
function homeURL() {
    if (!location.protocol.startsWith("http"))
        return SITE_URL;
    const url = new URL(document.body.dataset.root || "./", location.href);
    url.hash = "";
    url.search = "";
    return url.href;
}
async function buildLink(build, name) {
    return `${homeURL()}#${name ? `${nameToSlug(name)}&` : ""}build=${await encodeBuild(build)}`;
}
// Labels the copied text leaves out of the class details: they're in the class heading, the
// Skills and Expertise lines, or are armor and weapon proficiencies the game hands out anyway.
const TEXT_SKIPPED_CLASS_LABELS = ["Class", "Level", "Multiclass Proficiencies", "Subclass Proficiencies",
    "Preferred melee weapon", "Preferred ranged weapon", ...Object.values(SUBCLASS_LABELS)];
const ABILITY_SHORT = {
    Strength: "STR", Dexterity: "DEX", Constitution: "CON", Intelligence: "INT", Wisdom: "WIS", Charisma: "CHA"
};
function listText(values) {
    return values.filter(Boolean).join(", ");
}
// "Ability Improvement: +2 Dexterity" reads as "Ability Improvement (+2 Dexterity)" in a list.
function choiceText(value) {
    const [name, ...choice] = value.split(":");
    return choice.length ? `${name.trim()} (${choice.join(":").trim()})` : value;
}
// Each class as a bullet, "Bard 12 (College of Lore)", with its choices indented under it.
function classTextLines(build) {
    const lines = [];
    const blocks = [];
    for (const entry of build.class || []) {
        if (entry.label === "Class")
            blocks.push([]);
        blocks[blocks.length - 1]?.push(entry);
    }
    for (const entries of blocks) {
        const className = entryText(entries, "Class")[0] ?? "";
        const level = entryText(entries, "Level")[0] ?? String(MAX_LEVEL);
        const subclass = entryText(entries, SUBCLASS_LABELS[className] ?? "Subclass")[0];
        lines.push(`- **${className} ${level}**${subclass ? ` (${subclass})` : ""}`);
        const weapons = [...entryText(entries, "Preferred melee weapon"), ...entryText(entries, "Preferred ranged weapon")];
        for (const entry of entries) {
            if (TEXT_SKIPPED_CLASS_LABELS.includes(entry.label) || CLASS_SKILL_LABELS.includes(entry.label) || entry.label.includes("Expertise"))
                continue;
            const value = listText(entryValues(entry));
            if (value)
                lines.push(`    - ${entry.label}: ${value}`);
        }
        if (weapons.length)
            lines.push(`    - Weapons: ${listText(weapons)}`);
    }
    return lines;
}
// One line per companion: "Astarion: Rogue (Arcane Trickster), Rapier and Shortbow".
function companionTextLines(build) {
    const members = [];
    for (const entry of build.companionBuild || []) {
        if (entry.label === "Companion" || entry.label === "Hireling" || entry.label === "Companion or hireling")
            members.push([]);
        members[members.length - 1]?.push(entry);
    }
    return members.map(entries => {
        const [first] = entries;
        const subclass = entryText(entries, "Subclass")[0];
        const weapons = [...entryText(entries, "Preferred melee weapon"), ...entryText(entries, "Preferred ranged weapon")];
        return `${first.value}: ${entryText(entries, "Class")[0] ?? ""}${subclass ? ` (${subclass})` : ""}` +
            (weapons.length ? `, ${weapons.join(" and ")}` : "");
    });
}
// Markdown for Reddit and Discord: a bold title, one line per card, and each class's choices
// indented under it. Hidden cards are left out, like on the page.
async function buildText(build, name) {
    const shown = new Set(visibleCards());
    const lines = [name ? `**${name}** · ${describeCharacter(build)}` : `**${describeCharacter(build)}**`, ""];
    const line = (label, value) => {
        if (value)
            lines.push(`- **${label}:** ${value}`);
    };
    if (shown.has("origin") && build.origin && build.origin !== CUSTOM_ORIGIN)
        line("Origin", build.origin);
    const race = entryText(build.race, "Subrace")[0] ?? entryText(build.race, "Race")[0];
    const raceExtras = (build.race || [])
        .filter(entry => !["Race", "Subrace", "Racial Proficiencies", "Additional Skill Proficiency"].includes(entry.label))
        .map(entry => `${entry.label}: ${listText(entryValues(entry))}`);
    line("Race", race && [race, ...raceExtras].join(" · "));
    line("Background", typeof build.background === "string" ? build.background : entryText(build.background ?? undefined, "Background")[0]);
    if (settings.showAlignment && Array.isArray(build.background))
        line("Alignment", entryText(build.background, "Alignment")[0]);
    const skills = [...new Set([
            ...getRacialSkillProficiencies(build.race),
            ...getBackgroundSkillProficiencies(build.background),
            ...getClassSkillProficiencies(build.class)
        ])];
    line("Skills", listText(skills));
    line("Expertise", listText((build.class || []).filter(entry => entry.label.includes("Expertise")).flatMap(entryValues)));
    if (shown.has("abilities") && build.abilities) {
        const scores = ABILITIES.map(ability => `${ABILITY_SHORT[ability]} ${entryText(build.abilities, ability)[0] ?? "?"}`);
        const bonuses = entryText(build.abilities, "Racial bonuses")[0];
        line("Ability scores", `${scores.join(", ")}${bonuses ? ` (${bonuses})` : ""}`);
    }
    lines.push(...classTextLines(build));
    line("Feats", listText(featValues(build.feats).map(choiceText)) || "None before level 4");
    if (shown.has("darkUrge"))
        line("Tadpole", build.darkUrge);
    if (shown.has("romance"))
        line("Romance", build.romance);
    if (shown.has("companionBuild")) {
        const companions = companionTextLines(build);
        if (companions.length === 1)
            line(entryText(build.companionBuild, "Hireling").length ? "Hireling" : "Companion", companions[0]);
        else if (companions.length) {
            lines.push("- **Party:**");
            companions.forEach(companion => lines.push(`    - ${companion}`));
        }
    }
    lines.push("", `[Open this build in the BG3 Character Generator](${await buildLink(build, name)})`);
    return lines.join("\n");
}
// Pictures of saved builds, keyed by the saved build's id. They live in IndexedDB because
// localStorage only holds a few megabytes, and are kept as data URLs so they go straight into
// build files. Every function here resolves quietly when IndexedDB is unavailable.
const PICTURE_DB = "bg3-character-generator";
const PICTURE_STORE = "pictures";
// Pictures are shrunk to fit this many pixels on their longest side before they're stored.
const PICTURE_SIZE = 640;
// Anything bigger in a build file is ignored, so a shared file can't fill up storage.
const MAX_PICTURE_LENGTH = 1_500_000;
// One connection per page, opened the first time a picture is needed.
let pictureDB = null;
function openPictures() {
    pictureDB ??= new Promise(resolve => {
        try {
            const request = indexedDB.open(PICTURE_DB, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(PICTURE_STORE);
            request.onsuccess = () => {
                const db = request.result;
                // Another tab upgrading the database closes this connection; the next call reopens it.
                db.onversionchange = () => {
                    db.close();
                    pictureDB = null;
                };
                resolve(db);
            };
            request.onerror = () => resolve(null);
        }
        catch {
            resolve(null);
        }
    });
    return pictureDB;
}
// Runs one request. A write only counts once its transaction completes, since a full disk
// aborts the transaction after the request itself has already succeeded.
async function pictureRequest(mode, run) {
    const db = await openPictures();
    if (!db)
        return null;
    return new Promise(resolve => {
        try {
            const transaction = db.transaction(PICTURE_STORE, mode);
            const request = run(transaction.objectStore(PICTURE_STORE));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = () => resolve(null);
            transaction.onerror = () => resolve(null);
        }
        catch {
            resolve(null);
        }
    });
}
async function getPicture(id) {
    const picture = await pictureRequest("readonly", store => store.get(id));
    return isPictureData(picture) ? picture : null;
}
// Every stored picture, read in one pass so ids and pictures can't fall out of step.
async function getAllPictures() {
    const pictures = new Map();
    await pictureRequest("readonly", store => {
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
            const entry = cursor.result;
            if (!entry)
                return;
            if (typeof entry.key === "string" && isPictureData(entry.value))
                pictures.set(entry.key, entry.value);
            entry.continue();
        };
        return cursor;
    });
    return pictures;
}
// Resolves false when the picture couldn't be stored.
async function storePicture(id, picture) {
    return await pictureRequest("readwrite", store => store.put(picture, id)) !== null;
}
async function deletePicture(id) {
    await pictureRequest("readwrite", store => store.delete(id));
}
// Only raster images, so a picture from a shared file can't carry script the way an SVG could.
function isPictureData(value) {
    return typeof value === "string" && value.length <= MAX_PICTURE_LENGTH &&
        /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(value);
}
// Shrinks an image file and re-encodes it as WebP, or JPEG where the browser can't write WebP.
async function shrinkPicture(file) {
    try {
        const image = await createImageBitmap(file);
        const scale = Math.min(1, PICTURE_SIZE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        // See-through parts take the picture frame's dark color, rather than black where JPEG is used.
        context.fillStyle = "#302628";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.close();
        const webp = canvas.toDataURL("image/webp", 0.82);
        const picture = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
        return isPictureData(picture) ? picture : null;
    }
    catch {
        return null;
    }
}
// Counts an action, like "generate", on GoatCounter. Counts are anonymous and use no cookies.
// Does nothing when the counter is blocked or hasn't loaded, and GoatCounter skips localhost.
function trackEvent(name) {
    try {
        window.goatcounter?.count?.({ path: name, title: name, event: true });
    }
    catch {
        // Counting never gets in the way of the page.
    }
}
// Messages like "Build link copied." clear themselves after a few seconds.
const NOTICE_SECONDS = 4;
let noticeTimer;
function setNotice(message) {
    const notice = document.getElementById("notice");
    if (!notice)
        return;
    clearTimeout(noticeTimer);
    notice.textContent = message;
    if (message)
        noticeTimer = window.setTimeout(() => { notice.textContent = ""; }, NOTICE_SECONDS * 1000);
}
async function copyToClipboard(text, message) {
    try {
        await navigator.clipboard.writeText(text);
        hideCopyBox();
        setNotice(message);
    }
    catch {
        // Clipboard access can be blocked; show the text on the page to copy by hand.
        showCopyBox(text);
    }
}
function showCopyBox(text) {
    const box = document.getElementById("copyBox");
    const field = document.getElementById("copyField");
    field.value = text;
    field.rows = Math.min(12, text.split("\n").length + 1);
    box.hidden = false;
    setNotice("");
    field.focus();
    field.select();
}
function hideCopyBox() {
    const box = document.getElementById("copyBox");
    if (box)
        box.hidden = true;
}
// The Saved link in the header shows how many builds are saved.
function updateNav() {
    const count = getSavedCharacters().length;
    document.querySelectorAll("[data-saved-count]").forEach(badge => {
        badge.textContent = count ? String(count) : "";
    });
}
// Lets the site open without a connection once it's been visited (see sw.js). Only works over
// https or on localhost, so opening the files straight from disk skips it.
function registerOffline() {
    if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http"))
        return;
    const script = new URL(`${document.body.dataset.root || "./"}sw.js`, location.href);
    navigator.serviceWorker.register(script.href).catch(() => {
        // The site still works online without it.
    });
}
settings = loadSettings();
updateNav();
registerOffline();
document.getElementById("copyClose")?.addEventListener("click", hideCopyBox);
