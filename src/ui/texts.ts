// German in-game texts (GDD "In-Game-Texte"). Single lookup for UI copy.

import type { CardId } from '@/core/story';

export interface StoryCardText {
  title: string;
  text: string;
  button?: string;
}

/** Rank names, index 0 = rank 1. */
export const RANK_NAMES = ['Küken', 'Gockel', 'Hahn', 'Schreihals', 'Legende'] as const;

export function rankName(rank: number): string {
  const idx = Math.min(Math.max(rank, 1), RANK_NAMES.length) - 1;
  return RANK_NAMES[idx] ?? RANK_NAMES[0];
}

export const STORY_CARDS: Record<CardId, StoryCardText> = {
  intro: {
    title: 'Halloween-Nacht',
    text: [
      'Draußen tobt der Sturm. Das Haus ist stockdunkel, und es ist nicht leer.',
      'Du bist das Quietschhähnchen, Bellos Lieblingsspielzeug. Man hat dich im Hundekorb neben der Heizung vergessen.',
      'Bello wartet draußen. Du brauchst drei Dinge, um die Haustür zu öffnen.',
      'Schrei, um etwas zu sehen.',
    ].join('\n\n'),
    button: 'Los geht’s',
  },
  twist1: {
    title: 'Der Kalender',
    text: 'Der Kalender lügt nicht. Die Familie kommt nicht zurück.',
  },
  twist2: {
    title: 'Der Karton',
    text: 'Auf dem Karton steht dein Foto. Tierheim-Spende, Abholung morgen. Du solltest weggegeben werden.',
  },
  twist3: {
    title: 'Die Tür',
    text: 'Sie haben dich nie gejagt. Sie sind die vergessenen Dinge des Hauses, angezogen vom einzigen Geräusch, das noch da ist.',
  },
  finale: {
    title: 'Finale',
    text: 'Dein Schrei war immer eine Einladung.',
  },
  drawing: {
    title: 'Eine Kinderzeichnung',
    text: '„Bello hat Angst vor Gewitter.“',
  },
  calendar: {
    title: 'Der Kalender',
    text: 'Ein Datum ist eingekreist, „Umzug“, 23.10.2025. Genau ein Jahr her.',
  },
  window: {
    title: 'Das große Fenster',
    text: 'Die Spuks stehen vor dem Fenster und schauen hinaus. Nicht zu dir.',
  },
  clock: {
    title: 'Die Kuckucksuhr',
    text: 'Geheimfach geöffnet. Darin: Haustürschlüssel.',
  },
  bello: {
    title: 'Bello war hier',
    text: 'Eine alte Decke, Kratzspuren am Balken, Hundehaare überall. Hier oben hat sich Bello vor jedem Gewitter versteckt. Neben der Decke liegt sein Halsband.',
  },
  panic: {
    title: 'Panik!',
    text: 'Zurück im Korb. Alle Herzen wieder voll.',
    button: 'Durchatmen',
  },
  peaceHint: {
    title: 'Das Nachtlicht',
    text: 'Spuk im Licht anschreien = befrieden.',
    button: 'Verstanden',
  },
};

/** Title screen (GDD Prämisse + Steuerung). */
export const TITLE = {
  title: 'QUIETSCH!',
  subtitle: 'Raus aus dem dunklen Haus',
  premise:
    'Halloween-Nacht, Sturm, stockdunkles Haus: Als Quietschhähnchen siehst du nur, was dein Schrei enthüllt.',
  controls: [
    ['WASD / Pfeile', 'bewegen'],
    ['Leertaste kurz', 'Quietscher'],
    ['Leertaste halten', 'Schrei (Sichtweite)'],
    ['E', 'interagieren'],
    ['F', 'Taschenlampe'],
    ['Shift', 'Köder werfen (Shop)'],
    ['Q', 'Halsband (Dachboden)'],
    ['Esc', 'Pause / Shop im Korb'],
  ] as const,
  play: 'Spielen',
  continue: 'Weiterspielen',
} as const;

/** HUD, toast and prompt texts (GDD "HUD, Toasts und Hinweise"). */
export const T = {
  caught: 'Gefangen!',
  caughtSub: (lossPct: number): string => `−1 Herz, −${lossPct} % Federn.`,
  keyFound: 'Schlüssel gefunden!',
  wrongBox: 'Leer!',
  wrongBoxSub: (lost: number): string =>
    lost > 0 ? `Nur Staub. −${lost} Federn. Da kommt was …` : 'Nur Staub. Da kommt was …',
  boxEmpty: 'Die Kiste ist leer.',
  powerOn: 'Strom an!',
  powerOnSub: 'Der Kühlschrank leuchtet. Etwas ist aufgewacht …',
  drawerDark: 'Zu dunkel.',
  drawerDarkSub: 'Erst Strom an.',
  flashlight: 'Taschenlampe gefunden!',
  flashlightSub: 'F: an/aus. Lockt keine Spuks an.',
  batteryEmpty: 'Batterie leer',
  batteryEmptySub: 'Im Korb lädt sie wieder.',
  clockCount: (n: number): string => `Kuckuck! ${n}/3`,
  clockMiss: 'Schrei im Blitz!',
  clockMissSub: 'Die Uhr hört nur, wenn es blitzt.',
  missionDone: 'Mission geschafft!',
  missionDoneSub: (feathers: number): string => `+${feathers} Federn`,
  ghostlight: 'Geisterlicht! +1',
  ghostlightSub: 'Ein Spuk ist jetzt friedlich.',
  peaceful: 'Friedlich',
  peacefulSub: 'Er folgt dir in den Korb.',
  doorbell: '…?',
  allLocks: 'Alle drei Schlösser offen.',
  allLocksSub: 'Zur Haustür!',
  toDoor: 'Zur Haustür!',
  hub: 'Finde drei Dinge für die Haustür.',
  nightHint: 'Tipp: Socke ins Nachtlicht locken und anschreien = befrieden.',
  rankUp: 'Neuer Rang!',
  bought: 'Gekauft!',
  saved: 'Gespeichert',
  hollow: 'Hohl.',
  hollowSub: 'Da ist etwas dahinter.',
  kellerOpen: 'Ein Geheimgang!',
  kellerOpenSub: 'Eine Treppe führt nach unten.',
  crown: 'Krone gefunden!',
  crownSub: '+3 Geisterlichter',
  chest: 'Federtruhe!',
  chestSub: (n: number): string => `+${n} Federn`,
  ladderLocked: 'Die Leiter ist zu hoch.',
  ladderLockedSub: (stars: number, need: number): string =>
    `${stars}/${need} Sterne – ab ${need} Sternen kommst du hoch.`,
  attic: 'Dachboden',
  atticSub: 'Staubig. Und ein bisschen warm.',
  collar: 'Bellos Halsband!',
  collarSub: 'Q: anlegen. 20 s greift dich kein Spuk an.',
  collarOn: 'Halsband an!',
  collarOnSub: '20 s lang greift dich keiner an.',
  collarOff: 'Halsband ab.',
  collarOffSub: 'In 40 s wieder bereit (Q).',
  collarObjective: 'Halsband anlegen.',
  bait: 'Quietschball!',
  baitSub: 'Shift: werfen. Spuks laufen zum Quietschen.',
} as const;

/** Prompt verbs shown as "E: <verb>". */
export const PROMPT: Record<string, string> = {
  toybox: 'Kiste öffnen',
  drawing: 'Zeichnung ansehen',
  fuse: 'Sicherung umlegen',
  drawer: 'Schublade öffnen',
  calendar: 'Kalender lesen',
  clock: 'Uhr ansehen',
  window: 'Hinausschauen',
  frontdoor: 'Haustür',
  hollow: 'Wand aufdrücken',
  donation: 'Karton ansehen',
  chest: 'Truhe öffnen',
  ladder: 'Leiter hochklettern',
  hatch: 'Hinunterklettern',
  collar: 'Halsband nehmen',
  dogbed: 'Decke ansehen',
  korb: 'Bellos Korb (Shop)',
};

export const SHOP = {
  title: 'Bellos Korb',
  subtitle: 'Federn gegen Mut. Bello hätte es so gewollt.',
  buy: 'Kaufen',
  owned: 'Gekauft',
  wear: 'Tragen',
  takeOff: 'Abnehmen',
  tooExpensive: 'Zu wenig Federn',
  close: 'Weiter',
} as const;

export const PAUSE = {
  title: 'Pause',
  text: 'Der Shop ist in Bellos Korb im Flur.',
  resume: 'Weiter',
} as const;

export const CHOICE = {
  title: 'Die Tür ist offen.',
  text: 'Hinter dir warten alle Spuks. Draußen heult der Sturm.',
  scream: 'Schreien',
  screamSub: 'Tür auf, hinaus in den Sturm',
  silent: 'Still bleiben',
  silentSub: 'Zurück in den Korb, nicht allein',
} as const;

export const ENDINGS = {
  A: {
    title: 'Ende A: Hinaus in den Sturm',
    text: 'Du quietschst hinaus in den Sturm und kauerst die Nacht im nassen Gras. Im Morgengrauen hält ein Umzugswagen vor dem Haus. Ein Kind springt heraus, sieht dich und ruft: ‚Wir haben dich vergessen!‘ Bello bellt zum ersten Mal seit Tagen.',
  },
  B: {
    title: 'Ende B: Im Korb',
    text: 'Du bleibst still. Alle Spuks kuscheln sich mit dir in den Hundekorb. Warm, nicht allein. Draußen tobt der Sturm weiter. Drinnen ist es gemütlich.',
  },
} as const;

export const RESULTS = {
  heading: 'Nacht vorbei',
  feathers: 'Federn',
  ghostlights: 'Geisterlichter',
  peaceful: 'Befriedete Spuks',
  stars: 'Sterne',
  rank: 'Rang',
  time: 'Zeit',
  secret: 'Geheimnis gefunden',
  yes: 'ja',
  no: 'nein',
  replay: 'Nochmal spielen',
} as const;

/** P7 combat, horror and Ansturm texts. */
export const COMBAT_T = {
  double: 'Doppel!',
  triple: 'Dreifach!',
  streakSub: (bonus: number): string => `+${bonus} Federn`,
  combo: (n: number): string => `Kombo ×${n}`,
  immune: 'Klonk!',
  immuneSub: 'Rudi ist gepanzert. Erst betäuben (langer Schrei) oder ins Kühlschranklicht locken.',
  stunned: 'Betäubt!',
  handRetreat: 'Die Hand verkriecht sich.',
  rudiDown: 'Rudi ist geplatzt!',
  rudiDownSub: 'Eine Staubwolke voller Federn.',
  firstKill: 'Vertrieben!',
  firstKillSub: 'Vertriebene Spuks kommen wieder. Nur Befriedete bleiben bei dir.',
  hit: 'Autsch!',
  hordeStart: 'Ansturm!',
  hordeStartSub: 'Halte 40 Sekunden durch.',
  hordeWin: 'Ansturm überstanden!',
  hordeWinSub: '+100 Federn',
  battery: 'Lampe',
  frozen: 'Eingefroren!',
} as const;
