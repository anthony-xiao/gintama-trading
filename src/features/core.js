import { SMA, RSI, MACD } from 'technicalindicators';
import { calculateOrderBookFeatures } from './orderBook.js';
import { calculateATR, normalizeATR } from './volatility.js';
import { stddev } from '../utils/math.js';

export function generateFeatures(bars, quotes) {
  // Validate input
  if (!bars || bars.length < 30 || !quotes || quotes.length === 0) {
    throw new Error(`Insufficient data: ${bars?.length} bars, ${quotes?.length} quotes`);
  }

  // Extract price data
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const vwaps = bars.map(b => b.vwap);

  // In core.js
  const rsi3 = closes.length >= 3 ? 
  RSI.calculate({
    values: closes,
    period: 3,
    defaultValue: 50
  }) : new Array(closes.length).fill(50);

const macd = closes.length >= 26 ?
  MACD.calculate({
    values: closes,
    fastPeriod: 3,
    slowPeriod: 10,
    signalPeriod: 16
  }) : { histogram: new Array(closes.length).fill(0) };

  // Handle MACD initialization period
  const macdHistogram = macd.histogram?.length ? 
    macd.histogram.map(h => Number(h.toFixed(4))) : 
    new Array(closes.length).fill(0);

  // Volume calculations with safe indexing
  const volumeSMA20 = SMA.calculate({
    period: 20,
    values: volumes
  }) || new Array(volumes.length).fill(0);

  const volumeStd = stddev(volumes) || 1;
  
  const volumeZ = volumes.map((v, i) => 
    i >= 19 && volumeStd !== 0 ? 
    (v - volumeSMA20[i - 19]) / volumeStd : 
    (i > 0 ? volumeZ[i - 1] : 0)
  );

  // ATR features
  const atrValues = calculateATR(bars);
  const atrNormalized = normalizeATR(atrValues, vwaps);

  return bars.map((bar, i) => {
    const obFeatures = calculateOrderBookFeatures(
      quotes.filter(q => q.timestamp >= bar.time - 60000 && q.timestamp <= bar.time)
    );

    return {
      time: bar.time,
      vwapRatio: bar.close / (bar.vwap || 1),
      rsi3: rsi3[i] ?? 50,
      macdHist: macdHistogram[i] || 0,
      volumeZ: volumeZ[i] ?? 0,
      orderBookSpread: (obFeatures.spread / bar.vwap) || 0.01,
      depthImbalance: obFeatures.depthImbalance || 0,
      pressureRatio: obFeatures.pressure || 1,
      midPriceRatio: (bar.close / obFeatures.midPrice) || 1,
      atr: atrNormalized[i] ?? 0.01,
      volatility: Math.min(Math.max((bar.high - bar.low) / (atrValues[i] || 1), 0.1), 10)
    };
  });
}