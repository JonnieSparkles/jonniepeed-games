(function () {
  'use strict';
  if (location.hash !== '#tune' || !window.StickArmyTune) return;
  var tuning = window.StickArmyTune;
  var fields = [
    ['CAPTURE_SPEED', 'Capture speed', 150, 600, 10, 'px/s'],
    ['DROP_CHANCE', 'Drops over a mat', 0, 1, 0.01, 'chance'],
    ['RIFLE_COOLDOWN', 'Rifle cooldown', 0.3, 5, 0.1, 's'],
    ['RIFLE_SPREAD', 'Rifle spread', 0, 0.4, 0.01, 'rad'],
    ['PLANES_PER_WAVE', 'Planes added per wave', 0, 5, 0.5, ''],
    ['FALL_PER_WAVE', 'Fall speed added per wave', 0, 12, 0.5, 'px/s'],
    ['DROPS_PER_WAVE', 'Drops added per wave', 0, 2, 0.1, ''],
    ['WALL_DAMAGE', 'Lander wall damage', 0, 15, 0.5, 'HP/s']
  ];
  var style = document.createElement('style');
  style.textContent = '#tunePanel{position:absolute;right:12px;top:12px;z-index:4;width:min(300px,calc(100% - 24px));max-height:calc(100% - 90px);overflow:auto;box-sizing:border-box;padding:10px 12px;background:#fbf8ef;color:#2e2e33;border:2px solid #2e2e33;border-radius:8px;box-shadow:3px 3px #2e2e3322;font:14px/1.25 "Atkinson Hyperlegible",sans-serif;touch-action:pan-y}#tunePanel summary{cursor:pointer;font:22px "Schoolbell",cursive}#tunePanel label{display:grid;grid-template-columns:1fr auto;gap:4px;margin-top:9px}#tunePanel input{grid-column:1 / -1;width:100%;margin:0;accent-color:#2f6fdc}#tunePanel button{margin-top:10px;min-height:36px;padding:5px 10px;background:#2f6fdc;color:white;border:2px solid #2e2e33;border-radius:5px;font:16px "Schoolbell",cursive;cursor:pointer}#tunePanel textarea{width:100%;box-sizing:border-box;height:100px;margin-top:8px;font:12px monospace}#tuneStatus{margin:6px 0 0}';
  document.head.appendChild(style);
  var panel = document.createElement('details'); panel.id = 'tunePanel'; panel.open = true;
  var summary = document.createElement('summary'); summary.textContent = 'Tune · live values'; panel.append(summary);
  var values = tuning.getValues();
  fields.forEach(function (field) {
    var key = field[0], label = document.createElement('label'), name = document.createElement('span'), value = document.createElement('output'), input = document.createElement('input');
    name.textContent = field[1]; input.type = 'range'; input.min = field[2]; input.max = field[3]; input.step = field[4]; input.value = values[key]; input.dataset.key = key;
    input.id = 'tune-' + key; label.htmlFor = input.id; value.htmlFor = input.id;
    function changed() {
      tuning.setValue(key, Number(input.value));
      value.textContent = input.value + (field[5] ? ' ' + field[5] : '');
    }
    value.textContent = input.value + (field[5] ? ' ' + field[5] : '');
    input.addEventListener('input', changed); label.append(name, value, input); panel.append(label);
  });
  var copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy values';
  var status = document.createElement('p'); status.id = 'tuneStatus'; status.setAttribute('role', 'status');
  var fallback = document.createElement('textarea'); fallback.hidden = true; fallback.readOnly = true; fallback.setAttribute('aria-label', 'Tuning values as JSON');
  copy.addEventListener('click', async function () {
    var json = JSON.stringify(tuning.getValues(), null, 2);
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(json);
      fallback.hidden = true; status.textContent = 'Values copied.';
    } catch (e) {
      fallback.value = json; fallback.hidden = false; fallback.focus(); fallback.select();
      status.textContent = 'Copy the selected JSON.';
    }
  });
  panel.append(copy, status, fallback);
  panel.addEventListener('pointerdown', tuning.releaseInput);
  panel.addEventListener('focusin', tuning.releaseInput);
  document.getElementById('wrap').append(panel);
})();
