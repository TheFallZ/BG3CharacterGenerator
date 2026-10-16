"use strict";

// The Settings page. Changes save as soon as they're made.

function checkboxHTML(name: string, value: string, label: string, checked: boolean): string {
  return `<label class="check"><input type="checkbox" name="${name}" value="${escapeHTML(value)}"${checked ? " checked" : ""}> ${escapeHTML(label)}</label>`;
}

// A pill-shaped toggle for the class and race lists: pink when it can be rolled.
function chipHTML(name: string, value: string, checked: boolean): string {
  return `<label class="chip"><input type="checkbox" name="${name}" value="${escapeHTML(value)}"${checked ? " checked" : ""}><span>${escapeHTML(value)}</span></label>`;
}

function renderSettings(): void {
  const panel = document.getElementById("settingsPanel") as HTMLElement;
  // Grouped by purpose: how your character rolls, who comes along, what can be rolled, and what's shown.
  panel.innerHTML = `
    <section class="settings-section settings-character">
      <h2>Your character</h2>
      <div class="settings-row">
        <fieldset class="settings-group">
          <legend>Multiclass</legend>
          <div class="segmented">
            ${MULTICLASS_MODES.map(({mode, label}) => `<label><input type="radio" name="multiclass" value="${mode}"${settings.multiclass === mode ? " checked" : ""}><span>${label}</span></label>`).join("")}
          </div>
          <label class="check"><input type="checkbox" name="tripleClass"${settings.tripleClass ? " checked" : ""}> Allow triple classing</label>
          <label class="check"><input type="checkbox" name="showLevelOrder"${settings.showLevelOrder ? " checked" : ""}> Show level-up order</label>
          <p class="settings-note">Sometimes will roll a multiclass build ${data.settings.multiclassChance}% of the time. Triple classing gives ${data.settings.tripleClassChance}% of those a third class.</p>
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
        <p class="settings-note">Rolls three companions instead of one.</p>
      </fieldset>
    </section>
    <section class="settings-section">
      <h2>Cards</h2>
      <fieldset class="settings-group">
        <legend class="visually-hidden">Cards to show</legend>
        ${HIDEABLE_CARDS.map(({key, label}) => checkboxHTML("showCard", key, label, !settings.hiddenCards.includes(key)) +
          // Alignment isn't a card of its own, so it's slotted in after Romance.
          (key === "romance" ? `<label class="check"><input type="checkbox" name="showAlignment"${settings.showAlignment ? " checked" : ""}> Alignment</label>` : "")).join("")}
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
function updateSettingsControls(): void {
  const panel = document.getElementById("settingsPanel") as HTMLElement;
  for (const name of ["class", "race"]) {
    const boxes = [...panel.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)];
    const checked = boxes.filter(box => box.checked);
    boxes.forEach(box => { box.disabled = checked.length === 1 && box.checked; });
  }
  const triple = panel.querySelector<HTMLInputElement>('input[name="tripleClass"]')!;
  triple.disabled = settings.multiclass === "never" || allowedClasses().length < 3;
  // With no multiclass builds there's no level-up order to show.
  panel.querySelector<HTMLInputElement>('input[name="showLevelOrder"]')!.disabled = settings.multiclass === "never";
  // The Origin card can only be shown or hidden while origin characters are allowed.
  const originCard = panel.querySelector<HTMLInputElement>('input[name="showCard"][value="origin"]')!;
  originCard.closest("label")!.hidden = !settings.originCharacters;
}

function readSettings(event?: Event): void {
  const panel = document.getElementById("settingsPanel") as HTMLElement;
  // Turning origin characters on shows the Origin card again.
  const changed = event?.target as HTMLInputElement | undefined;
  if (changed?.name === "originCharacters" && changed.checked) {
    panel.querySelector<HTMLInputElement>('input[name="showCard"][value="origin"]')!.checked = true;
  }
  const unchecked = (name: string) =>
    [...panel.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:not(:checked)`)].map(box => box.value);
  settings = {
    excludedClasses: unchecked("class"),
    excludedRaces: unchecked("race"),
    multiclass: (panel.querySelector<HTMLInputElement>('input[name="multiclass"]:checked')?.value ?? "sometimes") as MulticlassMode,
    tripleClass: panel.querySelector<HTMLInputElement>('input[name="tripleClass"]')!.checked,
    hiddenCards: unchecked("showCard") as CardKey[],
    party: panel.querySelector<HTMLInputElement>('input[name="party"]')!.checked,
    originCharacters: panel.querySelector<HTMLInputElement>('input[name="originCharacters"]')!.checked,
    showAlignment: panel.querySelector<HTMLInputElement>('input[name="showAlignment"]')!.checked,
    showLevelOrder: panel.querySelector<HTMLInputElement>('input[name="showLevelOrder"]')!.checked
  };
  storeSettings();
  updateSettingsControls();
  // Which options people change, e.g. "setting-party-on", "setting-class-Bard-off" or "setting-multiclass-always".
  if (changed) {
    const value = changed.value === "on" ? "" : `-${changed.value}`;
    trackEvent(`setting-${changed.name}${value}${changed.type === "checkbox" ? (changed.checked ? "-on" : "-off") : ""}`);
  }
}

document.getElementById("settingsPanel")!.addEventListener("change", readSettings);
document.getElementById("settingsPanel")!.addEventListener("click", event => {
  if ((event.target as HTMLElement).id !== "resetSettings") return;
  settings = defaultSettings();
  storeSettings();
  renderSettings();
});

renderSettings();
