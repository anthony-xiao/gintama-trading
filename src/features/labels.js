// src/features/labels.js
export function calculateLabels(bars) {
  return bars.map((bar, i) => {
    if (i < 3) return 0;
    if (i >= bars.length - 3) return 1;
    
    const futureReturn = (bars[i + 3].close - bar.close) / bar.close;
    if (futureReturn > 0.005) return 2;
    if (futureReturn < -0.003) return 0;
    return 1;
  });
}