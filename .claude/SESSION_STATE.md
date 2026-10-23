# SESSION_STATE – QUIETSCH!
Stand: 2026-10-23 · Orchestrator: Fable (Phasen-Ebene) · Phase: P0

## Projekt
3D-Browser-Game (Three.js) für 24h-Contest. Theme „It's spooky outside“, Objekt Quietschhähnchen. GDD: docs/GDD.md · Architektur: docs/ARCHITECTURE.md · Tasks: .claude/TASKBOARD.md

## Entscheidungen
- Three.js r17x gepinnt, DOM-UI, kein Physik-Engine, Grid-AABB
- Sonar: Ring-Mesh + EdgesGeometry-Reveal, kein Shader an Standardmaterialien
- Assets: Kenney CC0 glTF + Primitive, Audio synthetisch, keine KI-Assets
- Deploy: gh-pages-Branch (kein Actions-Workflow wegen Hook), Repo AlWa991/quietsch
- Orchestrator liest kein src/**, Leads berichten ≤300 Wörter, Checker fresh

## Kommandos
pnpm dev · pnpm build · pnpm test · pnpm e2e · pnpm typecheck · pnpm lint · pnpm deploy
docker compose up -d --build && curl -s -o /dev/null -w "%{http_code}" localhost:8080/health

## Done / Next / Blocker
Done: Plan freigegeben · Next: T01–T03 · Blocker: keine

## Rekonstruktions-Check
1. Protagonist? 2. Engine? 3. Was öffnet die Haustür? 4. Phase? 5. Offene Tasks?
