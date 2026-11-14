# Mescla 2T

PWA mòbil, en català, per calcular la mescla de gasolina i oli de motors de dos temps.

- **Tinc gasolina:** litres de gasolina → mil·lilitres d’oli.
- **Tinc oli:** mil·lilitres d’oli → litres de gasolina.
- Percentatges ràpids (1%, 1,5%, **2% per defecte**, 2,5%, 3%, 4%) i percentatge personalitzat entre 0,1% i 10%.
- Ús sense connexió i instal·lació a la pantalla d’inici.
- Sense comptes ni seguiment. El percentatge, mode i quantitats queden desats al dispositiu.
- Pestanya opcional de gasolineres: GPS sota demanda, radi 10/25/50 km, selecció de província, preu oficial de gasolina 95 E5, mapa OpenStreetMap i ruta.
- Els preus normalitzats es desen per província a `localStorage` i es consulten de nou al cap de 30 minuts; una còpia antiga es mostra amb avís si falla la connexió. El GPS no es desa ni s’envia a cap servei: només es fa servir al navegador per triar províncies i filtrar estacions.
- El mapa necessita connexió per carregar les tessel·les; la calculadora funciona sense connexió.

## Fórmula

El percentatge es calcula sobre el **volum de gasolina** (no sobre el volum total de la mescla):

- `oli (ml) = gasolina (L) × 10 × percentatge`
- `gasolina (L) = oli (ml) ÷ (10 × percentatge)`

Exemple: 5 L de gasolina al 2% necessiten 100 ml d’oli.

## Desenvolupament

Serveix els fitxers estàtics amb qualsevol servidor HTTP; per exemple, `python3 -m http.server 8000`. Obre `http://localhost:8000`. Per comprovar la lògica: `npm test`.

## Publicació

GitHub Pages serveix l’arrel de la branca `main`. El manifest, el service worker i tots els recursos fan servir rutes relatives perquè la PWA funcioni en una URL de projecte.

## Dades i atribucions

Preus i localitzacions: [API oficial de carburants](https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/) del Ministeri per a la Transició Ecològica. Índex de límits provincials (caixes delimitadores): [click_that_hood, spain-provinces.geojson](https://github.com/codeforgermany/click_that_hood/blob/main/public/data/spain-provinces.geojson). Mapa: [OpenStreetMap](https://www.openstreetmap.org/copyright), renderitzat amb [Leaflet 1.9.4](https://leafletjs.com/) (BSD-2-Clause).
