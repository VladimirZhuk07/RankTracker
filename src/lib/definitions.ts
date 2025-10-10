export type UserStatsData = {
  totalMaps: number;
  totalKills: number;
  totalDeaths: number;
  totalDamage: number;
};

export type User = UserStatsData & {
  id: string;
  name: string;
  avatarUrl: string;
};
