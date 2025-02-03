// src/features/core.js
import { SMA, RSI, MACD } from 'technicalindicators';
import { calculateOrderBookFeatures } from './orderBook.js';
import { calculateATR, normalizeATR } from './volatility.js';
import { stddev } from '../utils/math.js'; // Add this import

export function generateFeatures(bars, quotes) {
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const vwaps = bars.map(b => b.vwap);

  // ATR Calculation
  const atr = calculateATR(bars);
  const atrNormalized = normalizeATR(atr, vwaps);
  
  // Technical Indicators
  const rsi3 = RSI.calculate({ values: closes, period: 3 });
  const macd = MACD.calculate({ 
    values: closes, 
    fastPeriod: 3, 
    slowPeriod: 10, 
    signalPeriod: 16 
  });
  const volumeSMA20 = SMA.calculate({ period: 20, values: volumes });

  return bars.map((bar, i) => { // Fixed parameter name
    const windowStart = bar.time - 60000; // 1-minute window
    const windowEnd = bar.time;
    
    const relevantQuotes = quotes.filter(q => 
      q.timestamp >= windowStart && q.timestamp <= windowEnd
    );

    const obFeatures = calculateOrderBookFeatures(relevantQuotes);

    return {
      time: bar.time, // Fixed from b.time to bar.time
      vwapRatio: bar.close / bar.vwap, // Fixed variable name
      rsi3: rsi3[i] || 0,
      macdHist: macd.histogram[i] || 0,
      volumeZ: (bar.volume - volumeSMA20[i]) / stddev(volumes),
      orderBookSpread: obFeatures.spread / bar.vwap,
      depthImbalance: obFeatures.depthImbalance,
      pressureRatio: obFeatures.pressure,
      midPriceRatio: bar.close / obFeatures.midPrice,
      atr: atrNormalized[i] || 0.01,
      volatility: (bar.high - bar.low) / (atr[i] || 0.01)
    };
  });
}