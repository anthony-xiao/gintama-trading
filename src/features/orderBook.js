// src/features/orderBook.js
export function calculateOrderBookFeatures(quotes) {
  if (!quotes || quotes.length === 0) {
    return {
      spread: 0.01,
      depthImbalance: 0,
      pressure: 1,
      midPrice: 1
    };
  }

  const bids = quotes.filter(q => q.bid_price);
  const asks = quotes.filter(q => q.ask_price);

  const bidSize = bids.reduce((sum, q) => sum + (q.bid_size || 0), 0);
  const askSize = asks.reduce((sum, q) => sum + (q.ask_size || 0), 0);

  return {
    spread: (asks[0]?.ask_price || 1) - (bids[0]?.bid_price || 1),
    depthImbalance: (bidSize - askSize) / (bidSize + askSize || 1),
    pressure: (bids[0]?.bid_size || 1) / (asks[0]?.ask_size || 1),
    midPrice: ((bids[0]?.bid_price || 1) + (asks[0]?.ask_price || 1)) / 2
  };
}

function sumSizes(levels) {
  return levels.reduce((sum, [_, size]) => sum + size, 0);
}