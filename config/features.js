// src/config/features.js
export const FEATURE_NAMES = [
    'vwapRatio',        // Close price / VWAP
    'rsi3',             // 3-period RSI
    'macdHist',         // MACD Histogram (3,10,16)
    'volumeZ',          // Z-score of volume vs 20-period SMA
    'orderBookSpread',  // Bid-ask spread normalized by VWAP
    'depthImbalance',   // Order book depth imbalance
    'pressureRatio',    // Bid/ask pressure ratio
    'midPriceRatio',    // Close price vs mid-price
    'atr',              // Normalized Average True Range
    'volatility'        // (High-Low)/ATR volatility measure
  ];
  
  // Corresponding indices for direct access
  export const FEATURE_INDICES = {
    VWAP_RATIO: 0,
    RSI3: 1,
    MACD_HIST: 2,
    VOLUME_Z: 3,
    ORDERBOOK_SPREAD: 4,
    DEPTH_IMBALANCE: 5,
    PRESSURE_RATIO: 6,
    MIDPRICE_RATIO: 7,
    ATR: 8,
    VOLATILITY: 9
  };