// src/features/volatility.js
import { ATR } from 'technicalindicators';

export function calculateATR(bars, period = 5) {
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const closes = bars.map(b => b.close);
  
  return ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period
  });
}

export function normalizeATR(atrValues, vwapValues) {
  return atrValues.map((atr, i) => 
    atr / vwapValues[i]  // Convert to percentage of VWAP
  );
}