# SESSION_STATE – QUIETSCH!
**Live: https://alwa991.github.io/quietsch/** · Repo: https://github.com/AlWa991/quietsch
Stand: 2026-10-24 · P7: Phase P7 "Combat & Horror" teilweise ausgeliefert (Deploy bf8cacf, 136 Unit-Tests grün, Live https://alwa991.github.io/quietsch/ = 200). IN: breitere Türen, Kampf-Kern, Jumpscare-System + 4 Trigger, Dread-Layer, Halloween-Deko. OUT/Backlog: Teddy/Kürbis/Spinne, Schallwelle, Lampe-Freeze, Ansturm, Shop-Erweiterung, Playtest 4.
Vorher: Phase: P6 abgeschlossen (T23 Deploy 858f35c, Live-Check 200, T24 Bookkeeping) · Blocker: keine · Next: Abgabe durch Alex (Checkliste: docs/ABGABE.md)

## Projekt
3D-Browser-Spiel (Three.js, TypeScript, Vite) für den 24h-Contest. Theme „It's spooky outside“, Objekt Quietschhähnchen. Titel: QUIETSCH! – Raus aus dem dunklen Haus. GDD: docs/GDD.md · Architektur: docs/ARCHITECTURE.md · Tasks: .claude/TASKBOARD.md · Jury-Feedback: docs/playtest-1..3.md

## Entscheidungen (Kurzfassung)
- Three.js 0.186 gepinnt, DOM-UI, keine Physik-Engine, Grid-AABB. Kein Phaser (3D-Diorama).
- Sonar: Ring-Mesh (ShaderMaterial) + EdgesGeometry-Reveal. Assets: Kenney CC0 + Primitive, Audio rein WebAudio (ZzFX nicht genutzt), keine KI-Bildassets.
- Deploy: gh-pages-Branch (`pnpm deploy`), kein Actions-Workflow.
- Pure Core in src/core/ (Vitest), Szene-Glue in systems/, UI in ui/. Save: localStorage `quietsch.save`, Version 1.
- Ränge 0/250/700/1400/2400 XP, Combo 5·(n−1) max 40. Ein Lauf inkl. Keller ca. 520 Federn / 920 XP.
- Keller (hohle Wand, Schloss 1) und Dachboden (Leiter, Halsband) als Stretch umgesetzt. Geisterlichter für alle Spuk-Arten.
- Fang: 0,5 s Freeze, 2 s Schonzeit in Simulationszeit, −1 Herz, −30 % Federn.
- Enden A/B mit 3D-Bild hinter 70-%-Panel.

## Testzahlen (Stand 858f35c)
- Unit (Vitest): 111 grün
- e2e (Playwright): 19 grün
- typecheck, lint, format:check, build grün · Docker: /health 200, whoami = nginx (nicht root)

## Jury-Score (Playtest 3, Gate 2, Commit 4df2537)
Experience 3,5 · Feel 3,5 · Hook 3 · Story 4 · Style 4 · Theme 4,5 · Twist 3,5. Grusel 3/5, Spaß 3,5/5. Verlauf Grusel/Spaß: PT1 2/3 → PT2 2/3 → PT3 3/3,5. Playtest 2 Jury: Experience 3 · Feel 3 · Hook 2,5 · Story 3 · Style 4 · Theme 4 · Twist 3.

## Kommandos
pnpm dev · pnpm build · pnpm test · pnpm e2e · pnpm typecheck · pnpm lint · pnpm format:check · pnpm deploy
Debug: `?debug=1` (FPS, Hörradius, Tasten 1–6 Raum-Teleport, L = Blitz) · `?ui=1` UI-Demo · `?audio=1` Audio-Demo
Docker: `docker compose up -d --build && curl -s -o /dev/null -w "%{http_code}" localhost:8080/health`

## Backlog nach Abgabe
- P7 offen: Teddy/Kürbis/Spinne, Schallwelle, Lampe-Freeze, Ansturm, Shop-Erweiterung, Playtest 4
- three-Chunk 642 kB (Build-Warnung > 500 kB)
- Keller nicht dunkler: Taschenlampe ohne Pflichtnutzung
- Legende-Rang in einem Lauf praktisch unerreichbar
- Follower ohne Pathfinding (Snap > 6 m)
- Offen aus Messung: Laufzeit Mensch geschätzt 7–10 min (nicht gemessen); FPS nur Swiftshader 10–17 gemessen, echte GPU nicht

## Done / Next / Blocker
Done: P0–P6 (T01–T24, G1, G2), Final-Deploy 858f35c, Live 200 · Next: Abgabe durch Alex · Blocker: keine

## Rekonstruktions-Check
1. Protagonist? 2. Engine? 3. Was öffnet die Haustür? 4. Phase? 5. Offene Tasks?
