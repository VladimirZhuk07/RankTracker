import { isRussianLocale } from './achievements-i18n';

export type RatingRulesStrings = {
  heroTitle: string;
  introBeforeStrong: string;
  introStrong: string;
  introAfterStrong: string;
  codeLabel: string;
  introAfterCode: string;
  overviewTitle: string;
  overviewDescription: string;
  overviewItem1Label: string;
  overviewItem1Rest: string;
  overviewItem2Label: string;
  overviewItem2Rest: string;
  mapCountTitle: string;
  mapCountDescription: string;
  mapCountBullet1: string;
  mapCountBullet2: string;
  mapCountBullet3: string;
  eloFormulaTitle: string;
  eloFormulaDescription: string;
  equalTeamsTitle: string;
  equalTeamsDescription: string;
  neutralTitle: string;
  neutralDescription: string;
  displayStatsTitle: string;
  displayStatsDescription: string;
  displayStatsFootnote: string;
  deltaTitle: string;
  deltaDescription: string;
  typicalRangeTitle: string;
  typicalRangeDescription: string;
};

const EN: RatingRulesStrings = {
  heroTitle: 'How ratings work',
  introBeforeStrong: 'Each player rating is an ',
  introStrong: 'Elo score',
  introAfterStrong: ' (starting at 1000). Logic lives in ',
  codeLabel: 'rating-elo.ts',
  introAfterCode: ' and is summarized below.',
  overviewTitle: 'Overview',
  overviewDescription: 'Two numbers appear on the leaderboard — only one affects rank.',
  overviewItem1Label: 'Elo rating',
  overviewItem1Rest: ' — map wins and losses vs opponent team strength, replayed chronologically.',
  overviewItem2Label: 'K/D and avg damage',
  overviewItem2Rest: ' — raw performance stats for display only; they do not change Elo.',
  mapCountTitle: 'How a map counts',
  mapCountDescription: 'Each uploaded session is one map played by both teams.',
  mapCountBullet1: 'Players on the winning side have won = true; losers have won = false.',
  mapCountBullet2: 'Teams are inferred from the session — no separate team field is stored.',
  mapCountBullet3: 'All maps in the current year are replayed in date order to compute today’s rating.',
  eloFormulaTitle: 'Elo formula',
  eloFormulaDescription:
    'Before each map, team averages use ratings earned from earlier maps only.',
  equalTeamsTitle: 'Equal teams',
  equalTeamsDescription:
    'When both team averages match, expected win is 50%. With the default K factor of 24, a win adds about +12 and a loss subtracts about −12.',
  neutralTitle: 'Neutral maps',
  neutralDescription:
    'If no player won in a session (all won = false), the map is treated as a scrim and skipped — no rating change for anyone.',
  displayStatsTitle: 'Display stats',
  displayStatsDescription: 'K/D ratio and average damage per map are plain totals:',
  displayStatsFootnote: 'These stats help you judge form but never enter the Elo calculation.',
  deltaTitle: 'Rating change badge',
  deltaDescription:
    'The +/- badge on the leaderboard compares your Elo at the end of the last global play day vs the previous play day (365-day window). Shown only if you played on the last day.',
  typicalRangeTitle: 'Typical range',
  typicalRangeDescription:
    'In a small group, active players usually sit roughly between 900 and 1100. There is no upper cap at 100.',
};

const RU: RatingRulesStrings = {
  heroTitle: 'Как считается рейтинг',
  introBeforeStrong: 'Рейтинг каждого игрока — это ',
  introStrong: 'очки Elo',
  introAfterStrong: ' (старт с 1000). Логика в ',
  codeLabel: 'rating-elo.ts',
  introAfterCode: ', ниже кратко.',
  overviewTitle: 'Обзор',
  overviewDescription: 'На таблице лидеров два показателя — на место влияет только один.',
  overviewItem1Label: 'Рейтинг Elo',
  overviewItem1Rest: ' — победы и поражения на карте с учётом силы команды соперника, пересчёт по хронологии.',
  overviewItem2Label: 'K/D и средний урон',
  overviewItem2Rest: ' — сырая статистика только для отображения; на Elo не влияет.',
  mapCountTitle: 'Как учитывается карта',
  mapCountDescription: 'Каждая загруженная сессия — одна карта с двумя командами.',
  mapCountBullet1: 'У победившей стороны won = true, у проигравшей — false.',
  mapCountBullet2: 'Команды определяются из сессии — отдельное поле команды не хранится.',
  mapCountBullet3: 'Все карты текущего года пересчитываются по дате для итогового рейтинга.',
  eloFormulaTitle: 'Формула Elo',
  eloFormulaDescription:
    'Перед каждой картой средние команд считаются только по рейтингу с предыдущих карт.',
  equalTeamsTitle: 'Равные команды',
  equalTeamsDescription:
    'При равных средних ожидаемая победа — 50%. При K = 24 победа даёт около +12, поражение около −12.',
  neutralTitle: 'Нейтральные карты',
  neutralDescription:
    'Если в сессии никто не победил (все won = false), карта считается тренировочной и пропускается — рейтинг не меняется.',
  displayStatsTitle: 'Статистика для отображения',
  displayStatsDescription: 'K/D и средний урон за карту — простые суммы без модификаторов:',
  displayStatsFootnote: 'Эти цифры показывают форму, но в расчёт Elo не входят.',
  deltaTitle: 'Бейдж изменения рейтинга',
  deltaDescription:
    'Значок +/- сравнивает Elo на конец последнего игрового дня с предыдущим (окно 365 дней). Показывается только если вы играли в последний день.',
  typicalRangeTitle: 'Типичный диапазон',
  typicalRangeDescription:
    'В небольшой группе активные игроки обычно между 900 и 1100. Верхней границы в 100 нет.',
};

export function getRatingRulesText(locale: string): RatingRulesStrings {
  return isRussianLocale(locale) ? RU : EN;
}
