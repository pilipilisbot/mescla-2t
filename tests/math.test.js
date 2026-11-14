import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { oilForGasoline, gasolineForOil, parsePositiveDecimal } from '../math.js';

test('2%: 5 L of gasoline require 100 ml of oil', () => assert.equal(oilForGasoline(5, 2), 100));
test('reverse calculation: 100 ml at 2% permit 5 L of gasoline', () => assert.equal(gasolineForOil(100, 2), 5));
test('fractional percentage works in both directions', () => {
  assert.equal(oilForGasoline(2, 1.5), 30);
  assert.equal(gasolineForOil(30, 1.5), 2);
});
test('Catalan comma decimal is accepted; invalid values are rejected', () => {
  assert.equal(parsePositiveDecimal('1,75'), 1.75);
  assert.ok(Number.isNaN(parsePositiveDecimal('0')));
  assert.ok(Number.isNaN(parsePositiveDecimal('2abc')));
});
