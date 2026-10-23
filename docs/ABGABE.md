# Abgabe-Checkliste – QUIETSCH!

Für Alex. Alle Texte sind fertig formuliert und können kopiert werden.

## Links
- **Live-URL:** https://alwa991.github.io/quietsch/
- **Repo-URL:** https://github.com/AlWa991/quietsch
- **Spieltitel:** QUIETSCH! – Raus aus dem dunklen Haus

## Kurzbeschreibung (spoilerfrei)
Halloween-Nacht, Sturm, ein stockdunkles Haus: Du bist das Quietschhähnchen, Lieblingsspielzeug von Hund Bello, und willst die Haustür öffnen und raus in die Nacht. Dein einziges Werkzeug ist dein Schrei: Er wirft einen Sonar-Ring, der die Umgebung aufleuchten lässt, aber auch alles Spukige auf dich aufmerksam macht. Je länger du schreist, desto mehr siehst du und desto größer ist das Risiko.

## Steuerung
| Taste              | Aktion                                              |
| ------------------ | --------------------------------------------------- |
| WASD / Pfeiltasten | Bewegen                                             |
| Leertaste kurz     | Quietscher (kleiner Sonar-Ring)                     |
| Leertaste halten   | Langer Schrei (großer Ring, zeigt den ganzen Raum)  |
| E                  | Interagieren                                        |
| F                  | Taschenlampe (sobald freigeschaltet)                |
| Shift              | Köder werfen (sobald im Shop gekauft)               |
| Q                  | Bellos Halsband (sobald auf dem Dachboden gefunden) |
| Esc                | Shop / Pause                                        |

## Theme und Objekt
- Theme: „It's spooky outside“
- Objekt: Quietschhähnchen

## Tech-Stack
Three.js und TypeScript, gebündelt mit Vite. Tests mit Vitest und Playwright. Auslieferung per nginx-unprivileged im Docker-Container.

## KI-Einsatz (Hinweis für die Abgabe)
Der Code wurde mit Claude Code erstellt. Assets: Kenney Furniture Kit 2.0 (CC0) und prozedurale Primitive. Audio ist synthetisch per WebAudio erzeugt. Es wird kein KI-generiertes Bildmaterial verwendet.

## Credits
Vollständige Liste: docs/CREDITS.md (im Repo, verlinkt aus der README).

## Empfohlene Browser
- Chrome, Edge oder Firefox, jeweils Desktop-Version
- Tastatur wird benötigt (Maus nur für Menüs)

## Bekannte Einschränkungen
- Nur Desktop, keine Touch-Steuerung
- Spielzeit ca. 7–10 Minuten (Schätzung, nicht gemessen)
- Geheimräume (Keller, Dachboden) sind optional

## Vor dem Absenden (Alex)
- [ ] Live-URL im Browser öffnen, Titel lädt, Ton startet nach Klick
- [ ] Repo-URL öffnen, README sichtbar
- [ ] Texte oben in das Abgabeformular kopieren
- [ ] Abgabe-Frist im Portal prüfen
