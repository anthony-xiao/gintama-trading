// src/backtest/engine.js
export async function runBacktest(ticker, start, end) {
    const bars = await fetchBars(ticker, start, end);
    const features = generateFeatures(bars);
    const labels = generateLabels(bars);
    
    const lookback = 60;
    const sequences = [];
    
    for(let i = lookback; i < features.length; i++) {
      sequences.push({
        X: features.slice(i-lookback, i),
        y: labels[i]
      });
    }
    
    const model = new DynamicLSTM();
    await model.train(sequences.map(s => s.X), sequences.map(s => s.y));
    
    return {
      performance: calculateMetrics(sequences),
      featureImportance: model.featureWeights
    };
  }
  
  function generateLabels(bars) {
    return bars.map((b, i) => {
      if(i < 3) return 0;
      const futureReturn = (bars[i+3].close - b.close) / b.close;
      return futureReturn > 0.005 ? 2 : (futureReturn < -0.003 ? 0 : 1);
    });
  }