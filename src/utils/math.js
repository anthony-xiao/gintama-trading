// src/utils/math.js
export function stddev(values) {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b) / values.length;
  return Math.sqrt(
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 
    (values.length - 1)
  );
}
