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
  performanceTitle: string;
  performanceDescription: string;
  performanceFormulaFootnote: string;
  equalTeamsTitle: string;
  equalTeamsDescription: string;
  neutralTitle: string;
  neutralDescription: string;
  displayStatsTitle: string;
  displayStatsDescription: string;
  displayStatsFootnote: string;
  exampleDeltaTitle: string;
  exampleDeltaDescription: string;
  exampleColResult: string;
  exampleColPerformance: string;
  exampleColOutcome: string;
  exampleColSkill: string;
  exampleColTotal: string;
  exampleResultWin: string;
  exampleResultLoss: string;
  examplePerfAverage: string;
  examplePerfBest: string;
  examplePerfWorst: string;
  exampleParamsTitle: string;
  exampleParamsDescription: string;
  exampleColParameter: string;
  exampleColDefault: string;
  exampleParamStartRating: string;
  exampleParamStartRatingDesc: string;
  exampleParamK: string;
  exampleParamKDesc: string;
  exampleParamScale: string;
  exampleParamScaleDesc: string;
  exampleParamOutcome: string;
  exampleParamOutcomeDesc: string;
  exampleParamSkill: string;
  exampleParamSkillDesc: string;
  exampleParamPerfMix: string;
  exampleParamPerfMixDesc: string;
  examplePerfIndexTitle: string;
  examplePerfIndexDescription: string;
  examplePerfIndexFootnote: string;
  exampleColPlayer: string;
  exampleColKdRank: string;
  exampleColDmgRank: string;
  exampleColPerfIndex: string;
  exampleColSkillSign: string;
  examplePlayerA: string;
  examplePlayerB: string;
  examplePlayerC: string;
  exampleRankFirst: string;
  exampleRankThird: string;
  exampleRankFifth: string;
  exampleRankSecond: string;
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
  overviewDescription: 'Map wins and losses drive rank; K/D and damage add a small per-map nudge.',
  overviewItem1Label: 'Elo rating',
  overviewItem1Rest:
    ' — map W/L vs opponent team strength (primary), plus a capped performance adjustment.',
  overviewItem2Label: 'K/D and avg damage columns',
  overviewItem2Rest: ' — career totals on the leaderboard for context; the map nudge uses per-map ranks.',
  mapCountTitle: 'How a map counts',
  mapCountDescription: 'Each uploaded session is one map played by both teams.',
  mapCountBullet1: 'Players on the winning side have won = true; losers have won = false.',
  mapCountBullet2: 'Teams are inferred from the session — no separate team field is stored.',
  mapCountBullet3: 'All maps in the current year are replayed in date order to compute today’s rating.',
  eloFormulaTitle: 'Elo formula (outcome)',
  eloFormulaDescription:
    'Before each map, team averages use ratings earned from earlier maps only. Full K is applied to the result.',
  performanceTitle: 'Performance adjustment (skill mix)',
  performanceDescription:
    'K/D and damage on that map are ranked against everyone who played the map. Default weights: 40% outcome label / 60% skill scale (sum 100%).',
  performanceFormulaFootnote:
    'Dashboard sliders (K, scale, outcome/skill %) are session-only testers. Docs show production defaults only.',
  equalTeamsTitle: 'Equal teams',
  equalTeamsDescription:
    'When both team averages match, expected win is 50%. With default K = 24, the outcome part of a win is about +12 before skill adjustment.',
  neutralTitle: 'Neutral maps',
  neutralDescription:
    'If no player won in a session (all won = false), the map is treated as a scrim and skipped — no rating change for anyone.',
  displayStatsTitle: 'Display stats',
  displayStatsDescription: 'Career totals on the leaderboard (not the per-map rank used for skill adjustment):',
  displayStatsFootnote:
    'These columns help you judge overall form. The skill nudge uses how you ranked on each map only.',
  exampleDeltaTitle: 'Example map deltas',
  exampleDeltaDescription:
    'Equal 2v2 teams, K = 24, outcome/skill weights 40% / 60%. Outcome Δ is the W/L part; skill Δ is the performance nudge.',
  exampleColResult: 'Result',
  exampleColPerformance: 'Performance',
  exampleColOutcome: 'Outcome Δ',
  exampleColSkill: 'Skill Δ',
  exampleColTotal: 'Total Δ',
  exampleResultWin: 'Win',
  exampleResultLoss: 'Loss',
  examplePerfAverage: 'Average on map',
  examplePerfBest: 'Best on map',
  examplePerfWorst: 'Worst on map',
  exampleParamsTitle: 'Default parameters',
  exampleParamsDescription: 'Production defaults (not live dashboard slider values).',
  exampleColParameter: 'Parameter',
  exampleColDefault: 'Default',
  exampleParamStartRating: 'Start rating',
  exampleParamStartRatingDesc: 'New player baseline',
  exampleParamK: 'K factor',
  exampleParamKDesc: 'Outcome change speed',
  exampleParamScale: 'Elo scale',
  exampleParamScaleDesc: 'Favorite/underdog curve',
  exampleParamOutcome: 'Outcome weight',
  exampleParamOutcomeDesc: 'Map W/L label (full K applied)',
  exampleParamSkill: 'Skill weight',
  exampleParamSkillDesc: 'K/D + damage nudge scale',
  exampleParamPerfMix: 'perfIndex mix',
  exampleParamPerfMixDesc: 'Within-map performance rank',
  examplePerfIndexTitle: 'perfIndex illustration',
  examplePerfIndexDescription: 'One map, five players — ranks are within that map only.',
  examplePerfIndexFootnote: 'Skill Δ for a winner at default settings; exact value depends on K and skill weight.',
  exampleColPlayer: 'Player',
  exampleColKdRank: 'K/D rank',
  exampleColDmgRank: 'Damage rank',
  exampleColPerfIndex: 'perfIndex',
  exampleColSkillSign: 'Skill Δ (winner)',
  examplePlayerA: 'A',
  examplePlayerB: 'B',
  examplePlayerC: 'C',
  exampleRankFirst: '1st',
  exampleRankThird: '3rd',
  exampleRankFifth: '5th',
  exampleRankSecond: '2nd',
  deltaTitle: 'Rating change badge',
  deltaDescription:
    'The +/- badge compares your Elo at the end of the last global play day vs the previous play day (365-day window). Shown only if you played on the last day.',
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
  overviewDescription: 'Место в таблице задают победы/поражения; K/D и урон дают небольшой поправочный вклад за карту.',
  overviewItem1Label: 'Рейтинг Elo',
  overviewItem1Rest:
    ' — W/L против силы команды соперника (основа) плюс ограниченная поправка за игру на карте.',
  overviewItem2Label: 'Колонки K/D и средний урон',
  overviewItem2Rest:
    ' — суммарная статистика на таблице; для поправки используются ранги за конкретную карту.',
  mapCountTitle: 'Как учитывается карта',
  mapCountDescription: 'Каждая загруженная сессия — одна карта с двумя командами.',
  mapCountBullet1: 'У победившей стороны won = true, у проигравшей — false.',
  mapCountBullet2: 'Команды определяются из сессии — отдельное поле команды не хранится.',
  mapCountBullet3: 'Все карты текущего года пересчитываются по дате для итогового рейтинга.',
  eloFormulaTitle: 'Формула Elo (исход)',
  eloFormulaDescription:
    'Перед каждой картой средние команд считаются только по рейтингу с предыдущих карт. K применяется полностью к результату.',
  performanceTitle: 'Поправка за игру (skill mix)',
  performanceDescription:
    'K/D и урон на карте сравниваются со всеми игроками этой карты. По умолчанию: 40% исход / 60% скилл (сумма 100%).',
  performanceFormulaFootnote:
    'Ползунки на дашборде (K, scale, веса) только для теста в сессии. Здесь — боевые значения по умолчанию.',
  equalTeamsTitle: 'Равные команды',
  equalTeamsDescription:
    'При равных средних ожидаемая победа — 50%. При K = 24 часть за победу около +12 до поправки за игру.',
  neutralTitle: 'Нейтральные карты',
  neutralDescription:
    'Если в сессии никто не победил (все won = false), карта считается тренировочной и пропускается — рейтинг не меняется.',
  displayStatsTitle: 'Статистика для отображения',
  displayStatsDescription: 'Суммы на таблице лидеров (не ранг за карту для поправки):',
  displayStatsFootnote:
    'Эти колонки показывают общую форму. Поправка считается по месту на каждой карте отдельно.',
  exampleDeltaTitle: 'Примеры изменения за карту',
  exampleDeltaDescription:
    'Равные команды 2v2, K = 24, веса 40% / 60%. Outcome Δ — за W/L; Skill Δ — за игру на карте.',
  exampleColResult: 'Исход',
  exampleColPerformance: 'Игра',
  exampleColOutcome: 'Outcome Δ',
  exampleColSkill: 'Skill Δ',
  exampleColTotal: 'Итого Δ',
  exampleResultWin: 'Победа',
  exampleResultLoss: 'Поражение',
  examplePerfAverage: 'Средняя на карте',
  examplePerfBest: 'Лучшая на карте',
  examplePerfWorst: 'Худшая на карте',
  exampleParamsTitle: 'Параметры по умолчанию',
  exampleParamsDescription: 'Боевые значения (не положение ползунков на дашборде).',
  exampleColParameter: 'Параметр',
  exampleColDefault: 'Значение',
  exampleParamStartRating: 'Старт',
  exampleParamStartRatingDesc: 'Базовый рейтинг нового игрока',
  exampleParamK: 'K factor',
  exampleParamKDesc: 'Скорость изменения за исход',
  exampleParamScale: 'Elo scale',
  exampleParamScaleDesc: 'Кривая фаворита/аутсайдера',
  exampleParamOutcome: 'Вес исхода',
  exampleParamOutcomeDesc: 'W/L (полный K)',
  exampleParamSkill: 'Вес скилла',
  exampleParamSkillDesc: 'Масштаб поправки K/D + урон',
  exampleParamPerfMix: 'perfIndex mix',
  exampleParamPerfMixDesc: 'Ранг игры на карте',
  examplePerfIndexTitle: 'Пример perfIndex',
  examplePerfIndexDescription: 'Одна карта, пять игроков — ранги только внутри этой карты.',
  examplePerfIndexFootnote: 'Skill Δ для победителя при настройках по умолчанию; зависит от K и веса скилла.',
  exampleColPlayer: 'Игрок',
  exampleColKdRank: 'Ранг K/D',
  exampleColDmgRank: 'Ранг урона',
  exampleColPerfIndex: 'perfIndex',
  exampleColSkillSign: 'Skill Δ (победа)',
  examplePlayerA: 'A',
  examplePlayerB: 'B',
  examplePlayerC: 'C',
  exampleRankFirst: '1-й',
  exampleRankThird: '3-й',
  exampleRankFifth: '5-й',
  exampleRankSecond: '2-й',
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
