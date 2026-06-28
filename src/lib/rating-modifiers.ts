export const DEFAULT_WIN_PCT = 10;

export type WinLossModifiers = {
  win: number;
  loss: number;
};

export const DEFAULT_WIN_LOSS_MODIFIERS: WinLossModifiers = {
  win: 1.1,
  loss: 0.9,
};

export function winPctToModifiers(winPct: number): WinLossModifiers {
  return {
    win: 1 + winPct / 100,
    loss: 1 - winPct / 100,
  };
}

export function formatWinLossPct(winPct: number): { winLabel: string; lossLabel: string } {
  const formatted = winPct.toFixed(1);
  return {
    winLabel: `+${formatted}%`,
    lossLabel: `−${formatted}%`,
  };
}
