# TASKBOARD – QUIETSCH! (24h-Jam, Start 2026-10-23)
Legende: TODO · WIP · REVIEW · DONE · CUT · (Modell) · Owner-Dateien exklusiv

## P0 Setup
- [ ] T01 (Haiku) Chat-Log, TASKBOARD, SESSION_STATE, docs/GDD.md, docs/ARCHITECTURE.md aus Plan
- [x] T02 DONE (Sonnet) Scaffold Three.js+TS+Vite+Vitest+Playwright+ESLint/Prettier, core/types.ts, Grid-Format, ui-Shell, Scripts dev/build/test/e2e/typecheck/lint · DoD: typecheck grün, Screenshot leeres 3D-Fenster
- [x] T03 (Orchestrator) gh repo create AlWa991/quietsch --public, DONE: https://github.com/AlWa991/quietsch existiert. Pages-Aktivierung auf gh-pages verschoben nach T14.

## P1 Vertical Slice
- [x] T04 DONE (Opus-Lead) world/, systems/{camera,collision,input,sonar,lightning}, render/reveal, entities/{chicken,spook}, core/{sonar,spook-fsm} + Tests, Federn+HUD, ?debug=1, __game.actions · DoD: laufen, kurz/lang schreien, Reveal, Blitz, Federn zählen hoch
- [x] T05 DONE (Sonnet) Kenney Furniture Kit 2.0 (16 GLB) nach public/models + CREDITS.md, world/assets.ts Loader, Hähnchen aus Primitiven inkl. Hut-Anker · DoD: alle Asset-Keys laden ohne 404 (e2e prüft 4xx)
- [x] T06 DONE (Sonnet) ui/styles.css Designsystem + HUD/Toast/Floating/StoryCard/Mission, Fonts self-hosted (Shop/Results → P2) · DoD: Demo-Route ?ui=1
- [x] T07 DONE (Sonnet) audio/sfx.ts (reines WebAudio statt ZzFX, s. SESSION_STATE), audio/ambience.ts (Wind, Donner, Drone, Herzschlag) · DoD: Demo-Route ?audio=1
- [ ] T08 (Opus, fresh) Playtest 1 Kurzbefund

## P2 Systeme & Content
- [x] T09 DONE (Opus-Lead) missions (Echo-Rätsel, Sicherung/Rudi, Kuckucksuhr/Hände), Herzen, Fangen→Korb, economy (Federn, Combo, Shop, Upgrades, XP/Rang, Sterne), story (Karten, Twists, 3 Schlösser, 2 Enden), save · DoD: Durchlauf ohne Console-Errors
- [x] T10 DONE (Sonnet) tests/ für core (grid, sonar, fsm, economy, story), e2e/smoke (Console, Screenshots Titel/Hub/Reveal/Ende A/B) · DoD: vitest + e2e grün
- [x] T11 DONE (Sonnet) Dockerfile (nginx-unprivileged), compose, nginx.conf /health, README · DoD: compose up, /health 200, whoami ≠ root

## Gate 1
- [ ] T12 (Opus, fresh) Playtest 2 mit Bugliste · [ ] G1 (Sonnet, fresh) Reviewer + spec-verifier gegen GDD

## P3 Deploy
- [x] T13 DONE (Opus-Lead + Sonnet-Worker Punkte 6–7) Gate-1-Fixes, s. DONE · [x] T14 DONE: live https://alwa991.github.io/quietsch/, Pages built, Docker-Beweis ok

## P4 Stretch (nur nach G1, Reihenfolge fix)
- [x] T15 Geisterlichter · [x] T16 Keller + Krone · [ ] T17 Türklingel + Herzschlag · [ ] T18 Hüte · [x] T19 Köder · [x] T20 Dachboden (alle DONE 2026-10-23, Opus-Lead, s. DONE) · T17/T18 nicht beauftragt

## P5 Polish
- [~] T21 Spec = docs/playtest-2.md (Messung auf 1ea387b, gegen aktuellen Code nachgeprüft); frischer Playtest 3 auf P5-Stand offen → mit G2 · [x] T22 DONE (Opus-Lead, kein Worker) Fixes A–F, s. DONE · [x] G2 + Playtest 3 DONE (docs/playtest-3.md, APPROVED) · [x] T22b DONE (Opus-Lead) finaler Fix-Lauf, s. DONE

## P6 Abgabe
- [ ] T23 READY (Sonnet) finaler Deploy + Abgabetext · [ ] T24 (Haiku) Chat-Log-Summary, SESSION_STATE final

## DONE
- [x] T22b Finaler Fix-Lauf nach Playtest 3 (Spec docs/playtest-3.md), 2026-10-23 (Opus-Lead): Commits 3ac9e1c #1 Schonzeit zählt Simulations-dt (`tickGrace`, steht in Pause/Karten/Freeze) · b2f82a7 #2 Keller-Socke nach (23,36) + 3 s fangsicher beim Betreten · #3 Socke Alarm 0,6 → 1,2 s, Lock-on 3,5 → 2,5 m (bleibt gefährlich) · #5 hohle Wand erst nach Schloss 1 · 17942cc #4 Nachtlicht-Karte auch beim 1. Fang irgendwo (einmal) + Missionsbanner-Hinweiszeile im Flur bei 0 Geisterlichtern · c16b84f #6 Sterne-Chip ★ n/9 im HUD (Toasts auf 128 px) · #7 README Shift/Q · 2ee7f92 Nice #8 Finale-XP einmal · #9 Hähnchen auf Titel ausgeblendet · #10 Rang-Toast „Neuer Rang: <Name>“ · #11 Taschenlampe heller/länger (nur Optik; Keller NICHT dunkler gemacht = teilweise) · #12 Ende-A-Text startet in der Sturmnacht · #13 `comingSoon` entfernt, three eigener Chunk. Tests 108 → 111, e2e 17 → 19. Docker /health 200, whoami nginx. Screenshots e2e/screenshots/final-{title,hud-stars}.png
- [x] T22 P5 Polish & Balancing, 2026-10-23 (Opus-Lead, kein Worker): Commits 5e28775 A Blocker (Rudi 3,0 m/s + 1,5 s Aufwach-Flackern + Spawn (39,20) 11 m vom Sicherungskasten · 2 s Schonzeit nach Fang mit Blinken · Fenster-Socke (33,3)→(38,7) · Logo Inter mit Kontur statt Pixelify · Köder-Shop + Toasts verifiziert) · fb46e08 B Economy (Combo 5·(n−1) max 40, Ränge 0/250/700/1400/2400, Einkommens-Test ~520 Federn inkl. Keller) · a6e86b2 C Pacing (Blitz 8–12 s im Wohnzimmer bei offener Uhr, Türklingel 120 s oder 2. Schloss, Haustür-Reichweite 2,6 m) · 6b969ad D Grusel/Lesbarkeit (Hand-Schreck groß/hell/nah + Punch + Sting, Rudi 2 Augen + Motor-Schein, Panik füllt Herzen sofort + 1,5-s-Karte, Nachtlicht-Tutorial einmalig) · 4c9cfa7 E Enden mit 3D-Bild hinter 70-%-Panel · eb2567f F Keller unsichtbar bis geöffnet, Krone dunkler + rote Steine, Follower-Snap > 6 m. Tests 103 → 108, e2e 11 → 17 (e2e/polish.spec.ts). Docker /health 200, whoami nginx. Screenshots e2e/screenshots/polish-{logo,hand-scare,rudi,ending-a,ending-b}.png
- [x] P4 Stretch T16/T15/T19/T20 + Toast-Fix, 2026-10-23 (Opus-Lead, kein Worker): Commits af15be6 (Toasts oben mittig, max 3, ältere klappen ein) · 853a535 T16 Keller (hohle Wand 'H' im Flur-Süd, Schrei → „Hohl.“ + Klopfen + Umriss pulsiert, E versenkt die Wand, Keller-Zeilen 32–37 mit Treppe/Kartons/Socke/dunklerem Nebel, Spendenkarton → twist2 genau einmal + Krone auto-getragen + 3 Geisterlichter, Federtruhe +40, Ergebnis „Geheimnis gefunden“) · f70a2c2 T15 Geisterlichter (core/noise.ts: Socke jedes Licht, Rudi Kühlschrank/Taschenlampe, Hände nur Blitz; warmes Leuchten, folgen in den Korb, Finale-Vorderreihe, „Befriedete Spuks n/m“, Korb-Spuks überleben Reload) · 22372bf T19 Köder (core/bait.ts, Shift, Bogenwurf ≤ 5 m, 1 Aufsprung, 3 Quietscher/4 s als Geräuschquelle, 2 s Cooldown + HUD-Chip) · 9fc4b7b T20 Dachboden (7-Sterne-Leiter, Insel x ≥ 49, Karte „Bello war hier“, Halsband Q 20 s/40 s Recharge + HUD, Federtruhe). Tests 72 → 103, e2e 7 → 11. Screenshots e2e/screenshots/{hollow,keller,peaceful,koeder,dachboden}.png
- [x] T13 Gate-1-Fixes, 2026-10-23: playtest-1 Punkte 1–10 alle erledigt (keiner geskippt) + A (revealed-IDs im Save), B (Krone `secret`, nicht im Shop), C (Finale-Spuks driften ~3 s heran). 1 Gummihuhn-Modell 2,08× (Schnabel öffnet beim Schrei, Baumelbeine), Kamera −15 %, Emissive halbiert, Glow-Licht höher · 2 Pixelify nur noch Titel-Logo · 3 Socke 3,6 m/s (1,125×), Timeout 10 s, Lock-on ≤ 3,5 m, Sockenform mit Augen (zur Kamera gedreht) · 4 Blitz 250 ms Weiß-Wash (PostFX) + Fensterlicht mit Ast-Silhouetten am Boden · 5 Floats hellgelb, Kontur, 1,3× · 6 Kinderzimmer-Teppich (Rauten/Bordüre/Ringe), Wohnzimmer-Teppichinseln · 7 je +6 Props/Raum (Primitive + GLB) · 8 Look-ahead stoppt an Wänden + X-Ray-Silhouette des Hähnchens hinter Wänden/Möbeln · 9 Fang-Freeze-Frame 0,5 s mit Kamera-Close-up · 10 THREE.Timer, Favicon. typecheck/lint/format/test (72)/build/e2e (7) grün. Screenshots e2e/screenshots/fix-{chicken-closeup,reveal,lightning,socke}.png (Harness e2e/playtest/fix-shots.mjs, GPU=1 für Blitz-Timing).
- [x] P2 Systeme & Content (T09–T11), 2026-10-23: Titel → Intro → 3 Missionen (Echo-Rätsel, Rudi/Sicherung/Taschenlampe, Kuckucksuhr/Hände) → 3 Schlösser → Finale → Ende A/B → „Nochmal spielen“. Economy/XP/Ränge/Herzen/Panik/Sterne/Shop/Hüte/Save/Türklingel. typecheck/lint/format/test (69)/build/e2e (7) grün, Docker /health 200, whoami=nginx. Screenshots e2e/screenshots/{title,shop,mission-1..3,finale,ending-a,ending-b}.png
- [x] P1 Vertical Slice (T04–T07), 2026-10-23: typecheck/lint/format/test (22)/build/e2e (4) grün, Screenshots e2e/screenshots/{boot,reveal}.png
- [x] T03 (Orchestrator) gh repo create AlWa991/quietsch --public (Repo: https://github.com/AlWa991/quietsch), Pages-Aktivierung verschoben nach T14
