# P7 – Combat & Horror (Alex-Feedback 24.10.2026: „nicht spaßig genug, überhaupt nicht gruselig“)

Ziel: Das Spiel muss erschrecken (echte Jumpscares) und sich wie ein Action-Spiel anfühlen (angreifbare, unterschiedliche Gegner, Treffer-Feedback), ohne den Twist zu verlieren: Jeder Gegner kann **vertrieben** (Kampf, Federn) oder **befriedet** (im Licht anschreien, Geisterlicht) werden. Ende B zählt nur Befriedete.

## 1. Karte
- Alle Türen 3 Zellen breit, Flur ≥ 5 Zellen breit, Räume mit freien Kampfflächen (≥ 6×6) in der Mitte, Möbel an den Rändern.
- Hähnchen-Kollisionsradius auf 0,35 m, Wände mit „Slide“ (kein Hängenbleiben an Ecken).
- Neuer Raum „Garten/Veranda“ hinter der Haustür ist NICHT nötig; die Haustür bleibt Finale.

## 2. Kampf (neue Verben)
- **Schnabelhieb** (J oder linke Maustaste): 3er-Kombo, 0,25 s pro Hieb, Reichweite 1,2 m, Rückstoß 1,5 m. Schaden 1. Hitstop 60 ms, Treffer-Flash weiß, Partikel (Federn/Stoff), Schadenszahl, Kamera-Punch.
- **Schallwelle**: Schrei (lang gehalten ≥ 0,8 s) betäubt alle Gegner im Umkreis 3 m für 1,5 s (Sterne über dem Kopf). Betäubte Gegner nehmen doppelten Schaden.
- **Taschenlampe** (F): Lichtkegel friert Geister 2 s ein (Socke, Spinne, Kürbis) und lädt sie zum Befrieden auf (im Kegel anschreien = Geisterlicht). Batterie 8 s, lädt im Korb und an Lichtinseln. Damit hat die Lampe endlich einen Zweck.
- **Köder** bleibt.
- Gegner haben HP-Balken (erscheint beim ersten Treffer, 3 s sichtbar), Schadensstufen (Wackeln, Risse/Emissive), Tod = Zerplatzen in Federn + Federn-Drop (physisch einsammelbar, Magnet ab 1,5 m) + XP. Kill-Streak: 2 Kills in 3 s = „Doppel!“ +20, 3 = „Dreifach!“ +50.
- Spieler: Herzen bleiben (3 + Mut). Treffer-Schonzeit 1 s. Knockback auf das Hähnchen bei Treffer.

## 3. Gegner (6 Typen, alle angreifbar)
| Typ | Raum | Verhalten | HP | Angriff | Schwäche |
|---|---|---|---|---|---|
| Socke (bestehend) | überall | Jäger, hört | 3 | Kontakt | Lampe friert ein |
| Hand (bestehend) | Wohnzimmer | Lauerer, greift aus Sofa | 2 | Griff 1 Herz | zieht sich nach 2 Treffern 10 s zurück |
| Rudi (bestehend) | Küche | Jäger, Motor | 8 | Rammen | nur verwundbar, wenn betäubt (Schallwelle) oder in Kühlschranklicht; nach 8 Schaden: Explosion in Staubwolke, 80 Federn |
| **Teddy** (neu) | Kinderzimmer | langsamer Tank in 2er-Gruppe, holt mit Arm aus (0,6 s Telegraph) | 5 | Hieb 1 Herz, Knockback | Betäubung, Rückenangriff doppelt |
| **Geisterkürbis** (neu, Halloween) | Flur, Wohnzimmer | rollt auf den Spieler zu, blinkt 1 s, explodiert (Kerne = 1 Herz im Radius 1,5 m) | 2 | Explosion | Schnabelhieb wirft ihn zurück → trifft andere Gegner (Chain) |
| **Spinne** (neu) | Keller, Dachboden | hängt an der Decke, fällt bei Geräusch, 3 schnelle Sprünge, flieht an die Decke | 2 | Biss 1 Herz | in der Luft treffbar, Lampe friert ein |

Spawning: Jeder Raum hat eine Basis-Besetzung (2–4) plus Nachspawns an „Ritzen“ (Schränke, Lüftungsgitter) alle 25 s, max 5 pro Raum. **Ansturm**: Türklingel → 40 s lang strömen 8 Gegner (Socken, Kürbisse) durch die Haustür in den Flur; überleben = 100 Federn + Toast „Ansturm überstanden!“.

## 4. Jumpscares (gescriptet, je genau einmal, + 1 zufälliger)
Technik: `jumpscare(kind)` = DOM-Overlay mit Vollbild-Fratze (SVG, animiertes Zittern, chromatische Aberration, 0,5 s), Sting (verzerrter Schrei + Sub-Bass-Schlag, −3 dB unter Master-Cap), Kamera-Shake 300 ms, Blitz-Weiß, danach 2 s Stille. Fratzen als SVG pro Gegnertyp (Socke mit aufgerissenen Augen, Teddy mit Knopfauge, Kürbis-Grinsen, Rudi-Frontlicht, Hand). Jede Fratze zusätzlich als 3D-Variante: Gegner springt 0,3 s direkt vor die Kamera.
1. **Küche, Kühlschrank**: Strom an → Kühlschranktür knallt auf, Rudi-Fratze, Licht stirbt für 2 s, dann Rudi erwacht.
2. **Wohnzimmer, erster Schrei**: Hand schießt vor die Kamera (bestehend, verstärken: Vollbild).
3. **Keller, Treppe unten**: alles schwarz, Atmen, Blitz → Spinne hängt 30 cm vor der Kamera, fällt.
4. **Flur, Spiegel** (neuer Prop): Beim Vorbeigehen zeigt der Spiegel ein zweites Hähnchen mit schwarzen Augen, das sich umdreht, Sting leise. Beim 2. Vorbeigehen: Vollbild-Fratze.
5. **Türklingel**: Silhouette knallt gegen die Milchglasscheibe (Bang + Riss im Glas), dann Ansturm.
6. **Dachboden**: Teddy-Kopf fällt von der Decke direkt vor dir, bleibt liegen, Augen leuchten.
7. **Zufall „Lauerer“**: wenn 25 s kein Schrei: Flüstern steigt an, Nachtlicht am Hähnchen flackert und stirbt, 1,5 s Dunkel, Blitz → Socke steht 1 m hinter dir (3D-Jumpscare, kein Vollbild). Max 1× pro Raum.
Dread-Layer (permanent, `src/audio/dread.ts`): zufällige Knarzer, Schritte über der Decke, Kinderkichern fern, Türen quietschen; Dichte steigt mit Spielzeit und sinkt im Korb.

## 5. Feedback & UI
- HUD: Kombo-Zähler, Kill-Streak-Toast, Lampen-Batterie-Balken, Gegner-HP-Balken (Weltanker).
- Shop neu: Scharfer Schnabel (+1 Schaden), Lange Batterie, Schallwelle+ (Radius 4,5 m). Preise anpassen, Federn-Drops neu balancieren (Ziel 700 pro Lauf, Shop 900).
- Ergebnisbildschirm: Vertrieben n, Befriedet m, Ansturm überstanden, Jumpscares überlebt (Humor).

## 6. Reihenfolge (jeder Schritt commit + grün)
1. Karte breiter + Kollision  2. Schnabelhieb, HP, Hitstop, Drops, Streaks, bestehende 3 Gegner angreifbar  3. Jumpscare-System (Overlay, Stings, 7 Trigger) + Dread-Layer  4. Teddy, Kürbis, Spinne  5. Schallwelle + Lampe-Freeze + Befrieden-Pfad  6. Ansturm  7. Shop/Balance/Ergebnis  8. Playtest 4 (fresh) → Fixes → Deploy
