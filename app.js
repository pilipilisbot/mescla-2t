import { oilForGasoline, gasolineForOil, parsePositiveDecimal } from './math.js';

const presetPercents = [1, 1.5, 2, 2.5, 3, 4];
const quickValues = { fuel: [1, 2, 5, 10, 20], oil: [20, 50, 100, 200, 500] };
const format = (value, digits = 2) => new Intl.NumberFormat('ca-ES', { maximumFractionDigits: digits }).format(value);
const $ = (id) => document.getElementById(id);
const savedPercent = Number(localStorage.getItem('mescla-percent'));
const state = {
  mode: 'fuel',
  amounts: { fuel: '5', oil: '100' },
  percent: savedPercent >= 0.1 && savedPercent <= 10 ? savedPercent : 2,
  custom: false,
};
state.custom = !presetPercents.includes(state.percent);

function renderMode() {
  for (const mode of ['fuel', 'oil']) {
    $(`mode-${mode}`).classList.toggle('active', state.mode === mode);
    $(`mode-${mode}`).setAttribute('aria-pressed', String(state.mode === mode));
  }
  $('amount-label').textContent = state.mode === 'fuel' ? '3. Quanta gasolina tens?' : '3. Quant oli tens?';
  $('amount-unit-label').textContent = state.mode === 'fuel' ? 'LITRES' : 'MIL·LILITRES';
  $('amount-suffix').textContent = state.mode === 'fuel' ? 'L' : 'ml';
  $('amount').value = state.amounts[state.mode];
  $('result-heading').textContent = state.mode === 'fuel' ? 'OLI QUE HAS D’AFEGIR' : 'GASOLINA QUE NECESSITES';
  $('result-unit').textContent = state.mode === 'fuel' ? 'ml' : 'L';
  $('quick-values').replaceChildren(...quickValues[state.mode].map((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${value} ${state.mode === 'fuel' ? 'L' : 'ml'}`;
    button.addEventListener('click', () => {
      state.amounts[state.mode] = String(value);
      $('amount').value = String(value);
      update();
    });
    return button;
  }));
  update();
}

function renderPercents() {
  const buttons = presetPercents.map((percent) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${format(percent)}%`;
    button.classList.toggle('selected', !state.custom && state.percent === percent);
    button.setAttribute('aria-pressed', String(!state.custom && state.percent === percent));
    button.addEventListener('click', () => {
      state.percent = percent;
      state.custom = false;
      localStorage.setItem('mescla-percent', String(percent));
      renderPercents();
      update();
    });
    return button;
  });
  const custom = document.createElement('button');
  custom.type = 'button';
  custom.textContent = 'Personalitzat';
  custom.classList.toggle('selected', state.custom);
  custom.setAttribute('aria-pressed', String(state.custom));
  custom.addEventListener('click', () => {
    state.custom = true;
    $('custom-percent').value = presetPercents.includes(state.percent) ? '' : String(state.percent).replace('.', ',');
    renderPercents();
    $('custom-percent').focus();
    update();
  });
  $('percent-options').replaceChildren(...buttons, custom);
  $('custom-row').hidden = !state.custom;
}

function update() {
  const amount = parsePositiveDecimal($('amount').value);
  const percent = state.custom ? parsePositiveDecimal($('custom-percent').value) : state.percent;
  const amountValid = Number.isFinite(amount) && amount <= (state.mode === 'fuel' ? 100000 : 10000000);
  const percentValid = Number.isFinite(percent) && percent >= 0.1 && percent <= 10;
  $('amount-error').textContent = amountValid || $('amount').value.trim() === '' ? '' : 'Introdueix una quantitat positiva vàlida.';
  $('percent-error').textContent = !state.custom || percentValid || $('custom-percent').value.trim() === '' ? '' : 'Tria un percentatge entre 0,1% i 10%.';
  $('amount').setAttribute('aria-invalid', String(!amountValid && $('amount').value.trim() !== ''));
  $('custom-percent').setAttribute('aria-invalid', String(state.custom && !percentValid && $('custom-percent').value.trim() !== ''));
  const valid = amountValid && percentValid;
  $('result-card').classList.toggle('invalid', !valid);
  if (valid) {
    if (state.custom) {
      state.percent = percent;
      localStorage.setItem('mescla-percent', String(percent));
    }
    const result = state.mode === 'fuel' ? oilForGasoline(amount, percent) : gasolineForOil(amount, percent);
    $('result-value').textContent = format(result, state.mode === 'fuel' ? 2 : 3);
    $('result-detail').textContent = state.mode === 'fuel'
      ? `Per a ${format(amount, 3)} L de gasolina al ${format(percent)}%.`
      : `Amb ${format(amount, 2)} ml d’oli al ${format(percent)}%.`;
  } else {
    $('result-value').textContent = '—';
    $('result-detail').textContent = 'Introdueix una quantitat i un percentatge vàlids.';
  }
}

for (const mode of ['fuel', 'oil']) $('mode-' + mode).addEventListener('click', () => { state.mode = mode; renderMode(); });
$('amount').addEventListener('input', (event) => { state.amounts[state.mode] = event.target.value; update(); });
$('custom-percent').addEventListener('input', update);
renderPercents();
if (state.custom) $('custom-percent').value = String(state.percent).replace('.', ',');
renderMode();

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
let installPrompt;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  $('install-button').hidden = false;
});
$('install-button').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = undefined;
  $('install-button').hidden = true;
});
window.addEventListener('appinstalled', () => { $('install-button').hidden = true; });
