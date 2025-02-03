// src/utils/math.js
export function stddev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b) / arr.length;
  return Math.sqrt(
    arr.map(x => Math.pow(x - mean, 2))
       .reduce((a, b) => a + b) / (arr.length - 1)
  ) || 0.0001; // Prevent division by zero
}