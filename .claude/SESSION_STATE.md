# SESSION_STATE – QUIETSCH!
**Live: https://alwa991.github.io/quietsch/** (T14 done via gh-pages, Pages built; T14a Review-Fixes in 04669e4)
Stand: 2026-10-23 · Orchestrator: Fable (Phasen-Ebene) · Phase: P6 READY für finalen Deploy (T22b Fix-Lauf nach Playtest 3 DONE, Commits 3ac9e1c..2ee7f92 auf main, nicht deployed) → nächster Schritt T23 Deploy + Abgabetext durch Orchestrator

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

### P4-Entscheidungen (Stretch, Opus-Lead)
- Map 57×38: Keller = Zeilen 32–37 unter dem Flur (x 18–23), Zugang über `H`-Zelle (19,31) in der Flur-Südwand (`GridCell.Hollow`, blockiert wie Wand bis `openPassage`: Chicken-Grid, Spuk-Grid und Sonar-Floor-Mask). Dachboden = Insel x 50–55/y 2–8, nur per Leiter-Teleport (`ATTIC_ARRIVAL`/`LADDER_ARRIVAL`). Alle Wände ab Zeile 31 (horizontal), unterhalb 31 und ab x 49 sind Cutaway 0,35 m. Keller/Dachboden: Nebel 10,5–19.
- Keller/Dachboden-Zustand nur in `flags` (`keller:heard|open|box|chest`, `attic:collar|chest`, `card:bello`, `visit:attic`, `peace:<i>`), SAVE_VERSION bleibt 1. Keller-Props und Dachboden-Props am Ende von FURNITURE (Reveal-IDs index-basiert).
- Hohle Wand reagiert nur auf den eigenen Schrei (nicht Echo/Köder), 3 s Cooldown; E erst nach „Hohl.“. Krone: `grantHat` + automatisch getragen, im Shop erst sichtbar wenn besessen. Keller zählt nicht zu Sternen → Ergebniszeile „Geheimnis gefunden ja/nein“.
- `core/noise.ts`: `NoiseSource` 'scream' | 'echo' | 'bait', `LIGHT`-Bitmaske, `noiseReaction()` = einzige Hör-/Befriedungsregel. Nur 'scream' befriedet. `SpookState.peaceful` (bleibt bei settle). Sonar-Ringe tragen `source`; Köder-Ringe enthüllen ohne Federn.
- Befriedete Spuks: Map-Spuks (Index < baseSpooks) setzen beim Abliefern `peace:<i>`, nach Reload liegen sie wieder am Korb. Finale: friedliche vorne (1,1 m), andere dahinter.
- Köder `core/bait.ts` (alloc-frei, State in-place), fliegt über Möbel (wallsOnly), 1 Ball gleichzeitig. Halsband `core/attic.ts`: 20 s aktiv, 40 s Recharge, `SpookInput.ignore` (kein Fang/Griff, kein Hüpf-Hören, kein Lock-on; Schreie werden weiter gehört).
- Toasts: oben mittig bei 104 px, max 3, neue oben, ältere `q-toast--old` (nur Titel, klein). HUD-Chips unten links: Batterie 16 px, Köder 64 px, Halsband 112 px.
- Debug: `actions.spooks()`, `actions.bait()`, `window.__game.pos`; Tasten 1–6 Raum-Teleport (5 Keller, 6 Dachboden).
- e2e Mission-1-Schritt mit Retry (Socke stieß das Hähnchen nach dem Schrei weg → war flaky).

### P5-Entscheidungen (Polish, Opus-Lead)
- Rudi: `RUDI.speed` 3,0 (< Hähnchen 3,2), `SpookState.wake` 1,5 s nach `wakeRudi` (taub, steht, Auge flackert). Spawn (39,20). Fenster-Socke (38,7).
- Fang: `invulnerable` in main.ts = Freeze 0,5 + 2 s; währenddessen `frame.ignore` (wie Halsband) und Hähnchen blinkt; zweiter Fang im selben Frame wird verworfen.
- Economy: `SONAR.comboStep 5`, `comboCap 40`, `comboBonus(n)` ohne base-Parameter (comboMultiplier entfernt). `RANK_XP` 0/250/700/1400/2400. Ein Lauf inkl. Keller ≈ 520 Federn / ≈ 920 XP → Rang Hahn (Schreihals/Legende in einem Lauf praktisch nicht erreichbar, bewusst laut Spec).
- Pacing: `lightning.fast` (8–12 s) = Wohnzimmer && Uhr offen. `core/story.doorbellDue` (120 s oder 2. Schloss). `InteractableDef.reach` (Haustür 2,6 m).
- Hand-Schreck: `popHand(s, x, z)` setzt die Hand 1,7 m neben das Hähnchen, zurück nach Hause beim Abtauchen; Entity skaliert 1,9× und dreht zur Kamera; ein gemeinsames Scare-PointLight in missions.ts; `MissionDeps.punch`.
- Panik: Herzen sofort voll, `showStoryCard(card, autoCloseMs)` 1500 ms. Tutorial-Karte `peaceHint` (Flag `card:peaceHint`), Nachtlicht pulsiert 5 s.
- Enden: Overlay transparent, Panel rechts rgba(…, 0,7), Kamera +2,6 m nach rechts verschoben; A: Hähnchen in der Tür, `endLight` kalt + Blitz alle 2,6–4,4 s; B: alle Spuks `restAtKorb` (Befriedet-Zähler vorher erfasst), warmes Licht.
- Keller verborgen: `Revealable.muted` (hit/sonar ignorieren), Keller-Cap (y 0,37, z ≥ 32) über den Cutaway-Wänden, Keller-Props/Interactables/Boden `visible=false` bis `openPassage(HOLLOW_CELL)`. Keller-Socke unsichtbar + taub bis offen.
- Follower: `FOLLOW.snap` 6 m → Snap hinter das Hähnchen. Krone: Gold 0xc8901c, dunkler BackSide-Rand, rote Steine.
- Logo: Inter 600 + `-webkit-text-stroke` (Pixelify wird nirgends mehr verwendet; Fonts liegen noch in public/fonts).
- Commit-Trailer: Co-Authored-By Claude Opus 5.5 (Systemvorgabe der Session) statt „Fable 5.1“ aus dem Orchestrator-Briefing.

### T22b-Entscheidungen (finaler Fix-Lauf, Opus-Lead)
- Schonzeit `CATCH_GRACE` 2 s via `tickGrace(t, active ? dt : 0)` (core/spook-fsm.ts); Freeze zählt nicht mehr mit (dt = 0).
- Socke: `alertTime` 1,2 s, `huntRadius` 2,5 m; chaseSpeed/Timeout unverändert (Socken bleiben gefährlich).
- Keller-Socke Spawn (23,36); beim Betreten des Kellers `cooldown ≥ 3 s` für Keller-Spuks (kein Fang an der Treppe).
- Hohle Wand: `hearHollow` ignoriert ohne Flag `lock:1` (`HOLLOW_LOCK_FLAG`); e2e öffnet Schloss 1 vorher.
- Tutorial `peaceHint`: zusätzlich nach dem 1. Fang (nach dem Freeze, auch bei Panik → Karte nach Panik-Karte); Banner-Zeile `T.nightHint` im Flur solange 0 Geisterlichter (`showMission(..., hint)`, `.q-mission__hint`). Toasts dafür auf top 128 px.
- HUD-Sterne-Chip `.q-chip--star` (★ n/9, `totalStars`), Update auf `mission-complete`.
- Finale-XP Flag `xp:finale`; Hähnchen im Titel unsichtbar; Rang-Toast nur Titel; Taschenlampe 16 Intensität, Reichweite RANGE+4 (Gameplay-RANGE 7 unverändert); `ShopItem.comingSoon` entfernt; Vite `build.rolldownOptions.output.codeSplitting` Gruppe `three` (index 117 kB, three 642 kB).

## Kommandos
pnpm dev · pnpm build · pnpm test · pnpm e2e · pnpm typecheck · pnpm lint · pnpm format:check · pnpm deploy
Debug: `?debug=1` (FPS, Spuk-Hörradius, Tasten 1–6 Raum-Teleport, L = Blitz) · `?ui=1` UI-Demo · `?audio=1` Audio-Demo
E2E/Playtest-Hooks: `window.__game.{phase, modal, state}` · `actions.{scream(hold), teleport(room|index), warp(x,z), lightning(), completeMission('echo'|'jaeger'|'uhr'), giveFeathers(n), openLock(1|2|3), openShop(), gotoFinale(), chooseEnding('A'|'B')}`
docker compose up -d --build && curl -s -o /dev/null -w "%{http_code}" localhost:8080/health   (ab T11)

## Done / Next / Blocker
Done: P0, P1 (T04–T07), P2 (T09–T11), T13, T14, P4 (T15, T16, T19, T20), P5 T22, Gate 2 + Playtest 3, T22b · Next: T23 finaler Deploy + Abgabetext (Orchestrator) · Blocker: keine
Offen/bekannt: Swiftshader-FPS 10–17 (Software-GL), echte GPU nicht gemessen; three-Chunk 642 kB (> 500-kB-Warnung, index 117 kB); Laufzeit Mensch geschätzt 8–12 min (nicht gemessen, Ziel 10–14 nur mit Keller/Dachboden); Rang endet bei Hahn (Schwellen laut Spec); Taschenlampe nach Fund weiter ohne Pflichtzweck (heller, aber Keller nicht dunkler gemacht); Follower ohne Pathfinding (Snap > 6 m mildert); Hand-Schreck-Hand über Wänden möglich, wenn der Schrei direkt an einer Wand fällt; T17/T18 nicht beauftragt; `zzfx` ungenutzt in package.json (review-1 #1/#2 offen).

## Rekonstruktions-Check
1. Protagonist? 2. Engine? 3. Was öffnet die Haustür? 4. Phase? 5. Offene Tasks?
