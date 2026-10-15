"use strict";
// The Settings page. Changes save as soon as they're made.
function checkboxHTML(name, value, label, checked) {
    return `<label class="check"><input type="checkbox" name="${name}" value="${escapeHTML(value)}"${checked ? " checked" : ""}> ${escapeHTML(label)}</label>`;
}
function renderSettings() {
    const panel = document.getElementById("settingsPanel");
    panel.innerHTML = `
    <fieldset class="settings-group">
      <legend>Multiclass</legend>
      <div class="segmented">
        ${MULTICLASS_MODES.map(({ mode, label }) => `<label><input type="radio" name="multiclass" value="${mode}"${settings.multiclass === mode ? " checked" : ""}><span>${label}</span></label>`).join("")}
      </div>
      <label class="check"><input type="checkbox" name="tripleClass"${settings.tripleClass ? " checked" : ""}> Allow triple classing</label>
      <p class="settings-note">"Sometimes" is a ${data.settings.multiclassChance}% chance. With triple classing on, ${data.settings.tripleClassChance}% of multiclass builds get three classes.</p>
    </fieldset>
    <fieldset class="settings-group">
      <legend>Show cards</legend>
      ${HIDEABLE_CARDS.map(({ key, label }) => checkboxHTML("showCard", key, label, !settings.hiddenCards.includes(key))).join("")}
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
      <p class="settings-note">Settings save automatically. Class, race and multiclass changes apply the next time you generate or reroll.</p>
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
}
function readSettings() {
    const panel = document.getElementById("settingsPanel");
    const unchecked = (name) => [...panel.querySelectorAll(`input[name="${name}"]:not(:checked)`)].map(box => box.value);
    settings = {
        excludedClasses: unchecked("class"),
        excludedRaces: unchecked("race"),
        multiclass: (panel.querySelector('input[name="multiclass"]:checked')?.value ?? "sometimes"),
        tripleClass: panel.querySelector('input[name="tripleClass"]').checked,
        hiddenCards: unchecked("showCard")
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
