// src/monitoring/metrics.js
export function calculateLatency(packet) {
    const received = Date.now();
    const processed = packet.timestamp;
    return received - processed;
  }