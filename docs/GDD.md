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

### Ergänzungen P2 (implementiert in `src/ui/texts.ts`)

- **Titel:** „QUIETSCH!“ · „Raus aus dem dunklen Haus“ · Prämisse: „Halloween-Nacht, Sturm, stockdunkles Haus: Als Quietschhähnchen siehst du nur, was dein Schrei enthüllt.“ · Buttons „Spielen“, „Weiterspielen“
- **Steuerung ergänzt:** F = Taschenlampe (ab Küche). Esc im Korb = Shop, sonst Pause („Der Shop ist in Bellos Korb im Flur.“)
- **Story-Karten:** „Eine Kinderzeichnung“ · „Der Kalender“ · „Das große Fenster“: „Die Spuks stehen vor dem Fenster und schauen hinaus. Nicht zu dir.“ · „Die Kuckucksuhr“ · „Panik!“: „Zurück im Korb. Herzen regenerieren.“
- **Missionen:** Hub „Finde drei Dinge für die Haustür.“ / „Zur Haustür!“ · Küche nach Strom: „Hol die Taschenlampe aus der Schublade.“
- **Toasts:** „Schlüssel gefunden!“ · „Leer! – Nur Staub. −10 Federn. Da kommt was …“ · „Strom an! – Der Kühlschrank leuchtet. Etwas ist aufgewacht …“ · „Zu dunkel. – Erst Strom an.“ · „Taschenlampe gefunden! – F: an/aus. Lockt keine Spuks an.“ · „Batterie leer – Im Korb lädt sie wieder.“ · „Kuckuck! n/3“ · „Schrei im Blitz! – Die Uhr hört nur, wenn es blitzt.“ · „Mission geschafft! +50 Federn“ · „Friedlich – Er folgt dir in den Korb.“ · „Geisterlicht! +1“ · „Alle drei Schlösser offen. – Zur Haustür!“ · Türklingel (Minute 5): „…?“
- **Shop:** Untertitel „Federn gegen Mut. Bello hätte es so gewollt.“ · „Kaufen · Preis“, „Gekauft“, „Tragen“, „Abnehmen“, „Zu wenig Federn“, „bald verfügbar“ (Köder), „Weiter“
- **Finale-Wahl:** „Die Tür ist offen.“ · „Hinter dir warten alle Spuks. Draußen heult der Sturm.“ · „Schreien“ (Tür auf, hinaus in den Sturm) · „Still bleiben“ (Zurück in den Korb, nicht allein)
- **Enden:** „Ende A: Hinaus in den Sturm“ · „Ende B: Im Korb“ · Ergebnis zusätzlich mit „Geisterlichter“

### Balancing P2 (Ist-Stand, `src/core/economy.ts`)

- Ränge (XP kumulativ): Küken 0 · Gockel 80 · Hahn 220 · Schreihals 450 · Legende 800. XP = verdiente Federn + 100 pro Mission + 100 fürs Ende.
- Mission: +50 Federn. Falsche Kiste: −10 Federn + Socken-Geist. Gefangen: −1 Herz, −30 % (Dicke Haut −15 %). 0 Herzen = Panik, Korb füllt Herzen in 10 s.
- Upgrades: Große Lunge Radius 14→18 m, volle Ladung 1,5→1,2 s · Flinke Füße ×1,25 Tempo, Hüpfgeräusch halber Radius · Mut +1 Herz.
- Sterne pro Raum: Mission · unter 4:00 im Raum · nie im Raum gefangen (max. 9).

### Ergänzungen P4 (implementiert in `src/ui/texts.ts`)

- **Keller (T16):** Hohle Wand im Flur (Südwand, links vom Korb) reagiert auf einen Schrei: Toast „Hohl.“ / „Da ist etwas dahinter.“, Klopfgeräusch, Umriss pulsiert 4×. Prompt „E: Wand aufdrücken“ → Wand versinkt, Toast „Ein Geheimgang!“ / „Eine Treppe führt nach unten.“ Im Keller: „E: Karton ansehen“ (Spendenkarton → Twist-2-Karte „Der Karton“, genau einmal) mit Toast „Krone gefunden!“ / „+3 Geisterlichter“ (Krone wird automatisch getragen und erscheint danach im Shop zum An-/Ablegen), „E: Truhe öffnen“ → „Federtruhe!“ / „+40 Federn“. Ein Socken-Geist bewacht den Keller, dunklerer Nebel.
- **Ergebnisbildschirm:** zusätzliche Zeile „Geheimnis gefunden: ja/nein“ (Keller zählt nicht zu den Raum-Sternen).
- **Toasts:** oben mittig unter dem Missionsbanner, max. 3 sichtbar, ältere schrumpfen auf ihre Titelzeile.
- **Geisterlichter voll (T15):** Schrei auf einen Spuk im Licht macht ihn friedlich (Toast „Friedlich“ / „Er folgt dir in den Korb.“, warmer Glockenton). Socken: jedes Licht (Nachtlicht, Kühlschrank, Blitz, Taschenlampe) · Rudi: Kühlschranklicht oder Taschenlampenkegel · Hände: nur Blitz. Friedliche Spuks leuchten warm (Socke amber, Rudi warmes Lämpchen statt rotem Auge, Hand bernstein und ganz aus dem Boden), folgen dir und geben am Korb „Geisterlicht! +1“. Im Finale stehen die friedlichen vorne, dicht hinter dem Hähnchen. Ergebnis: „Befriedete Spuks n/m“.
- **Köder (T19):** Shop-Item „Köder: Quietschball“ (150) ist jetzt aktiv, Toast beim Kauf „Quietschball!“ / „Shift: werfen. Spuks laufen zum Quietschen.“ Shift wirft einen kleinen gelben Ball im Bogen bis 5 m (stoppt vor Wänden), er springt einmal auf und quietscht 3× in 4 s. Jedes Quietschen ist eine Geräuschquelle (gelber 6-m-Ring): Socken laufen hin, Rudi fährt hin, Hände ignorieren es. Der Ball enthüllt, zahlt aber keine Federn und macht nie friedlich. 2 s Abklingzeit, HUD-Chip unten links („⇧“ + Ball, füllt sich im Uhrzeigersinn). Titel-Steuerung: „Shift – Köder werfen (Shop)“.
- **Dachboden (T20):** Leiter an der Nordwand des Flurs („E: Leiter hochklettern“). Unter 7 Sternen: „Die Leiter ist zu hoch.“ / „n/7 Sterne – ab 7 Sternen kommst du hoch.“ Ab 7 Sternen: Klettern auf den Dachboden (Toast „Dachboden“ / „Staubig. Und ein bisschen warm.“, Missionsziel „Halsband anlegen.“). Darin: Bellos Decke („E: Decke ansehen“) → Story-Karte „Bello war hier“: „Eine alte Decke, Kratzspuren am Balken, Hundehaare überall. Hier oben hat sich Bello vor jedem Gewitter versteckt. Neben der Decke liegt sein Halsband.“ · „E: Halsband nehmen“ → „Bellos Halsband!“ / „Q: anlegen. 20 s greift dich kein Spuk an.“ und wird sofort angelegt („Halsband an!“ / „20 s lang greift dich keiner an.“; danach „Halsband ab.“ / „In 40 s wieder bereit (Q).“). HUD-Chip „Q · Halsband 19 s“ / „bereit in n s“ / „Halsband bereit“. Federtruhe (+40). „E: Hinunterklettern“ an der Luke. Titel-Steuerung: „Q – Halsband (Dachboden)“.
