// German in-game texts (GDD "In-Game-Texte"). Single lookup for UI copy.

export interface StoryCardText {
  title: string;
  text: string;
  button?: string;
}

/** Rank names, index 0 = rank 1. */
export const RANK_NAMES = ['Küken', 'Gockel', 'Hahn', 'Schreihals', 'Legende'] as const;

/** Cumulative XP needed to reach each rank (index 0 = rank 1). Display-only; economy owns real values. */
export const RANK_XP_THRESHOLDS = [0, 100, 300, 700, 1500] as const;

export function rankName(rank: number): string {
  const idx = Math.min(Math.max(rank, 1), RANK_NAMES.length) - 1;
  return RANK_NAMES[idx] ?? RANK_NAMES[0];
}

/** Progress 0..1 towards the next rank; 1 at max rank. */
export function rankProgress(rank: number, xp: number): number {
  const idx = Math.min(Math.max(rank, 1), RANK_NAMES.length) - 1;
  const next = RANK_XP_THRESHOLDS[idx + 1];
  const cur = RANK_XP_THRESHOLDS[idx] ?? 0;
  if (next === undefined) return 1;
  return Math.min(1, Math.max(0, (xp - cur) / (next - cur)));
}

export const STORY_CARDS: Record<string, StoryCardText> = {
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
};
