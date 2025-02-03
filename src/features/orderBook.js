// src/features/orderBook.js
export function calculateOrderBookFeatures(quotes) {
  // Aggregate quotes into price levels
  const priceLevels = quotes.reduce((acc, q) => {
    acc.bids[q.bidPrice] = (acc.bids[q.bidPrice] || 0) + q.bidSize;
    acc.asks[q.askPrice] = (acc.asks[q.askPrice] || 0) + q.askSize;
    return acc;
  }, { bids: {}, asks: {} });

  // Sort and get best levels
  const sortedBids = Object.entries(priceLevels.bids)
    .sort((a, b) => b[0] - a[0]);
  const sortedAsks = Object.entries(priceLevels.asks)
    .sort((a, b) => a[0] - b[0]);

  const bestBid = sortedBids[0] || [0, 0];
  const bestAsk = sortedAsks[0] || [0, 0];

  return {
    spread: bestAsk[0] - bestBid[0],
    midPrice: (bestBid[0] + bestAsk[0]) / 2,
    depthImbalance: (sumSizes(sortedBids) - sumSizes(sortedAsks)) / 
                   (sumSizes(sortedBids) + sumSizes(sortedAsks)),
    pressure: bestBid[1] / (bestAsk[1] || 1)
  };
}

function sumSizes(levels) {
  return levels.reduce((sum, [_, size]) => sum + size, 0);
}