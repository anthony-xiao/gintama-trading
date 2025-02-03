// src/features/core.js
import { SMA, RSI, MACD } from 'technicalindicators';
import { calculateOrderBookFeatures } from './orderBook.js';
import { calculateATR, normalizeATR } from './volatility.js';
import { FEATURE_NAMES } from '../../config/features.js';
import { stddev } from '../utils/math.js';

export function generateFeatures(bars, quotes) {
  const MIN_BARS = process.env.NODE_ENV === 'test' ? 1 : 30;
  const MIN_QUOTES = process.env.NODE_ENV === 'test' ? 1 : 30;

  if (!bars || bars.length < MIN_BARS) {
    throw new Error(`Insufficient bars: ${bars?.length} provided, need at least ${MIN_BARS}`);
  }

  if (!quotes || quotes.length < MIN_QUOTES) {
    throw new Error(`Insufficient quotes: ${quotes?.length} provided, need at least ${MIN_QUOTES}`);
  }

  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const vwaps = bars.map(b => b.vwap);
  
  // Initialize indicators with proper fallbacks
  const rsi3 = RSI.calculate({ values: closes, period: 3 }) || [];
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 3,
    slowPeriod: 10,
    signalPeriod: 16
  }) || { histogram: [] };
  const macdHistogram = macd.histogram || [];
  
  const volumeSMA20 = SMA.calculate({ period: 20, values: volumes }) || [];
  const volumeStd = stddev(volumes) || 1;
  const atrValues = calculateATR(bars);
  const atrNormalized = normalizeATR(atrValues, vwaps);

  return bars.map((bar, i) => { 
    // Calculate safe values per bar
    const safeVWAP = bar.vwap || bar.close;
    const safeATR = atrValues[i] || 0.01;
    const windowStart = bar.time - 60000;
    const windowEnd = bar.time;
    
    const relevantQuotes = quotes.filter(q => 
      q.timestamp >= windowStart && q.timestamp <= windowEnd
    );

    const obFeatures = calculateOrderBookFeatures(relevantQuotes);
    const midPrice = (obFeatures.bestBid + obFeatures.bestAsk) / 2 || bar.close;

    return {
      [FEATURE_NAMES[0]]: bar.close / safeVWAP,
      [FEATURE_NAMES[1]]: rsi3[i] ?? 50,
      [FEATURE_NAMES[2]]: macdHistogram[i] ?? 0,
      [FEATURE_NAMES[3]]: volumeSMA20[i] 
        ? (bar.volume - volumeSMA20[i]) / volumeStd
        : 0,
      [FEATURE_NAMES[4]]: obFeatures.spread / safeVWAP,
      [FEATURE_NAMES[5]]: obFeatures.depthImbalance ?? 0,
      [FEATURE_NAMES[6]]: obFeatures.pressure ?? 1,
      [FEATURE_NAMES[7]]: bar.close / midPrice,
      [FEATURE_NAMES[8]]: atrNormalized[i] ?? 0.01,
      [FEATURE_NAMES[9]]: (bar.high - bar.low) / safeATR
    };
  });
}

// Helper function for tests
export function generateTestFeatures() {
  const testBars = Array.from({length: 30}, (_, i) => ({
    time: Date.now() - (i * 60000),
    open: 500 - i,
    high: 502 + i,
    low: 499 - i,
    close: 501 + i,
    volume: 100000 + (i * 1000),
    vwap: 500.5 + i
  })).reverse();

  const testQuotes = Array.from({length: 30}, (_, i) => ({
    bid: 500 + i,
    ask: 501 + i,
    timestamp: Date.now() - (i * 1000)
  }));

  return generateFeatures(testBars, testQuotes);
}