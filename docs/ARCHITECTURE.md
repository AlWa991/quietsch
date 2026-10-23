# ARCHITECTURE – QUIETSCH!

Stand: 2026-10-23 · Quelle: Projektplan (Abschnitte 3 und 4).

## 3. Architektur (3D)

**Stack.** **Three.js** (aktuelles r17x, gepinnt) + TypeScript + Vite (`base: './'`) · HTML/CSS-Overlay für UI · Vitest · Playwright · nginx-unprivileged · gh-pages-Branch.

Warum Three.js statt Babylon/Godot: größte Beispielbasis, geringstes API-Halluzinationsrisiko für Agenten, kein Editor nötig, kleine Bundles. Godot-Web braucht COOP/COEP-Header, die GitHub Pages nicht setzt.

**Rendering.** PerspectiveCamera, fester 3/4-Blick, folgt dem Hähnchen (Tunic-Stil). Ambient fast null, Nebel, PointLight am Hähnchen (klein, flackert). Blitz = DirectionalLight-Flash 150 ms. EffectComposer: UnrealBloom + Vignette + Filmkorn.

**Sonar.** Ring = flaches, expandierendes Ring-Mesh mit ShaderMaterial (weicher Rand, additiv). Enthüllung = pro Objekt `EdgesGeometry`-Linien, Opacity-Tween beim Ringdurchgang + kurzer Emissive-Boost, dann Decay. Distanzcheck CPU-seitig (< 300 Objekte). Kein Custom-Shader an Standardmaterialien nötig.

**Welt.** Haus als ASCII-Grid (Zellen 1 m), daraus Wände, Böden, Türen, Spawns. Kollision eigenes AABB auf dem Grid, keine Physik-Engine. Möbel: Kenney Furniture Kit (CC0, glTF) + Primitive. Hähnchen aus Primitiven (Kapsel, Kugel, Kegel, roter Kamm), Hüte als Child-Meshes.

**Logik ohne Three in `src/core/`** (Vitest): grid, sonar-math, spook-fsm, economy (Federn, Combo, Shop, XP), story (Flags, Beats, Enden), save.

**UI.** DOM-Overlay, eigenes CSS-Designsystem (dunkles Glas, warme Akzente, Pixelify Sans + Inter). Komponenten: HUD (Herzen, Federn mit Count-up, Geisterlichter, Rang-Balken), Floating-Numbers, Toasts („Neuer Rang!“), Shop-Panel, Story-Karte, Missionsziel, Ergebnisbildschirm. Store mit Event-Emitter bindet Core an DOM.

**Audio.** ZzFX-Presets (Schrei mit Länge und Pitch nach Haltedauer, Pickup, Combo, Level-up, Fangen, Türklingel). WebAudio-Ambiente: Wind (gefiltertes Rauschen), Donner, Drone, Herzschlag-Layer nach Spuk-Distanz.

```
Game Test/
├── .claude/TASKBOARD.md · SESSION_STATE.md
├── docs/GDD.md · ARCHITECTURE.md · CREDITS.md
├── src/
│   ├── main.ts · core/{grid,sonar,spook-fsm,economy,story,save,types}.ts
│   ├── world/{house-map,builder,assets}.ts  · entities/{chicken,spook,interactable}.ts
│   ├── systems/{sonar,lightning,camera,collision,missions}.ts
│   ├── render/{scene,postfx,reveal}.ts · audio/{sfx,ambience}.ts
│   └── ui/{store,hud,shop,story-card,toast,results}.ts · ui/styles.css
├── public/models/ (Kenney glTF, CC0) · public/fonts/
├── tests/ · e2e/ · Dockerfile · docker-compose.yml · nginx.conf
```

## Phasenplan

## 4. Phasenplan (24 h, Checkpoint = Commit durch Orchestrator)

| Std. | Phase | Lead + Worker | Checkpoint |
|---|---|---|---|
| 0–1 | P0 Setup | Sonnet: Scaffold Three.js+TS+Vite+Vitest+Playwright+ESLint, `types.ts`, Grid-Format, UI-Shell · Haiku: Chat-Log, TASKBOARD, SESSION_STATE, GDD, ARCHITECTURE · Orchestrator: Repo anlegen | leeres 3D-Fenster im Screenshot, Repo existiert |
| 1–5 | P1 Vertical Slice | Opus-Lead: Grid → 3D-Haus, Kamera, Hüpfen, Dunkelheit, Sonar-Ring + Reveal, Blitz, 1 Socken-Geist mit Hör-FSM, Federn + HUD · Sonnet-Worker: Kenney-Kit laden + Lizenz, Hähnchen-Modell, CSS-Designsystem · Sonnet-Worker: ZzFX + Ambiente | Playtester-Kurzbefund: „sieht gut aus, Schrei fühlt sich gut an, gruselig“ |
| 5–10 | P2 Systeme & Content | Opus-Lead: 3 Missionen, Rudi, Hände, Herzen, Fangen, Shop + Economy + Upgrades, XP/Rang, Sterne, Story-Karten, 3 Schlösser, 2 Enden, Save · Sonnet-Worker: Vitest core, Playwright-Harness, Docker, README | MVP Anfang bis Ende spielbar |
| 10–11 | Gate 1 | Opus Playtester (fresh) + Sonnet Reviewer (fresh) | Bugliste priorisiert, APPROVED oder Fix-Loop (max 2) |
| 11–13 | P3 Deploy | Opus-Lead: Fixes aus Gate 1 · Sonnet: gh-pages Deploy, URL-Test, Docker-Beweis | **URL an Alex** |
| 13–19 | P4 Stretch (Reihenfolge fix) | Opus-Lead: 1. Geisterlichter-Befrieden · 2. Keller-Geheimnis + Krone · 3. Türklingel-Beat + Herzschlag-Audio · 4. Hüte · 5. Köder · 6. Dachboden | je Feature ein Commit |
| 19–23 | P5 Polish | Opus Playtester 2 → Opus-Lead Fixes, Balancing, 60 fps, Lesbarkeit · Gate 2: Sonnet Reviewer | ACCEPT |
| 23–24 | P6 Abgabe | Sonnet: finaler Deploy, README-Abgabetext · Haiku: Chat-Log-Summary, SESSION_STATE final | Link geprüft |

MVP = P0–P3. Verzug streicht P4 von hinten, nie das MVP.

## Orchestrator-Regeln

Modus: Fable orchestriert auf Phasen-Ebene. Pro Phase ein Opus-Lead, Sonnet/Haiku-Worker dort, wo sie passen.

### Kontext-Sparregeln (Orchestrator)
- Briefing ≤ 25 Zeilen, zeigt auf `docs/GDD.md`, `docs/ARCHITECTURE.md`, Taskboard-Eintrag.
- Jeder Lead endet mit „Bericht ≤ 300 Wörter, Pfade, offene Punkte“ und aktualisiert TASKBOARD und SESSION_STATE selbst.
- Orchestrator liest nie `src/**`, sieht max. 5 Screenshots gesamt (Gate 1 und Abgabe).
- Maker ≠ Checker: Playtester und Reviewer immer fresh, nie Fork.
- Max. 3 Maker parallel, disjunkte Dateien. Dependencies nur in P0, später nur mit Taskboard-Vermerk.

Zusätzlich:
- Kontext-Grenze: über 500k Token kein Compact, sondern Handoff per `SESSION_STATE.md` an eine neue Opus-Orchestrator-Session.
- Gates: Gate 1 nach P2, Gate 2 nach P5, jeweils mit fresh Checkern.
- MVP = P0 bis P3. Verzug streicht P4 von hinten, nie das MVP.
