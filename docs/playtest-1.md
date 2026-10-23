# Playtest 1 (P1, Commit 08fb65e) – Fix-Liste für Gate 1

Befund: Technik sauber (0 Console-Errors, 120 fps headed M1, Load < 1 s). Grusel 2/5, Spaß 3/5.
Screenshots: .claude/worktrees/agent-a0bfed54a72f0c109/e2e/playtest/

## P1 – Pflicht vor Gate 1
1. Hähnchen 1,6× größer, Kamera ~15 % näher, Bloom/Emissive am Hähnchen halbieren → Silhouette (Schnabel, Kamm) muss bei Spielzoom lesbar sein.
2. Pixelify in Toast-Titeln/HUD-Labels durch Inter ersetzen („Oombo ×3“, „Oefangen“). Pixelify nur noch im Spieltitel.
3. Socken-Geist: Chase-Tempo ≥ 1,1× Hähnchen, gibt später auf; erkennbare Sockenform mit Augen statt grauem Klumpen.
4. Blitz: 250 ms Vollbild-Weißblitz + Fenster-Silhouetten, klar vom Schrei-Reveal unterscheidbar.
5. Float-Zahlen hellgelb mit dunkler Kontur, 1,3× größer.

## P2 – vor Deploy
6. Wohnzimmer eigenes Bodenmuster (Teppichinseln); Kinderzimmer-Teppich beim Reveal sichtbar (bleibt jetzt fast schwarz).
7. Pro Raum 4–6 Requisiten mehr (Spielzeugkisten, Kühlschrank, Uhr, Regale).
8. Wände, die das Hähnchen verdecken, transparent schalten oder Look-ahead an Wänden begrenzen.

## Nice-to-have
9. Fang-Moment: kurzes Freeze-Frame mit Geist in Großaufnahme vor dem Teleport.
10. Favicon, THREE.Clock → THREE.Timer (Deprecation-Warnung).
