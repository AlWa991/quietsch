# Playtest 3 + Review 2 (Gate 2, Commit 4df2537) – Spec für den finalen Fix-Lauf

Reviewer: APPROVED. Playtester: Jury-Score Experience 3,5 · Feel 3,5 · Hook 3 · Story 4 · Style 4 · Theme 4,5 · Twist 3,5. Grusel 3/5, Spaß 3,5/5. Lokal + live 0 Errors/404.
Größter Hebel: Socken-Druck senken und das Befrieden erzwingen.

## Blocker
1. Schonzeit (2 s Unverwundbarkeit) läuft mit `rawDt` in Pause/Karten weiter (src/main.ts ~761) → mit `dt` zählen. Repro: Fang, Esc, 3 s, weiter → sofort zweiter Fang.

## Should
2. Keller-Socke lauert direkt an der Treppe (3 Fänge in 5 s → Panik) → versetzen oder erst 3 s nach Betreten aktiv.
3. Kinderzimmer: jeder Schrei → Fang in < 2 s (3/3) → huntRadius kleiner bzw. Alarm verzögert (core/spook-fsm.ts).
4. Befrieden-Tutorial löste 0× aus → fest auslösen: nach dem 1. Fang oder beim ersten Betreten des Flurs mit Socke in ≤ 6 m; zusätzlich Nachtlicht-Hinweis als Missionsbanner-Zeile.
5. Hohle Wand reagiert schon auf den ersten Schrei am Korb → erst nach Mission 1 (Schloss 1) reagieren.
6. Sterne-Chip ins HUD (ui/hud.ts), ✶ ist derzeit Geisterlichter.
7. README Steuerung: Shift (Köder) und Q (Halsband) ergänzen (Review 2).

## Nice (nur wenn billig)
8. Finale-XP (+100) nur einmal vergeben.
9. Hähnchen auf dem Titel verdeckt den Untertitel.
10. „Neuer Rang!“-Toast verliert Rangnamen beim Schrumpfen.
11. Taschenlampen-Kegel kaum sichtbar → heller/länger; Keller dunkler, damit die Lampe Sinn hat.
12. Ende A zeigt Nacht, Text sagt „Morgen“ → Szene aufhellen (Dämmerung) oder Text anpassen.
13. Totes `comingSoon`-Feld entfernen; three als eigener Chunk (Review 2 Nice).
