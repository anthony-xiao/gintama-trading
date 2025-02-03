import { SMA, RSI, MACD } from 'technicalindicators';
import { calculateOrderBookFeatures } from './orderBook.js';
import { calculateATR, normalizeATR } from './volatility.js';
import { stddev } from '../utils/math.js';

export function generateFeatures(bars, quotes) {
  // Validate input
  if (!bars || bars.length === 0 || !quotes || quotes.length === 0) {
    throw new Error('Invalid input data');
  }

  // Extract price data
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const vwaps = bars.map(b => b.vwap);

  // Calculate indicators
  const rsi3 = RSI.calculate({ 
    values: closes, 
    period: 3,
    defaultValue: 50
  });

  const macd = MACD.calculate({ 
    values: closes,
    fastPeriod: 3,
    slowPeriod: 10,
    signalPeriod: 16
  });
  
  const macdHistogram = macd.map(m => m.histogram || 0);

  // Volume features
  const volumeSMA20 = SMA.calculate({ 
    period: 20, 
    values: volumes,
    sliceOffset: -20
  });
  
  const volumeStd = stddev(volumes.slice(-20));
  const volumeZ = volumes.map((v, i) => 
    (i >= 20 && volumeStd !== 0) ? (v - volumeSMA20[i - 20]) / volumeStd : 0
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
      vwapRatio: bar.close / bar.vwap,
      rsi3: rsi3[i] || 50,
      macdHist: macdHistogram[i] || 0,
      volumeZ: volumeZ[i] || 0,
      orderBookSpread: obFeatures.spread / bar.vwap || 0.01,
      depthImbalance: obFeatures.depthImbalance || 0,
      pressureRatio: obFeatures.pressure || 1,
      midPriceRatio: bar.close / obFeatures.midPrice || 1,
      atr: atrNormalized[i] || 0.01,
      volatility: Math.min((bar.high - bar.low) / (atrValues[i] || 0.01), 10)
    };
  });
}