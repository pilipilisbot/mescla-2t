# Mescla 2T

PWA mòbil, en català, per calcular la mescla de gasolina i oli de motors de dos temps.

- **Tinc gasolina:** litres de gasolina → mil·lilitres d’oli.
- **Tinc oli:** mil·lilitres d’oli → litres de gasolina.
- Percentatges ràpids (1%, 1,5%, **2% per defecte**, 2,5%, 3%, 4%) i percentatge personalitzat entre 0,1% i 10%.
- Ús sense connexió i instal·lació a la pantalla d’inici.
- Sense dependències, comptes ni seguiment. El percentatge escollit queda desat al dispositiu.

## Fórmula

El percentatge es calcula sobre el **volum de gasolina** (no sobre el volum total de la mescla):

- `oli (ml) = gasolina (L) × 10 × percentatge`
- `gasolina (L) = oli (ml) ÷ (10 × percentatge)`

Exemple: 5 L de gasolina al 2% necessiten 100 ml d’oli.

## Desenvolupament

Serveix els fitxers estàtics amb qualsevol servidor HTTP; per exemple, `python3 -m http.server 8000`. Obre `http://localhost:8000`. Per comprovar la lògica: `npm test`.

## Publicació

GitHub Pages serveix l’arrel de la branca `main`. El manifest, el service worker i tots els recursos fan servir rutes relatives perquè la PWA funcioni en una URL de projecte.
