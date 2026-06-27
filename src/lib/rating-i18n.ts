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
  winLossTitle: string;
  winLossDescription: string;
  winBulletPrefix: string;
  winBulletMiddle: string;
  winBulletSuffix: string;
  lossBulletPrefix: string;
  lossBulletMiddle: string;
  lossBulletSuffix: string;
  neutralBulletPrefix: string;
  neutralBulletSuffix: string;
  aggregationTitle: string;
  aggregationFormulaComment: string;
  aggregationFootnote: string;
  normalizationTitle: string;
  normalizationDescriptionBefore: string;
  normalizationDescriptionAfter: string;
  normalizationFootnote: string;
};

const EN: RatingRulesStrings = {
  heroTitle: 'How ratings work',
  introBeforeStrong: 'Each player rating is a number from ',
  introStrong: '0–100',
  introAfterStrong: '. Logic lives in ',
  codeLabel: 'calculations.ts',
  introAfterCode: ' and is summarized below.',
  overviewTitle: 'Overview',
  overviewDescription: 'Two ingredients go into the number you see.',
  overviewItem1Label: 'Per-game performance',
  overviewItem1Rest: ' — kills, deaths, and damage, adjusted for win / loss / neutral.',
  overviewItem2Label: 'Normalization',
  overviewItem2Rest: ' — scaled to a fixed theoretical ceiling so values are comparable.',
  winLossTitle: 'Win, loss, and neutral',
  winLossDescription:
    'Kills and damage are multiplied by a modifier; deaths are not (dying costs the same in every outcome).',
  winBulletPrefix: 'Win: kills and damage count at ',
  winBulletMiddle: ' (+',
  winBulletSuffix: '%).',
  lossBulletPrefix: 'Loss: ',
  lossBulletMiddle: ' (−',
  lossBulletSuffix: '%).',
  neutralBulletPrefix: 'Neutral session (no winner): ',
  neutralBulletSuffix: ' — no bonus or penalty.',
  aggregationTitle: 'Aggregation & raw rating',
  aggregationFormulaComment: '(or effectiveKills if no deaths)',
  aggregationFootnote:
    'K/D is weighted twice as heavily as average damage per map (damage term is divided by 100).',
  normalizationTitle: 'Normalization (0–100)',
  normalizationDescriptionBefore:
    'Theoretical ceiling uses a 60% win rate, K/D 3.2:1, and 4,500 damage per map; that yields ',
  normalizationDescriptionAfter: '.',
  normalizationFootnote:
    'The final value is capped at 100. Strong players typically land in roughly the 30–70 range.',
};

const RU: RatingRulesStrings = {
  heroTitle: 'Как считается рейтинг',
  introBeforeStrong: 'Рейтинг каждого игрока — число от ',
  introStrong: '0–100',
  introAfterStrong: '. Логика в ',
  codeLabel: 'calculations.ts',
  introAfterCode: ', ниже кратко.',
  overviewTitle: 'Обзор',
  overviewDescription: 'В итоговое число входят две составляющие.',
  overviewItem1Label: 'Игра в матчах',
  overviewItem1Rest: ' — убийства, смерти и урон с учётом победы / поражения / ничьей.',
  overviewItem2Label: 'Нормализация',
  overviewItem2Rest: ' — масштабирование к фиксированному теоретическому потолку для сравнимости.',
  winLossTitle: 'Победа, поражение и ничья',
  winLossDescription:
    'Убийства и урон умножаются на модификатор; смерти — нет (смерть «стоит» одинаково при любом исходе).',
  winBulletPrefix: 'Победа: убийства и урон с коэффициентом ',
  winBulletMiddle: ' (+',
  winBulletSuffix: '%).',
  lossBulletPrefix: 'Поражение: ',
  lossBulletMiddle: ' (−',
  lossBulletSuffix: '%).',
  neutralBulletPrefix: 'Нейтральная сессия (без победителя): ',
  neutralBulletSuffix: ' — без бонуса и штрафа.',
  aggregationTitle: 'Накопление и сырой рейтинг',
  aggregationFormulaComment: '(effectiveKills, если нет смертей)',
  aggregationFootnote:
    'K/D в формуле вдвое важнее среднего урона за карту (урон делится на 100).',
  normalizationTitle: 'Нормализация (0–100)',
  normalizationDescriptionBefore:
    'Теоретический потолок: 60% побед, K/D 3.2:1, 4 500 урона за карту; отсюда ',
  normalizationDescriptionAfter: '.',
  normalizationFootnote:
    'Итог ограничен сверху 100. Сильные игроки обычно попадают примерно в диапазон 30–70.',
};

export function getRatingRulesText(locale: string): RatingRulesStrings {
  return isRussianLocale(locale) ? RU : EN;
}
