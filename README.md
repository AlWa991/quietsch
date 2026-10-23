# QUIETSCH! – Raus aus dem dunklen Haus

Ein 3D-Browserspiel, entstanden im 24-Stunden-Contest. Halloween-Nacht, Sturm, ein stockdunkles Haus: Du bist das Quietschhähnchen, Lieblingsspielzeug von Hund Bello, und willst die Haustür öffnen und raus in die Nacht. Dein einziges Werkzeug ist dein Schrei: Er wirft einen Sonar-Ring, der die Umgebung aufleuchten lässt, aber auch alles Spukige auf dich aufmerksam macht. Je länger du schreist, desto mehr siehst du und desto größer ist das Risiko.

Spielbar direkt im Browser, ohne Installation. Repository: https://github.com/AlWa991/quietsch

## Steuerung

| Taste              | Aktion                                             |
| ------------------ | -------------------------------------------------- |
| WASD / Pfeiltasten | Bewegen                                            |
| Leertaste kurz     | Quietscher (kleiner Sonar-Ring)                    |
| Leertaste halten   | Langer Schrei (großer Ring, zeigt den ganzen Raum) |
| E                  | Interagieren                                       |
| F                  | Taschenlampe (sobald freigeschaltet)               |
| Esc                | Shop / Pause                                       |

## Features und Belohnungssystem

- **Federn:** Jedes Objekt, das dein Sonar zum ersten Mal enthüllt, lässt Federn fallen. Truhen und Schubladen enthalten Feder-Bündel.
- **Combos:** Mehrere Enthüllungen in einem Schrei ergeben einen Multiplikator.
- **Geisterlichter:** Selten und besonders wertvoll, zu finden bei besänftigten Spuks und in Geheimräumen.
- **Shop in Bellos Korb:** Upgrades wie Große Lunge, Flinke Füße, Mut, Dicke Haut und Köder sowie kosmetische Hüte.
- **XP und Ränge:** Vom Küken über Gockel, Hahn und Schreihals bis zur Legende, mit Level-up-Fanfare.
- **Herzen und Panik:** Drei Mut-Herzen. Wirst du gefangen, verlierst du ein Herz und einen Teil deiner Federn. Bei null Herzen geht es in den Korb zurück. Es gibt kein Game-Over.
- **Raum-Sterne:** Pro Raum bis zu drei Sterne für Mission, Zeit und Unentdecktsein.
- **Speichern:** Der Spielstand liegt im Browser (localStorage), ein Reload verliert keinen Fortschritt.

## Story-Teaser

Das Haus ist voller Spuks, und hinter jeder Tür wartet ein anderes Rätsel: ein Echo-Spiel im Kinderzimmer, ein hartnäckiger Jäger in der Küche, eine Uhr, die nur bei Blitz zuhört. Wer genau hinschaut und hinhört, entdeckt unterwegs, dass dieses Haus mehr zu erzählen hat, als es zunächst scheint. Wohin die Reise geht, findest du am besten selbst heraus.

## Tech

- **Three.js** und **TypeScript**, gebündelt mit **Vite**
- Spiellogik ohne Rendering-Abhängigkeit in `src/core/`, getestet mit **Vitest**
- End-to-End-Tests mit **Playwright**
- Sound vollständig synthetisch per **WebAudio**, keine Samples
- 3D-Möbel aus dem **Kenney** Furniture Kit (CC0)
- Auslieferung per **nginx-unprivileged** im Docker-Container

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), Spielkonzept: [docs/GDD.md](docs/GDD.md)

## Credits

Assets, Fonts, Bibliotheken und Lizenzen: [docs/CREDITS.md](docs/CREDITS.md)

## Lokale Entwicklung

Voraussetzungen: Node 22 und pnpm 10.

```bash
pnpm install      # Abhängigkeiten installieren
pnpm dev          # Dev-Server mit Hot Reload
pnpm test         # Unit-Tests (Vitest)
pnpm e2e          # End-to-End-Tests (Playwright)
pnpm build        # Produktions-Build nach dist/
```

Mit dem URL-Parameter `?debug=1` (z. B. `http://localhost:5173/?debug=1`) wird der Debug-Modus aktiviert.

## Docker

```bash
docker compose up -d --build   # Image bauen und Container starten
curl localhost:8080/health     # Healthcheck, antwortet mit "ok"
docker compose down            # Container stoppen und entfernen
```

Das Spiel ist anschließend unter http://localhost:8080 erreichbar. Der Container läuft ohne Root-Rechte (nginx-unprivileged, Port 8080).

## Deploy

```bash
pnpm deploy
```

Baut das Projekt und veröffentlicht `dist/` auf dem Branch `gh-pages` (GitHub Pages).
