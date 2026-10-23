# GDD – QUIETSCH! – Raus aus dem dunklen Haus

Stand: 2026-10-23 · Quelle: Projektplan (Abschnitt 2), ergänzt um Steuerung und In-Game-Texte.

## 2. Spielkonzept: „QUIETSCH! – Raus aus dem dunklen Haus“

**Ton:** Luigi's Mansion trifft Untitled Goose Game. Gruselig durch Dunkelheit, Sound und Timing, lustig durch das Hähnchen und seinen Schrei.

**Prämisse.** Halloween-Nacht, Sturm. Du bist das Quietschhähnchen, Lieblingsspielzeug von Hund Bello, zurückgelassen im Hundekorb neben der Heizung. Das Haus ist stockdunkel und voller Spuks. Ziel: **die Haustür öffnen und raus in die Nacht, zu Bello.** Dafür brauchst du drei Dinge aus drei Räumen. Draußen ist es spooky, drinnen auch.

**Kernmechanik: Schrei = Sonar.** Eine Taste. Kurz = Quietscher, kleiner Ring. Halten = der lange Hähnchen-Schrei, großer Ring, zeigt den ganzen Raum. Alles, was der Ring trifft, leuchtet als Umriss auf und verblasst. Jeder Spuk im Ring dreht sich zum Ursprung und kommt. Haltedauer = Sichtweite = Risiko.

**Belohnungssystem (Mobile-Game-Logik).**
- **Federn** (häufig): jedes Objekt, das dein Sonar zum ersten Mal enthüllt, lässt Federn fallen. Mehrere Objekte in einem Schrei = Combo („×3!“), Multiplikator. Truhen und Schubladen enthalten Feder-Bündel.
- **Geisterlichter** (selten): Spuk steht im Licht (Nachtlicht, Kühlschrank, Blitz) und du schreist ihn an → er wird friedlich, folgt dir in den Korb und gibt ein Geisterlicht. Außerdem in Geheimräumen.
- **Shop im Korb** („Bellos Korb“): Große Lunge (längerer Schrei), Flinke Füße, Mut (extra Herz), Dicke Haut (weniger Federverlust), Köder (neue Taste: Quietschball werfen), Hüte (Hexenhut, Kürbis, Krone, rein kosmetisch).
- **Herzen:** 3 Mut-Herzen. Gefangen = 1 Herz weg + 30 % der getragenen Federn. 0 Herzen = Panik: zurück in den Korb, Herzen regenerieren. Kein Game-Over.
- **XP und Rang:** Küken → Gockel → Hahn → Schreihals → Legende, mit Level-up-Fanfare und Vollbild-Flash.
- **Raum-Sterne:** pro Raum 3 Sterne (Mission, unter Zeit, nie gefangen). 7 Sterne öffnen den Dachboden.
- **Speichern** per localStorage, damit die Jury nach einem Reload weiterspielen kann.

**Räume und Missionen (statt Einsammeln: jede Mission hat ein eigenes Verb).**
1. **Flur (Hub):** Korb, Nachtlicht, Shop, Haustür mit 3 Schlössern. Wand zum Keller klingt hohl, wenn man sie anschreit (Geheimnis).
2. **Kinderzimmer, „Echo-Rätsel“:** 6 Spielzeugkisten, nur eine quietscht zurück, wenn du schreist. Der Schlüssel liegt darin. Socken-Geister wandern, laufen zu jedem Geräusch. Zeichnung an der Wand: „Bello hat Angst vor Gewitter“.
3. **Küche, „Der Jäger“:** Staubsauger „Rudi“ jagt alles, was laut ist, dauerhaft und schnell. Du musst zum Sicherungskasten, den Strom anmachen, der Kühlschrank wird zur Lichtinsel. In der Schublade: **Taschenlampe** (neue Fähigkeit, Lichtkegel mit Batterie, lockt nicht an). Kalender an der Wand: Umzug vor einem Jahr. Plot-Twist 1: Die Familie kommt nicht zurück.
4. **Wohnzimmer, „Die Uhr“:** Hände greifen aus dem Sofa, wenn du nah dran bist. Die Kuckucksuhr schlägt bei jedem Blitz. Schrei sie 3× im Blitz an, dann öffnet sich das Geheimfach mit dem Haustürschlüssel. Großes Fenster: Die Spuks stehen davor und schauen hinaus, nicht zu dir.
5. **Keller (geheim):** Spendenkarton mit deinem Foto drauf. Plot-Twist 2: Du solltest weggegeben werden. Belohnung: Krone, Geisterlichter.
6. **Dachboden (Stretch, 7 Sterne):** Bellos Halsband. Legt man es an, greifen Spuks 20 s nicht an.

**Grusel-Beats (gescriptet):** Erster Schrei im Wohnzimmer: eine Hand schießt direkt im Ring aus dem Sofa. Minute 5: Türklingel, Schatten hinter der Milchglasscheibe, nichts passiert. Küche: Strom an, dann flackert alles aus, Rudi erwacht. Herzschlag-Audio bei Spuk-Nähe, Flüstern aus Richtung unenthüllter Räume, Blitz-Silhouetten vor dem Fenster.

**Finale und Twist 3.** Drei Schlösser offen. An der Tür versammeln sich alle Spuks hinter dir. Textkarte: Sie haben dich nie gejagt. Sie sind die vergessenen Dinge des Hauses, angezogen vom einzigen Geräusch. **Entscheidung mit dem Kern-Verb:** Tür öffnen und schreiend in den Sturm (Ende A: Morgen, ein Umzugswagen, das Kind: „Wir haben dich vergessen!“) oder still bleiben (Ende B: alle im Korb, warm, nicht allein, draußen bleibt es spooky). Beide Enden zeigen die Statistik (Federn, Sterne, Rang, Zeit) wie ein Mobile-Game-Ergebnisbildschirm.

**Nachweis pro Jury-Kriterium.**

| Kriterium | Beleg |
|---|---|
| Experience | 12–15 Min Arc, Hub mit Progression, Speichern, Ergebnisbildschirm, kein Game-Over |
| Feel | Hüpfen mit Squash-Stretch, Schrei = wachsender Ring + Screen-Punch + Pitch nach Haltedauer, Floating-Numbers, Count-up-Counter, Shake, Konfetti |
| Hook | Sehen vs. still sein, Combo-Jagd, Shop-Upgrades, Sterne, Rang |
| Story | 3 Plot-Twists, Umgebungs-Erzählung pro Raum, Geheimraum, 2 verdiente Enden |
| Style | Low-Poly-3D-Diorama in Sonar-Noir, Nebel, Bloom, Vignette, Kamera schräg von oben, einziges Gelb ist das Hähnchen |
| Theme/Object | Hähnchen ist Held, sein Schrei die Mechanik, Sturm liefert Blitz-Rhythmus, Ziel ist „raus ins Spooky“ |
| Twist | Unbekannte Gegenstände (Taschenlampe, Halsband), Geheimraum, „Dein Schrei war immer eine Einladung“ |

## Steuerung

- **WASD / Pfeiltasten:** bewegen
- **Leertaste kurz:** Quietscher (kleiner Ring)
- **Leertaste halten:** Schrei (großer Ring, Haltedauer = Sichtweite)
- **E:** interagieren (Truhen, Schubladen, Schalter, Schlösser, Geheimfach)
- **Shift:** Köder werfen (ab Upgrade, später)
- **Esc:** Pause / Shop

## In-Game-Texte

### Intro
> Halloween-Nacht. Draußen tobt der Sturm. Das Haus ist stockdunkel, und es ist nicht leer.
> Du bist das Quietschhähnchen, Bellos Lieblingsspielzeug. Man hat dich im Hundekorb neben der Heizung vergessen.
> Bello wartet draußen. Du brauchst drei Dinge, um die Haustür zu öffnen.
> Schrei, um etwas zu sehen.

### Raumzeichnungen und Wandnotizen
- **Kinderzimmer (Zeichnung an der Wand):** „Bello hat Angst vor Gewitter.“
- **Küche (Kalender):** Ein Datum ist eingekreist, „Umzug“, 23.10.2025. Genau ein Jahr her.
- **Flur (Wand zum Keller, Schrei-Reaktion):** „Hohl. Da ist etwas dahinter.“
- **Wohnzimmer (Kuckucksuhr, nach 3× Schrei im Blitz):** „Geheimfach geöffnet. Darin: Haustürschlüssel.“

### Twist-Karten
- **Twist 1 (Küche, nach dem Kalender):** „Der Kalender lügt nicht. Die Familie kommt nicht zurück.“
- **Twist 2 (Keller, Spendenkarton):** „Auf dem Karton steht dein Foto. Tierheim-Spende, Abholung morgen. Du solltest weggegeben werden.“
- **Twist 3 (Finale, Tür):** „Sie haben dich nie gejagt. Sie sind die vergessenen Dinge des Hauses, angezogen vom einzigen Geräusch, das noch da ist.“
- **Finale-Karte:** „Dein Schrei war immer eine Einladung.“

### Enden
- **Ende A (Sturm):** „Am nächsten Morgen. Ein Umzugswagen vor dem Haus. Ein Kind springt heraus, sieht dich im Gras und ruft: ‚Wir haben dich vergessen!‘ Bello bellt zum ersten Mal seit Tagen.“
- **Ende B (Korb):** „Du bleibst still. Alle Spuks kuscheln sich mit dir in den Hundekorb. Warm, nicht allein. Draußen tobt der Sturm weiter. Drinnen ist es gemütlich.“

### Ergebnisbildschirm
- Überschrift: „Nacht vorbei“
- Zeilen: Federn · Sterne · Rang · Zeit
- Button: „Nochmal spielen“

### Ränge
1. Küken
2. Gockel
3. Hahn
4. Schreihals
5. Legende

### HUD, Toasts und Hinweise
- „Neuer Rang!“ (Toast mit Level-up-Fanfare)
- „×3!“ (Combo-Anzeige)
- „Gefangen! −1 Herz, −30 % Federn.“
- „Zurück im Korb. Herzen regenerieren.“ (Panik-Zustand)
- „Schloss 1 von 3 offen“ (Tür-Fortschritt)
- Missionsziele: „Finde den Schlüssel in der richtigen Kiste.“ · „Strom wieder an.“ · „Schrei die Uhr 3× im Blitz an.“ · „Halsband anlegen.“

### Shop „Bellos Korb“
| Item | Preis (Federn) | Flavourtext |
|---|---|---|
| Große Lunge | 80 | Längerer Schrei. Die Nachbarn haben sich schon beschwert. |
| Flinke Füße | 60 | Schneller über das Parkett. Quietscht dabei nur halb so viel. |
| Mut | 120 | Ein zusätzliches Herz. Mut heißt, trotzdem zu schreien. |
| Dicke Haut | 100 | Weniger Federverlust beim Fangen. Gummi hat auch Vorteile. |
| Köder: Quietschball | 150 | Neue Taste (Shift). Wirft einen Ball, der alles ablenkt. |
| Hexenhut | 40 | Kosmetisch. Sieht gruselig aus, ist aber nur Deko. |
| Kürbis-Kopf | 40 | Kosmetisch. Halloween braucht Kürbisse. |
| Krone | 250 | Kosmetisch. Für Legenden, die im Keller gefunden wurden. |
