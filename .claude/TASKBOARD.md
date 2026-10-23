# TASKBOARD – QUIETSCH! (24h-Jam, Start 2026-10-23)
Legende: TODO · WIP · REVIEW · DONE · CUT · (Modell) · Owner-Dateien exklusiv

Stand: P6 abgeschlossen. Final-Deploy auf 858f35c, Live-Check https://alwa991.github.io/quietsch/ = 200. Offen: nur die Abgabe durch Alex.

## Offene Tasks
- [ ] Abgabe im Contest-Portal durch Alex (Checkliste: docs/ABGABE.md)

## CUT
- T17 Türklingel + Herzschlag (nicht beauftragt, Türklingel-Pacing ist in T22 C umgesetzt)
- T18 Hüte-Erweiterung (nicht beauftragt)

## Backlog nach Abgabe
- Vite-Build: three-Chunk 642 kB (Warnung > 500 kB, index 117 kB)
- Keller nicht dunkler: Taschenlampe nach Fund ohne Pflichtzweck (Lampe heller/länger, T22b #11 nur teilweise)
- Legende-Rang (Schreihals/Legende) in einem Lauf praktisch unerreichbar (Ränge bewusst laut Spec)
- Follower ohne Pathfinding (Snap > 6 m mildert)

## DONE
- [x] T01 Bookkeeping (Chat-Log, TASKBOARD, SESSION_STATE, GDD, ARCHITECTURE) aus Plan · c7d2fac
- [x] T02 Scaffold Three.js + TS + Vite + Vitest + Playwright + ESLint/Prettier, Grid-Format, UI-Shell · c7d2fac
- [x] T03 GitHub-Repo AlWa991/quietsch angelegt (Orchestrator)
- [x] T04 Vertical Slice: world, systems (camera, collision, input, sonar, lightning), render/reveal, chicken, spook, Federn + HUD · 08fb65e
- [x] T05 Kenney Furniture Kit 2.0 (16 GLB) + CREDITS.md + Asset-Loader, Hähnchen aus Primitiven · 08fb65e
- [x] T06 ui/styles.css Designsystem, HUD, Toasts, Story-Cards, Mission-UI · 08fb65e
- [x] T07 Audio rein WebAudio (sfx, ambience), ZzFX bewusst nicht genutzt · 08fb65e
- [x] T08 Playtest 1 Kurzbefund (Grusel 2/5, Spaß 3/5, Fix-Liste 1–10) · 77da7bd
- [x] T09 Missionen (Echo, Sicherung/Rudi, Uhr/Hände), Herzen, Economy, Story mit 3 Schlössern und 2 Enden, Save · 8547a48
- [x] T10 Tests für core (Vitest) und e2e-Smoke/Playthrough (Playwright) · 8547a48
- [x] T11 Dockerfile (nginx-unprivileged), compose, /health, README · 8547a48
- [x] T12 Playtest 2 mit Bugliste (docs/playtest-2.md) · ae0f5ad
- [x] G1 Review 1 (Reviewer, CHANGES REQUIRED, keine Blocker) · 3601962
- [x] T13 Gate-1-Fixes: Hähnchen-Modell, Socke, Blitz, Floats, Teppiche, Props, X-Ray, Freeze-Frame, THREE.Timer, Favicon · 1ea387b
- [x] T14 GitHub Pages live (gh-pages), Review-Fixes und Format-Check · dc5e89e, 04669e4, be79770
- [x] T15 Geisterlichter für alle Spuk-Arten · f70a2c2
- [x] T16 Keller + Krone: hohle Wand, Treppe, Spendenkarton (Twist 2), Geheimnis · 853a535
- [x] T19 Köder (Shift), Geräuschquelle · 22372bf
- [x] T20 Dachboden: 7-Sterne-Leiter, Karte „Bello war hier“, Halsband (Q) · 9fc4b7b
- [x] P4 Toast-Stapel oben mittig, max 3 · af15be6
- [x] T21 Spec für P5 = docs/playtest-2.md, gegen aktuellen Code nachgeprüft · ae0f5ad
- [x] T22 P5 Polish A–F: Blocker (Rudi, Schonzeit, Socken, Logo), Economy, Pacing, Grusel/Lesbarkeit, Enden mit 3D-Bild, Keller verborgen · 5e28775, fb46e08, a6e86b2, 6b969ad, 4c9cfa7, eb2567f
- [x] G2 + Playtest 3 (Jury 3,5 / 3,5 / 3 / 4 / 4 / 4,5 / 3,5, APPROVED) · e684fe4
- [x] T22b Finaler Fix-Lauf nach Playtest 3: Schonzeit in Simulationszeit, Keller-Socke, Socke-Alarm 1,2 s, Nachtlicht-Hinweis, Sterne-Chip im HUD, README Shift/Q, Finale-XP einmal, Rang-Toast, Taschenlampe heller, Ende-A-Start, comingSoon entfernt, three-Chunk · 3ac9e1c, b2f82a7, 17942cc, c16b84f, 2ee7f92
- [x] T23 Finaler Deploy auf 858f35c (Orchestrator), Live-Check 200, Bundle index-RWC0QaoQ.js identisch mit lokalem dist
- [x] T24 Chat-Log-Summary, SESSION_STATE final, docs/ABGABE.md (Abgabe-Checkliste)
