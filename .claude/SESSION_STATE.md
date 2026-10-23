# SESSION_STATE – QUIETSCH!
Stand: 2026-10-23 · Orchestrator: Fable (Phasen-Ebene) · Phase: P1 DONE → nächster Schritt T08

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

## Kommandos
pnpm dev · pnpm build · pnpm test · pnpm e2e · pnpm typecheck · pnpm lint · pnpm format:check · pnpm deploy
Debug: `?debug=1` (FPS, Spuk-Hörradius, Tasten 1–4 Raum-Teleport, L = Blitz) · `?ui=1` UI-Demo · `?audio=1` Audio-Demo
E2E/Playtest-Hooks: `window.__game.actions.{scream(hold), teleport(room|index), lightning()}`
docker compose up -d --build && curl -s -o /dev/null -w "%{http_code}" localhost:8080/health   (ab T11)

## Done / Next / Blocker
Done: P0, P1 (T04–T07) · Next: T08 Playtest 1 (Opus, fresh) → P2 (T09–T11) · Blocker: keine
Offen/bekannt: Swiftshader-FPS 12–17 (Software-GL, kein Maßstab), echte GPU noch nicht gemessen; Bundle > 500 kB (Three.js, unkritisch); Combo-Ökonomie ungebalanced (P2).

## Rekonstruktions-Check
1. Protagonist? 2. Engine? 3. Was öffnet die Haustür? 4. Phase? 5. Offene Tasks?
