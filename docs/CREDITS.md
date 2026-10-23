# CREDITS – QUIETSCH!

## Code
- Eigener Code: Team QUIETSCH! (Alex, Eddy)
- Frameworks und Bibliotheken: siehe `package.json` (Three.js, TypeScript, Vite, Vitest, Playwright)

## 3D-Assets
- Kenney Furniture Kit, CC0 (öffentliche Domäne). https://kenney.nl
- Eigene Primitive-Modelle (Hähnchen, Geister): Team QUIETSCH!

## Fonts
- Pixelify Sans, SIL Open Font License (OFL)
- Inter, SIL Open Font License (OFL)

## Audio
- Alle Soundeffekte und Ambiente-Klänge sind synthetisch erzeugt (keine Samples).

## Tools
- Claude Code (Anthropic) für Konzept, Code und Bookkeeping
- Vite, Vitest, Playwright, ESLint, Prettier

## 3D-Assets – verwendete Dateien (Stand 2026-10-23)
- Kenney Furniture Kit, Version 2.0, CC0 1.0. https://kenney.nl/assets/furniture-kit
- Verwendet (Quelle `Models/GLTF format/*.glb` -> `public/models/`): bedSingle -> bed, table -> table, chair -> chair, loungeSofa -> sofa, kitchenFridgeLarge -> fridge, kitchenCabinet -> kitchen-cabinet, bookcaseClosed -> bookcase, lampRoundFloor -> floor-lamp, cardboardBoxClosed -> box, coatRackStanding -> coat-rack, rugRound -> rug, cabinetTelevision -> tv-cabinet, pottedPlant -> plant, bear -> toy-bear, pillow -> cushion, radio -> radio
- Materialien werden zur Laufzeit abgedunkelt und entsättigt (`src/world/assets.ts`).
