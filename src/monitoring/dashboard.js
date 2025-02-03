// src/monitoring/dashboard.js
import * as tfvis from '@tensorflow/tfjs-vis';
import { calculateWinRate, calculateSharpe, calculateMDD } from './metrics';
import { FEATURE_NAMES, FEATURE_INDICES } from '../config/features';

export function createDashboard(tradingData, model) {
  return tfvis.visor().surface({
    name: 'Trading Performance',
    tab: 'Metrics'
  }, () => {
    // Calculate core metrics
    const performanceMetrics = {
      winRate: calculateWinRate(tradingData),
      sharpe: calculateSharpe(tradingData),
      maxDrawdown: calculateMDD(tradingData),
      avgATR: tradingData.reduce((sum, t) => sum + t.atr, 0) / tradingData.length,
      stopLossHitRate: tradingData.filter(t => t.stopLossHit).length / tradingData.length,
      profitTargetAccuracy: (tradingData.filter(t => t.profitTargetHit).length / 
                           tradingData.filter(t => t.direction === 'LONG').length) * 100
    };

    // Display performance metrics
    tfvis.show.performanceMetrics({
      name: 'Trading Metrics',
      metrics: Object.entries(performanceMetrics).map(([name, value]) => ({
        name: name.replace(/([A-Z])/g, ' $1').toUpperCase(),
        value: typeof value === 'number' ? value.toFixed(2) : value
      }))
    });

    // Highlight ATR importance specifically
    tfvis.show.featureImportance({
      featureNames: FEATURE_NAMES,
      importances: model.featureWeights,
      annotations: {
        [FEATURE_INDICES.ATR]: 'Volatility Measure'
      }
    });

    // Add ATR-specific visualization
    tfvis.show.linechart({
      name: 'ATR Volatility Trend',
      tab: 'Volatility',
      data: {
        values: tradingData.map((t, i) => ({ x: i, y: t.atr })),
        series: ['ATR']
      },
      options: {
        xLabel: 'Trade Sequence',
        yLabel: 'Normalized ATR',
        height: 300
      }
    });
    function showOrderBook(symbol, orderBook) {
      tfvis.show.table({
        name: `${symbol} Order Book`,
        headers: ['Side', 'Price', 'Size', 'Exchange'],
        data: [
          ...orderBook.bids.map(b => ['BID', b.price, b.size, b.exchange]),
          ...orderBook.asks.map(a => ['ASK', a.price, a.size, a.exchange])
        ]
      });
    }
  
  });
}