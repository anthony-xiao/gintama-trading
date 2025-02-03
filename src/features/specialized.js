// src/features/specialized.js
export function getSessionFeatures(bars) {
    const openingRange = bars.slice(0, 30); // First 30 minutes
    const ORH = Math.max(...openingRange.map(b => b.high));
    const ORL = Math.min(...openingRange.map(b => b.low));
    
    return bars.map(b => ({
      inOpeningRange: b.time >= ORL && b.time <= ORH,
      powerHour: b.time.getHours() === 15 // 3 PM ET
    }));
  }
  
  export function calculateLiquidityHunt(bars) {
    return bars.map((b, i) => {
      const previousLows = bars.slice(Math.max(0, i-5), i).map(b => b.low);
      return {
        liquidityTest: b.low < Math.min(...previousLows) && b.close > b.open
      };
    });
  }