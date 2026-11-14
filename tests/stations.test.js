import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, provincesNear } from '../stations.js';

test('GPS radius crosses provincial boundaries', () => {
  const provinces = [
    { id: '17', bounds: [2.7, 41.8, 3.2, 42.5] },
    { id: '08', bounds: [2.1, 41.5, 2.8, 42.0] },
    { id: '25', bounds: [0.4, 41.4, 1.5, 42.9] },
  ];
  assert.deepEqual(provincesNear(provinces, { lat: 41.99, lon: 2.78 }, 25).map((x) => x.id), ['17', '08']);
});

test('distance is measured in km, not lat/lon degrees', () => {
  const girona = { lat: 41.9794, lon: 2.8214 };
  assert.equal(distanceKm(girona, girona), 0);
  assert.ok(distanceKm(girona, { lat: 41.9794, lon: 2.9214 }) > 8);
  assert.ok(distanceKm(girona, { lat: 41.9794, lon: 2.9214 }) < 9);
});
