// src/utils/math.js
export function stddev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance) || 0.0001; // Prevent division by zero
  }
