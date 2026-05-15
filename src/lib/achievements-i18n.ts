import { CS2_MAPS } from './storage/definitions';

/** Map index (0..6) to achievement icon filename for "10 wins on map" badges. */
export const MAP_INDEX_TO_ICON: readonly string[] = [
  'ancient-guardian.svg',
  'anubis-pharaoh.svg',
  'sultan-dust-2.svg',
  'inferno-king.svg',
  'mirage_emperor.svg',
  'nuke-engineer.svg',
  'overpass-president.svg',
] as const;

export type AchievementInfo = {
  id: string;
  iconPath: string;
  nameEn: string;
  nameRu: string;
  descriptionEn: string;
  descriptionRu: string;
};

const MAP_NAMES_EN: Record<string, string> = {
  Ancient: 'Ancient',
  Anubis: 'Anubis',
  'Dust II': 'Dust II',
  Inferno: 'Inferno',
  Mirage: 'Mirage',
  Nuke: 'Nuke',
  Overpass: 'Overpass',
};

const MAP_NAMES_RU: Record<string, string> = {
  Ancient: 'Ancient',
  Anubis: 'Anubis',
  'Dust II': 'Dust II',
  Inferno: 'Inferno',
  Mirage: 'Mirage',
  Nuke: 'Nuke',
  Overpass: 'Overpass',
};

const MAP_ACHIEVEMENT_NAMES_EN: Record<string, string> = {
  Ancient: 'Ancient Guardian',
  Anubis: 'Anubis Pharaoh',
  'Dust II': 'Sultan of Dust II',
  Inferno: 'King of Inferno',
  Mirage: 'Emperor of Mirage',
  Nuke: 'Nuke Engineer',
  Overpass: 'President of Overpass',
};

const MAP_ACHIEVEMENT_NAMES_RU: Record<string, string> = {
  Ancient: 'Страж Ancient',
  Anubis: 'Фараон Anubis',
  'Dust II': 'Султан Dust II',
  Inferno: 'Король Inferno',
  Mirage: 'Император Mirage',
  Nuke: 'Инженер Nuke',
  Overpass: 'Президент Overpass',
};

function buildMapAchievements(): AchievementInfo[] {
  return CS2_MAPS.map((mapName, index) => ({
    id: `map-${index}-${MAP_INDEX_TO_ICON[index].replace('.svg', '')}`,
    iconPath: MAP_INDEX_TO_ICON[index],
    nameEn: MAP_ACHIEVEMENT_NAMES_EN[mapName] ?? mapName,
    nameRu: MAP_ACHIEVEMENT_NAMES_RU[mapName] ?? mapName,
    descriptionEn: `10+ wins on ${MAP_NAMES_EN[mapName] ?? mapName}`,
    descriptionRu: `10+ побед на карте ${MAP_NAMES_RU[mapName] ?? mapName}`,
  }));
}

export const ALL_ACHIEVEMENTS_INFO: AchievementInfo[] = [
  ...buildMapAchievements(),
  {
    id: 'favorite-map',
    iconPath: 'favorite-map.svg',
    nameEn: 'Favorite map',
    nameRu: 'Любимая карта',
    descriptionEn: 'Awarded for the map where you have the most wins.',
    descriptionRu: 'Выдаётся за карту, на которой у вас больше всего побед.',
  },
  {
    id: 'anti-map',
    iconPath: 'anti-map.svg',
    nameEn: 'Anti-map',
    nameRu: 'Анти-карта',
    descriptionEn: 'Awarded for the map where you have the most losses.',
    descriptionRu: 'Выдаётся за карту, на которой у вас больше всего поражений.',
  },
  {
    id: 'berserker',
    iconPath: 'berserker.svg',
    nameEn: 'Berserker',
    nameRu: 'Берсеркер',
    descriptionEn: '5+ won games where each match has\n25+ kills and K/D >= 1.5.',
    descriptionRu: '5+ побед, где в каждом матче:\n25+ убийств и K/D >= 1.5.',
  },
  {
    id: 'hand_of_god',
    iconPath: 'hand_of_god.svg',
    nameEn: 'Hand of God',
    nameRu: 'Рука Бога',
    descriptionEn:
      'Awarded by the community for clutch plays or a match-winning performance — assigned manually.',
    descriptionRu:
      'Выдаётся сообществом за клатчи или решающий вклад в победу — назначается вручную.',
  },
];

/** Achievements that can only be earned via admin assignment (not computed from stats). */
export const MANUAL_ASSIGNABLE_ACHIEVEMENTS: AchievementInfo[] = ALL_ACHIEVEMENTS_INFO.filter(
  (a) => a.id === 'hand_of_god'
);

const VALID_ACHIEVEMENT_IDS = new Set(ALL_ACHIEVEMENTS_INFO.map((a) => a.id));

export function isValidAchievementId(id: string): boolean {
  return VALID_ACHIEVEMENT_IDS.has(id);
}

/**
 * Returns true if the locale is Belarusian or Russian (use Russian translations).
 */
export function isRussianLocale(locale: string): boolean {
  const lower = locale.toLowerCase();
  return lower.startsWith('be') || lower.startsWith('ru');
}

export function getAchievementText(
  achievement: AchievementInfo,
  locale: string
): { name: string; description: string } {
  const useRu = isRussianLocale(locale);
  return {
    name: useRu ? achievement.nameRu : achievement.nameEn,
    description: useRu ? achievement.descriptionRu : achievement.descriptionEn,
  };
}

export const PAGE_TITLE = {
  en: 'Achievements',
  ru: 'Достижения',
} as const;

export function getPageText(locale: string): { title: string } {
  const useRu = isRussianLocale(locale);
  return {
    title: useRu ? PAGE_TITLE.ru : PAGE_TITLE.en,
  };
}
