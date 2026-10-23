# SESSION_STATE – QUIETSCH!
Stand: 2026-10-23 · Orchestrator: Fable (Phasen-Ebene) · Phase: P2 DONE + T13 Gate-1-Fixes DONE (uncommitted auf main) → nächster Schritt Gate 1 (T12 Playtest 2 + G1 Review), dann T14 Deploy

## Projekt
3D-Browser-Game (Three.js) für 24h-Contest. Theme „It's spooky outside“, Objekt Quietschhähnchen. GDD: docs/GDD.md · Architektur: docs/ARCHITECTURE.md · Tasks: .claude/TASKBOARD.md

## Entscheidungen
- Three.js 0.186 gepinnt, DOM-UI, kein Physik-Engine, Grid-AABB
- Sonar: Ring-Mesh (ShaderMaterial, additiv, per Floor-Mask-DataTexture auf Boden begrenzt) + EdgesGeometry-Reveal, kein Shader an Standardmaterialien
- Assets: Kenney CC0 glTF + Primitive, Audio synthetisch, keine KI-Assets
- Deploy: gh-pages-Branch (kein Actions-Workflow wegen Hook), Repo AlWa991/quietsch
- Orchestrator liest kein src/**, Leads berichten ≤300 Wörter, Checker fresh

### P1-Entscheidungen
- Wandhöhe 1,5 m, Außenwand Süd als Cutaway 0,35 m (Diorama, verdeckt Hähnchen nie). Kamera-Offset (0, 11.2, 7.4), Fog 13,5–30.
- Wände: gemergte Runs, Reveal in ≤4-m-Chunks mit eigenen Outlines (End-Caps nur an Run-Enden).
- Bodenmuster pro Raum: Dielen (Flur, Wohnzimmer), Fliesen (Küche), Teppich ohne Linien (Kinderzimmer). Boden hat keinen Residual-Reveal.
- Sonar: Tap < 0,18 s = 4 m, Halten bis 1,5 s = 14 m, Ringtempo 14 m/s. Federn: 2 pro Erst-Reveal (nur Sonar, nicht Blitz) + Combo-Bonus base·n·(min(n,5)−1) am Ringende; Toast ab ×3.
- Socken-Geist: FSM wander → alert (0,6 s) → chase (Timeout 7 s, Linger 1,4 s) → return. Hört Sonar, wenn der Ring ihn passiert, und Hüpfen < 2 m. Geister ignorieren Möbel, nicht Wände. Fangen = −1 Herz (min 0), Teleport zum Korb, keine Panik-Logik (P2).
- Blitz alle 15–25 s (erster nach 6–12 s), 150 ms, Reveal im 17-m-Radius, Donner 0,4–1 s später, Fenster glühen auf.
- Audio: Worker hat ZzFX NICHT verwendet (ZzFX erzeugt AudioContext beim Import → Autoplay-Warnungen). Alles WebAudio über einen Master-Gain 0,25 (≈ −12 dB). `zzfx` bleibt ungenutzt in package.json (ggf. in P2 entfernen).
- UI: Zahlen (HUD-Chips, Floats, Missionszähler) in Inter statt Pixelify, weil Pixelify C/2/5 wie O/8/S liest (Override am Ende von styles.css).
- render/scene.ts angepasst (Ambient 0,06, Fog), postfx.ts unverändert.

### P2-Entscheidungen
- Pure Core (Vitest): `core/{economy,missions,story,save}.ts`; Szene-Glue: `systems/{missions,spooks,progress,flashlight}.ts`; UI: `ui/{title,shop,results,prompt}.ts`. Phasen title → play → finale → choice → ending (`core/story.canTransition`).
- GameState erweitert um `hat, feathersEarned, time, rooms, missions`. Save: localStorage-Key `quietsch.save`, Version 1, defensiver Deserialiser (Fallback auf Defaults, falsche Version = null). Autosave bei Mission/Schloss/Shop/Geisterlicht/Ende.
- Karten: Flags `card:<id>`, jede genau einmal (Panik wiederholbar). Wand-Interactables (Zeichnung/Kalender/Fenster) nach dem Lesen deaktiviert. Schlösser: Flags `lock:1..3`, Item-Fund öffnet das Schloss automatisch (kein Extra-Gang zur Tür); Tür-Lampen rot → grün.
- Map: T-Zellen = Interactables (`world/house-map.ts INTERACTABLES`), keine Auto-Props mehr auf T. Möbel auf früheren T-Zellen nach FURNITURE verschoben. Spawns: 2 Socken Kinderzimmer, Rudi Küche, 2 Socken vor dem Wohnzimmerfenster, 2 Hände an den Sofas (`SOFA_SPOTS`, Hand 0,7 m vor Sofa-Mitte).
- Echo-Rätsel: Ring trifft die richtige Kiste → nach 0,45 s eigener gelber 2,6-m-Ring + Echo-Quietscher (Spuks hören ihn). Falsche Kiste: −10 Federn + neuer Socken-Geist, der zur Kiste läuft.
- Rudi: schläft bis Strom an, fährt nur solange Lärm < 1,1 s alt (3,6 m/s), hört Hüpfen in 5 m, alarmiert 14 m, nie Timeout außer 9 s Stille, Kabel = nur Küche. Motor-Loop (WebAudio) nach Distanz.
- Hand: greift bei ≤ 1,5 m nach 0,45 s Auftauchen; erster Schrei im Wohnzimmer = gescripteter Pop (kann nicht fangen).
- Uhr: Schrei zählt, wenn Schreizeit und Blitz ≤ ±1 s auseinander (auch Blitz danach), max. 1 Zählung pro Blitz; Kuckuck bei jedem Blitz, wenn Hähnchen im Wohnzimmer.
- Friedliche Spuks (Basis): nur Socken; „im Licht“ = Nachtlicht 2,6 m, Kühlschrank 3,2 m (nach Strom), Blitz ≤ 1,2 s her, Taschenlampenkegel. Folgen dem Hähnchen, am Korb +1 Geisterlicht.
- Gefangen: −1 Herz, −30 % Federn, Rückstoß 1,2 m statt Teleport; 0 Herzen = Panik-Karte + Teleport Korb; Korb regeneriert alle Herzen in 10 s.
- Finale: Spuks erscheinen sofort im Bogen hinter dem Hähnchen (statt 20 s Anmarsch). Leertaste in der Wahl = Schreien.
- Ränge 0/80/220/450/800 XP; texts.ts hat keine eigenen Schwellen mehr (economy ist Quelle).
- `.claude/**` in eslint ignores (Playtester-Worktree brach `pnpm lint`). `.dockerignore` schließt .env* aus.
- `window.__game` hat jetzt `phase`, `modal`, `actions` (nicht optional).

### T13-Entscheidungen (Gate-1-Fixes)
- Hähnchen: neues Gummihuhn-Modell (lange Beine, Hals, 4er-Kamm, Kehllappen, Ober-/Unterschnabel), Skalierung 2,08 (1,6× P1), BODY_HALF 0,28. `ChickenModel.pose(beakOpen, legSwing)`. Emissive halbiert, Glow-PointLight auf y 3,2 (beleuchtet Boden statt Hähnchen).
- X-Ray: Ghost-Meshes (depthFunc Greater, renderOrder 5, Hähnchen 10) zeigen das Hähnchen dunkelgelb hinter Wänden/Möbeln. Kamera-Offset (0, 9,5, 6,3), Look-ahead stoppt vor blockierten Zellen.
- Socke: Lathe-Laken ersetzt durch Socke (Schaft, Bündchen, Ferse, Fuß, rote Spitze), Augen-Gruppe dreht immer zur Kamera. FSM: chaseSpeed 3,6, chaseTimeout 10, linger 2,4, huntRadius 3,5 (Ziel = Hähnchen statt Schallquelle).
- Blitz: FLASH 0,25 s, PostFX-Uniform `flash` (Vignette-Pass) 0,92 Weiß → Dip → 0,4; Fenster-Lichtflecken mit Kreuz + Ast (CanvasTexture, additiv) aus `WINDOW_SPOTS` (builder.ts), 0,6 s Nachglühen. Hook `flash(v)`.
- Fang: 0,5 s Freeze (Simulation dt=0, frame.active=false), `rig.closeUp()` −16° FOV auf Spuk, Rückstoß/Panik erst danach.
- Save: `GameState.revealed: string[]` (Prop-Reveal-IDs, index-basiert `${key}-${i}`), beim Weiter + nach placeProps auf `rewarded` gesetzt. Neues Feld, SAVE_VERSION bleibt 1 (Fallback []).
- Shop: `ShopItem.secret` (Krone) wird nicht gelistet; Freischaltung in P4 (Keller).
- Finale: Spuks starten 3,6 m (+0,5/Reihe) hinter ihrem Platz, rest-Mode läuft mit 1,3 m/s heran (~3 s).
- UI: Pixelify nur `.q-title__logo`; Floats #fff4a8 mit 8-fach-Schattenkontur, 34/52/26 px, Haltekurve 1,1 s. Floor-Reveal-Peak 0,26 → 0,36.
- THREE.Clock → `GameClock`-Wrapper um THREE.Timer (scene.ts). Favicon public/favicon.svg.
- Worker (Sonnet) Punkte 6–7: Primitive-Props in assets.ts (`PrimKey`/`PRIM_INFO`/`buildPrim`), Bodenmuster `carpet` (Kinderzimmer) und `islands` (Wohnzimmer) in builder.ts. house-map.ts unverändert.
- eslint ignoriert `e2e/playtest/**` (Wegwerf-Harness). Screenshots: `node e2e/playtest/fix-shots.mjs <url> [chicken,reveal,lightning,socke,rooms]`, `GPU=1` für Metal (Blitz nur mit GPU im 250-ms-Fenster fotografierbar).

## Kommandos
pnpm dev · pnpm build · pnpm test · pnpm e2e · pnpm typecheck · pnpm lint · pnpm format:check · pnpm deploy
Debug: `?debug=1` (FPS, Spuk-Hörradius, Tasten 1–4 Raum-Teleport, L = Blitz) · `?ui=1` UI-Demo · `?audio=1` Audio-Demo
E2E/Playtest-Hooks: `window.__game.{phase, modal, state}` · `actions.{scream(hold), teleport(room|index), warp(x,z), lightning(), completeMission('echo'|'jaeger'|'uhr'), giveFeathers(n), openLock(1|2|3), openShop(), gotoFinale(), chooseEnding('A'|'B')}`
docker compose up -d --build && curl -s -o /dev/null -w "%{http_code}" localhost:8080/health   (ab T11)

## Done / Next / Blocker
Done: P0, P1 (T04–T07), P2 (T09–T11), T13 · Next: Gate 1 (T12 Playtest 2 Opus fresh + G1 Reviewer/spec-verifier Sonnet fresh) · Blocker: keine
Offen/bekannt: Swiftshader-FPS 10–17 (Software-GL, kein Maßstab), echte GPU noch nicht gemessen; Bundle > 500 kB (Three.js, unkritisch); 12–15-Min-Arc nicht real durchgespielt (nur e2e-Debug-Pfad + Mechanik-Skript), Balancing Federn/Preise/Sterne-Partime offen für Playtest 2; Köder „bald verfügbar“; Mehr Props (T13) → Combos ×13–×18 je Raum (+100–150 Federn), Ränge steigen sehr schnell: Combo-Bonus in Playtest 2 balancen; Toast-Stapel (bis 4) verdeckt bei vielen Events das Hähnchen; `zzfx` ungenutzt in package.json.

## Rekonstruktions-Check
1. Protagonist? 2. Engine? 3. Was öffnet die Haustür? 4. Phase? 5. Offene Tasks?
