"use strict";
function toggleHTML(name, label) {
    return `<label class="check"><input type="checkbox" name="${name}"${settings[name] ? " checked" : ""}> ${escapeHTML(label)}</label>`;
}
function checkboxHTML(name, value, label, checked) {
    return `<label class="check"><input type="checkbox" name="${name}" value="${escapeHTML(value)}"${checked ? " checked" : ""}> ${escapeHTML(label)}</label>`;
}
// A pill-shaped toggle for the class and race lists: pink when it can be rolled.
function chipHTML(name, value, checked) {
    return `<label class="chip"><input type="checkbox" name="${name}" value="${escapeHTML(value)}"${checked ? " checked" : ""}><span>${escapeHTML(value)}</span></label>`;
}
function renderSettings() {
    const panel = document.getElementById("settingsPanel");
    // Grouped by purpose: how your character rolls, who comes along, what can be rolled, and what's shown.
    panel.innerHTML = `
    <section class="settings-section settings-character">
      <h2>Your character</h2>
      <div class="settings-row">
        <fieldset class="settings-group">
          <legend>Multiclass</legend>
          <div class="segmented">
            ${MULTICLASS_MODES.map(({ mode, label }) => `<label><input type="radio" name="multiclass" value="${mode}"${settings.multiclass === mode ? " checked" : ""}><span>${label}</span></label>`).join("")}
          </div>
          ${toggleHTML("tripleClass", "Allow triple classing")}
          ${toggleHTML("showLevelOrder", "Show level-up order")}
          <p class="settings-note">Sometimes will roll a multiclass build ${data.settings.multiclassChance}% of the time. Triple classing gives ${data.settings.tripleClassChance}% of those a third class.</p>
        </fieldset>
        <fieldset class="settings-group">
          <legend>Origin</legend>
          ${toggleHTML("originCharacters", "Allow origin characters")}
          <p class="settings-note">Allows you to play as an origin character instead of only custom characters.</p>
        </fieldset>
      </div>
    </section>
    <section class="settings-section">
      <h2>Companions</h2>
      <fieldset class="settings-group">
        <legend class="visually-hidden">Companions</legend>
        ${toggleHTML("party", "Generate a full party")}
        <p class="settings-note">Rolls three companions instead of one.</p>
      </fieldset>
    </section>
    <section class="settings-section">
      <h2>Cards</h2>
      <fieldset class="settings-group">
        <legend class="visually-hidden">Cards to show</legend>
        ${HIDEABLE_CARDS.map(({ key, label }) => checkboxHTML("showCard", key, label, !settings.hiddenCards.includes(key)) +
        // Alignment isn't a card of its own, so it's slotted in after Romance.
        (key === "romance" ? toggleHTML("showAlignment", "Alignment") : "")).join("")}
      </fieldset>
    </section>
    <section class="settings-section settings-pools">
      <h2>Classes and races</h2>
      <div class="settings-stack">
        <fieldset class="settings-group settings-list">
          <legend>Classes</legend>
          <div class="chips">${Object.keys(data.classes).sort().map(name => chipHTML("class", name, !settings.excludedClasses.includes(name))).join("")}</div>
        </fieldset>
        <fieldset class="settings-group settings-list">
          <legend>Races</legend>
          <div class="chips">${Object.keys(data.races).sort().map(name => chipHTML("race", name, !settings.excludedRaces.includes(name))).join("")}</div>
        </fieldset>
      </div>
    </section>
    <div class="settings-foot">
      <p class="settings-note">Your settings save automatically and take effect the next time you generate a character.</p>
      <button type="button" id="resetSettings">Reset to default</button>
    </div>`;
    updateSettingsControls();
}
// Keeps at least one class and race checked, and turns off triple classing where it can't happen.
function updateSettingsControls() {
    const panel = document.getElementById("settingsPanel");
    for (const name of ["class", "race"]) {
        const boxes = [...panel.querySelectorAll(`input[name="${name}"]`)];
        const checked = boxes.filter(box => box.checked);
        boxes.forEach(box => { box.disabled = checked.length === 1 && box.checked; });
    }
    const triple = panel.querySelector('input[name="tripleClass"]');
    triple.disabled = settings.multiclass === "never" || allowedClasses().length < 3;
    // With no multiclass builds there's no level-up order to show.
    panel.querySelector('input[name="showLevelOrder"]').disabled = settings.multiclass === "never";
    // The Origin card can only be shown or hidden while origin characters are allowed.
    const originCard = panel.querySelector('input[name="showCard"][value="origin"]');
    originCard.closest("label").hidden = !settings.originCharacters;
}
function readSettings(event) {
    const panel = document.getElementById("settingsPanel");
    // Turning origin characters on shows the Origin card again.
    const changed = event?.target;
    if (changed?.name === "originCharacters" && changed.checked) {
        panel.querySelector('input[name="showCard"][value="origin"]').checked = true;
    }
    const unchecked = (name) => [...panel.querySelectorAll(`input[name="${name}"]:not(:checked)`)].map(box => box.value);
    const isOn = (name) => panel.querySelector(`input[name="${name}"]`).checked;
    settings = {
        excludedClasses: unchecked("class"),
        excludedRaces: unchecked("race"),
        multiclass: (panel.querySelector('input[name="multiclass"]:checked')?.value ?? "sometimes"),
        tripleClass: isOn("tripleClass"),
        hiddenCards: unchecked("showCard"),
        party: isOn("party"),
        originCharacters: isOn("originCharacters"),
        showAlignment: isOn("showAlignment"),
        showLevelOrder: isOn("showLevelOrder")
    };
    storeSettings();
    updateSettingsControls();
    // Which options people change, e.g. "setting-party-on", "setting-class-Bard-off" or "setting-multiclass-always".
    if (changed) {
        const value = changed.value === "on" ? "" : `-${changed.value}`;
        trackEvent(`setting-${changed.name}${value}${changed.type === "checkbox" ? (changed.checked ? "-on" : "-off") : ""}`);
    }
}
document.getElementById("settingsPanel").addEventListener("change", readSettings);
document.getElementById("settingsPanel").addEventListener("click", event => {
    if (event.target.id !== "resetSettings")
        return;
    settings = defaultSettings();
    storeSettings();
    renderSettings();
});
renderSettings();
