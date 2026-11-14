const API = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/';
const $ = (id) => document.getElementById(id);
const number = (value) => Number(String(value ?? '').replace(',', '.'));
const euro = (value) => new Intl.NumberFormat('ca-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
const km = (value) => new Intl.NumberFormat('ca-ES', { maximumFractionDigits: 1 }).format(value);
const radians = (degrees) => degrees * Math.PI / 180;

export function distanceKm(a, b) {
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function provincesNear(provinces, point, radius) {
  const latDelta = radius / 111;
  const lonDelta = radius / (111 * Math.max(0.1, Math.cos(radians(point.lat))));
  return provinces.filter(({ bounds: [west, south, east, north] }) =>
    west <= point.lon + lonDelta && east >= point.lon - lonDelta &&
    south <= point.lat + latDelta && north >= point.lat - latDelta);
}

function normaliseStation(raw) {
  const lat = number(raw.Latitud);
  const lon = number(raw['Longitud (WGS84)']);
  const price = number(raw['Precio Gasolina 95 E5']);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(price) || price <= 0) return null;
  return {
    id: raw.IDEESS,
    name: raw['Rótulo'] || 'Gasolinera',
    address: [raw.Dirección, raw.Municipio, raw.Provincia].filter(Boolean).join(' · '),
    lat, lon, price,
    hours: raw.Horario || '',
  };
}

export function priceBands(stations) {
  const prices = stations.map((station) => station.price).filter(Number.isFinite);
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const third = (max - min) / 3;
  return {
    min, max,
    tier(price) {
      if (min === max) return 'medium';
      if (price === min || price < min + third - 1e-9) return 'cheap';
      if (price === max || price > max - third + 1e-9) return 'expensive';
      return 'medium';
    },
  };
}

export function initStations() {
  let provinces;
  let map;
  let markers;
  let point;
  let mode = 'province';
  let activeProvince = '17';
  let stations = [];
  let selectedId = null;
  const markerById = new Map();
  const itemById = new Map();
  let request = 0;
  const cache = new Map();
  const status = $('stations-status');
  const updated = $('stations-updated');
  const list = $('stations-list');
  const legend = $('stations-legend');
  const provinceSelect = $('province-select');
  const radiusSelect = $('radius-select');
  const sortSelect = $('sort-select');

  function setStatus(message) { status.textContent = message; }

  function ensureMap() {
    if (map || !window.L) return;
    map = L.map('stations-map', { scrollWheelZoom: false }).setView([41.98, 2.82], 9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  }

  function stationId(station) { return String(station.id || `${station.lat},${station.lon}`); }

  function selectStation(id, fromList = false, scrollList = true) {
    selectedId = id;
    for (const [key, item] of itemById) {
      const selected = key === id;
      item.classList.toggle('selected', selected);
      item.querySelector('.station-select').setAttribute('aria-pressed', String(selected));
    }
    for (const [key, marker] of markerById) {
      marker.getElement()?.classList.toggle('selected', key === id);
      marker.setZIndexOffset(key === id ? 1000 : 0);
    }
    const item = itemById.get(id);
    const marker = markerById.get(id);
    if (fromList && marker && map) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14), { animate: true });
      marker.openPopup();
      $('stations-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (item && scrollList) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function render() {
    const radius = Number(radiusSelect.value);
    const visible = (mode === 'gps' ? stations.filter((station) => distanceKm(point, station) <= radius) : stations)
      .map((station) => ({ ...station, distance: point ? distanceKm(point, station) : null }))
      .sort((a, b) => sortSelect.value === 'price'
        ? a.price - b.price || (a.distance ?? 0) - (b.distance ?? 0)
        : (a.distance ?? 0) - (b.distance ?? 0) || a.price - b.price);
    setStatus(visible.length ? `${visible.length} gasolineres amb preu de Super 95${mode === 'gps' ? ` a ${radius} km o menys` : ''}.` : 'No hi ha gasolineres amb preu de Super 95 en aquesta zona. Prova un radi més gran.');
    const bands = priceBands(visible);
    legend.hidden = !bands;
    if (bands) {
      $('stations-cheapest').textContent = `${euro(bands.min)} €/L`;
      $('stations-priciest').textContent = `${euro(bands.max)} €/L`;
    }
    list.replaceChildren();
    itemById.clear();
    markerById.clear();
    ensureMap();
    if (markers) markers.clearLayers();
    const bounds = [];
    if (mode === 'gps' && point && map) {
      L.circleMarker([point.lat, point.lon], { radius: 8, color: '#173a2d', fillColor: '#e9a14d', fillOpacity: 1 }).addTo(markers).bindPopup('La teva ubicació aproximada');
    }
    for (const station of visible.slice(0, 120)) {
      const id = stationId(station);
      const tier = bands.tier(station.price);
      const item = document.createElement('li');
      item.className = `station-card tier-${tier}`;
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'station-select';
      choose.setAttribute('aria-pressed', 'false');
      choose.setAttribute('aria-label', `Mostra ${station.name} al mapa, ${euro(station.price)} euros per litre`);
      choose.addEventListener('click', () => selectStation(id, true));
      const heading = document.createElement('strong');
      heading.textContent = station.name;
      const price = document.createElement('span');
      price.className = 'station-price';
      price.textContent = `${euro(station.price)} €/L`;
      const address = document.createElement('p');
      address.textContent = station.address;
      const meta = document.createElement('small');
      meta.textContent = [station.distance == null ? '' : `${km(station.distance)} km en línia recta`, station.hours].filter(Boolean).join(' · ');
      const route = document.createElement('a');
      route.href = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`;
      route.target = '_blank';
      route.rel = 'noopener noreferrer';
      route.textContent = 'Com arribar-hi ↗';
      choose.append(heading, price, address, meta);
      item.append(choose, route);
      list.append(item);
      itemById.set(id, item);
      if (map) {
        const icon = L.divIcon({
          className: `price-pin tier-${tier}`,
          html: `<span>${euro(station.price)} €</span>`,
          iconSize: [74, 30],
          iconAnchor: [37, 15],
        });
        const marker = L.marker([station.lat, station.lon], { icon, title: `${station.name}: ${euro(station.price)} €/L` }).addTo(markers);
        const popup = document.createElement('div');
        const label = document.createElement('strong');
        label.textContent = station.name;
        popup.append(label, document.createElement('br'), `${euro(station.price)} €/L · ${station.address}`);
        marker.bindPopup(popup);
        marker.on('click', () => selectStation(id));
        markerById.set(id, marker);
        bounds.push([station.lat, station.lon]);
      }
    }
    if (visible.length > 120) {
      const note = document.createElement('li');
      note.className = 'station-limit';
      note.textContent = 'Es mostren les primeres 120. Ordena per preu per veure les més barates.';
      list.append(note);
    }
    if (selectedId && itemById.has(selectedId)) selectStation(selectedId, false, false);
    else selectedId = null;
    if (map) {
      map.invalidateSize();
      if (selectedId && markerById.has(selectedId)) map.setView(markerById.get(selectedId).getLatLng(), Math.max(map.getZoom(), 14));
      else if (mode === 'gps' && point) map.setView([point.lat, point.lon], radius <= 10 ? 12 : radius <= 25 ? 10 : 9);
      else if (bounds.length) map.fitBounds(bounds, { padding: [25, 25], maxZoom: 11 });
    }
  }

  function cachedProvince(id) {
    if (cache.has(id)) return cache.get(id);
    try {
      const saved = JSON.parse(localStorage.getItem(`mescla-stations-${id}`));
      if (saved && Number.isFinite(saved.at) && Array.isArray(saved.stations)) {
        cache.set(id, saved);
        return saved;
      }
    } catch { /* Storage may be unavailable or the entry may be corrupt. */ }
    return null;
  }

  async function fetchProvince(id) {
    const response = await fetch(API + encodeURIComponent(id), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    if (data.ResultadoConsulta !== 'OK' || !Array.isArray(data.ListaEESSPrecio)) throw new Error('Resposta incompleta');
    const result = { at: Date.now(), date: data.Fecha, stations: data.ListaEESSPrecio.map(normaliseStation).filter(Boolean) };
    cache.set(id, result);
    try { localStorage.setItem(`mescla-stations-${id}`, JSON.stringify(result)); } catch { /* The map still works without persistent storage. */ }
    return result;
  }

  function showResults(results, stale = false) {
    stations = [...new Map(results.flatMap((result) => result.stations).map((station) => [station.id || `${station.lat},${station.lon}`, station])).values()];
    const dates = results.map((result) => result.date).filter(Boolean);
    updated.textContent = `Dades oficials: ${dates[0] || 'hora no indicada'}.${stale ? ' Còpia desada: pot contenir preus antics.' : ' Es consulten de nou al cap de 30 minuts.'}`;
    render();
  }

  async function load(fresh = false) {
    const token = ++request;
    const radius = Number(radiusSelect.value);
    const ids = mode === 'gps' ? provincesNear(provinces, point, radius).map((province) => province.id) : [activeProvince];
    if (!ids.length) {
      setStatus('No hi ha províncies espanyoles en aquest radi. Tria una província.');
      return;
    }
    const previous = ids.map(cachedProvince);
    if (previous.every(Boolean)) showResults(previous, previous.some((item) => Date.now() - item.at >= 30 * 60_000));
    else { list.replaceChildren(); legend.hidden = true; selectedId = null; itemById.clear(); markerById.clear(); if (markers) markers.clearLayers(); setStatus('Carregant preus oficials…'); updated.textContent = ''; }
    const needsRefresh = fresh || previous.some((item) => !item || Date.now() - item.at >= 30 * 60_000);
    if (!needsRefresh) return;
    try {
      const results = await Promise.all(ids.map((id, index) => !fresh && previous[index] && Date.now() - previous[index].at < 30 * 60_000 ? previous[index] : fetchProvince(id)));
      if (token !== request) return;
      showResults(results);
    } catch {
      if (token !== request) return;
      if (previous.every(Boolean)) {
        showResults(previous, true);
        updated.textContent += ' Sense connexió: no s’han pogut actualitzar.';
      } else setStatus('No s’han pogut carregar els preus. Comprova la connexió i prem «Actualitza».');
    }
  }

  async function show() {
    ensureMap();
    if (map) map.invalidateSize();
    if (!provinces) {
      try {
        provinces = await (await fetch('./provinces.json')).json();
        for (const province of provinces) {
          const option = document.createElement('option');
          option.value = province.id;
          option.textContent = province.name;
          provinceSelect.append(option);
        }
        provinceSelect.value = activeProvince;
      } catch {
        setStatus('No es pot carregar la llista de províncies. Torna a provar-ho amb connexió.');
        return;
      }
    }
    $('near-me').disabled = false;
    load();
  }

  $('near-me').addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus('Aquest dispositiu no ofereix GPS. Tria una província.'); return; }
    setStatus('Demanant ubicació…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      point = { lat: coords.latitude, lon: coords.longitude };
      mode = 'gps';
      radiusSelect.disabled = false;
      provinceSelect.value = '';
      load();
    }, () => setStatus('No s’ha pogut obtenir la ubicació. Activa el permís de GPS o tria una província.'), { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
  });
  provinceSelect.addEventListener('change', () => {
    if (!provinceSelect.value) return;
    mode = 'province';
    point = null;
    activeProvince = provinceSelect.value;
    radiusSelect.disabled = true;
    load();
  });
  radiusSelect.addEventListener('change', () => { if (mode === 'gps') load(); });
  sortSelect.addEventListener('change', render);
  $('stations-refresh').addEventListener('click', () => { if (provinces) load(true); else show(); });
  radiusSelect.disabled = true;
  $('near-me').disabled = true;
  return { show };
}
