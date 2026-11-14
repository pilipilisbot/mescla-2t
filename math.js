/** The oil percentage is relative to gasoline volume, not final mixture volume. */
export function oilForGasoline(litres, percent) {
  if (!Number.isFinite(litres) || !Number.isFinite(percent) || litres <= 0 || percent <= 0) return NaN;
  return litres * percent * 10;
}

export function gasolineForOil(millilitres, percent) {
  if (!Number.isFinite(millilitres) || !Number.isFinite(percent) || millilitres <= 0 || percent <= 0) return NaN;
  return millilitres / (percent * 10);
}

export function parsePositiveDecimal(value) {
  const normalized = String(value).trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
  const number = Number(normalized);
  return number > 0 && Number.isFinite(number) ? number : NaN;
}
