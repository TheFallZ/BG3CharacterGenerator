"use strict";
// The Settings page. Changes save as soon as they're made.
function checkboxHTML(name, value, label, checked) {
    return `<label class="check"><input type="checkbox" name="${name}" value="${escapeHTML(value)}"${checked ? " checked" : ""}> ${escapeHTML(label)}</label>`;
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
          <label class="check"><input type="checkbox" name="tripleClass"${settings.tripleClass ? " checked" : ""}> Allow triple classing</label>
          <p class="settings-note">Sometimes rolls a multiclass build ${data.settings.multiclassChance}% of the time. Triple classing gives ${data.settings.tripleClassChance}% of those a third class.</p>
        </fieldset>
        <fieldset class="settings-group">
          <legend>Origin</legend>
          <label class="check"><input type="checkbox" name="originCharacters"${settings.originCharacters ? " checked" : ""}> Allow origin characters</label>
          <p class="settings-note">Allows you to play as an origin character instead of only custom characters.</p>
        </fieldset>
      </div>
    </section>
    <section class="settings-section">
      <h2>Companions</h2>
      <fieldset class="settings-group">
        <legend class="visually-hidden">Companions</legend>
        <label class="check"><input type="checkbox" name="party"${settings.party ? " checked" : ""}> Generate a full party</label>
        <p class="settings-note">Rolls three companions instead of one, including your romance when there is one.</p>
      </fieldset>
    </section>
    <section class="settings-section">
      <h2>Cards</h2>
      <fieldset class="settings-group">
        <legend class="settings-intro">Show these cards on the Generator</legend>
        ${HIDEABLE_CARDS.map(({ key, label }) => checkboxHTML("showCard", key, label, !settings.hiddenCards.includes(key))).join("")}
      </fieldset>
    </section>
    <section class="settings-section settings-pools">
      <h2>Classes and races</h2>
      <div class="settings-row">
        <fieldset class="settings-group settings-list">
          <legend>Classes</legend>
          ${Object.keys(data.classes).map(name => checkboxHTML("class", name, name, !settings.excludedClasses.includes(name))).join("")}
        </fieldset>
        <fieldset class="settings-group settings-list">
          <legend>Races</legend>
          ${Object.keys(data.races).map(name => checkboxHTML("race", name, name, !settings.excludedRaces.includes(name))).join("")}
        </fieldset>
      </div>
    </section>
    <div class="settings-foot">
      <p class="settings-note">Settings save automatically. Changes to what can be rolled apply the next time you generate or reroll.</p>
      <button type="button" id="resetSettings">Reset to defaults</button>
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
    settings = {
        excludedClasses: unchecked("class"),
        excludedRaces: unchecked("race"),
        multiclass: (panel.querySelector('input[name="multiclass"]:checked')?.value ?? "sometimes"),
        tripleClass: panel.querySelector('input[name="tripleClass"]').checked,
        hiddenCards: unchecked("showCard"),
        party: panel.querySelector('input[name="party"]').checked,
        originCharacters: panel.querySelector('input[name="originCharacters"]').checked
    };
    storeSettings();
    updateSettingsControls();
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
