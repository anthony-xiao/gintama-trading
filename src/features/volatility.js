// src/features/volatility.js
import { ATR } from 'technicalindicators';

export function calculateATR(bars, period = 5) {
  if (!bars || bars.length < period + 1) { // Need period+1 bars
    return new Array(bars.length).fill(null);
  }

  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const closes = bars.map(b => b.close);

  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });
  
  // Pad with nulls for initial periods
  return [...new Array(period).fill(null), ...atr];
}

// Update normalizeATR()
export function normalizeATR(atrValues, vwaps) {
  return atrValues.map((atr, i) => {
    if (!atr || !vwaps[i]) return 0.01;
    const normalized = (atr / vwaps[i]) * 100; // Convert to percentage
    return Number(normalized.toFixed(4));
  });
}