# TASKBOARD – QUIETSCH! (24h-Jam, Start 2026-10-23)
Legende: TODO · WIP · REVIEW · DONE · CUT · (Modell) · Owner-Dateien exklusiv

## P0 Setup
- [ ] T01 (Haiku) Chat-Log, TASKBOARD, SESSION_STATE, docs/GDD.md, docs/ARCHITECTURE.md aus Plan
- [x] T02 DONE (Sonnet) Scaffold Three.js+TS+Vite+Vitest+Playwright+ESLint/Prettier, core/types.ts, Grid-Format, ui-Shell, Scripts dev/build/test/e2e/typecheck/lint · DoD: typecheck grün, Screenshot leeres 3D-Fenster
- [x] T03 (Orchestrator) gh repo create AlWa991/quietsch --public, DONE: https://github.com/AlWa991/quietsch existiert. Pages-Aktivierung auf gh-pages verschoben nach T14.

## P1 Vertical Slice
- [ ] T04 (Opus-Lead) world/, systems/{camera,collision,sonar,lightning}, render/, entities/chicken, 1 Spuk, Federn+HUD · DoD: laufen, kurz/lang schreien, Reveal, Blitz, Federn zählen hoch
- [ ] T05 (Sonnet) Kenney Furniture Kit nach public/models + CREDITS.md, world/assets.ts Loader, Hähnchen aus Primitiven inkl. Hut-Anker · DoD: alle Asset-Keys aus ARCHITECTURE.md laden
- [ ] T06 (Sonnet) ui/styles.css Designsystem + Komponenten HUD/Toast/Floating/Shop/StoryCard/Results · DoD: Storybook-ähnliche Demo-Route ?ui=1
- [ ] T07 (Sonnet) audio/sfx.ts (ZzFX), audio/ambience.ts (Wind, Donner, Drone, Herzschlag) · DoD: Demo-Route ?audio=1
- [ ] T08 (Opus, fresh) Playtest 1 Kurzbefund

## P2 Systeme & Content
- [ ] T09 (Opus-Lead) missions (Echo-Rätsel, Sicherung/Rudi, Kuckucksuhr/Hände), Herzen, Fangen→Korb, economy (Federn, Combo, Shop, Upgrades, XP/Rang, Sterne), story (Karten, Twists, 3 Schlösser, 2 Enden), save · DoD: Durchlauf ohne Console-Errors
- [ ] T10 (Sonnet) tests/ für core (grid, sonar, fsm, economy, story), e2e/smoke (Console, Screenshots Titel/Hub/Reveal/Ende A/B) · DoD: vitest + e2e grün
- [ ] T11 (Sonnet) Dockerfile (nginx-unprivileged), compose, nginx.conf /health, README · DoD: compose up, /health 200, whoami ≠ root

## Gate 1
- [ ] T12 (Opus, fresh) Playtest 2 mit Bugliste · [ ] G1 (Sonnet, fresh) Reviewer + spec-verifier gegen GDD

## P3 Deploy
- [ ] T13 (Opus-Lead) Gate-1-Fixes · [ ] T14 (Sonnet) gh-pages Deploy, URL-Check, Docker-Beweis

## P4 Stretch (nur nach G1, Reihenfolge fix)
- [ ] T15 Geisterlichter · [ ] T16 Keller + Krone · [ ] T17 Türklingel + Herzschlag · [ ] T18 Hüte · [ ] T19 Köder · [ ] T20 Dachboden

## P5 Polish
- [ ] T21 (Opus, fresh) Playtest 3 → T22 (Opus-Lead) Fixes · [ ] G2 (Sonnet, fresh) Final-Review

## P6 Abgabe
- [ ] T23 (Sonnet) finaler Deploy + Abgabetext · [ ] T24 (Haiku) Chat-Log-Summary, SESSION_STATE final

## DONE
- [x] T03 (Orchestrator) gh repo create AlWa991/quietsch --public (Repo: https://github.com/AlWa991/quietsch), Pages-Aktivierung verschoben nach T14
