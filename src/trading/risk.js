// src/trading/risk.js
export function dynamicStopLoss(currentPrice, atr, multiplier = 1.5) {
  return currentPrice - (multiplier * atr);
}

export function adaptiveTakeProfit(currentPrice, atr, ratio = 2.5) {
  return currentPrice + (ratio * atr);
}
