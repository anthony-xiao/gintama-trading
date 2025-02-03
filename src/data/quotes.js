// src/data/quotes.js
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../config/.env') });

export async function fetchQuotes(ticker, start, end) {
  // Convert dates to nanoseconds
  const startNs = BigInt(start.getTime()) * 1_000_000n;
  const endNs = BigInt(end.getTime()) * 1_000_000n;

  let url = `https://api.polygon.io/v3/quotes/${ticker}?timestamp.gte=${startNs}&timestamp.lte=${endNs}&apiKey=${process.env.POLYGON_API_KEY}`;
  
  try {
    let allQuotes = [];
    do {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.results) break;

      allQuotes = allQuotes.concat(data.results.map(q => ({
        // Convert nanoseconds to milliseconds
        timestamp: Number(BigInt(q.participant_timestamp) / 1_000_000n),
        bidPrice: q.bid_price,
        askPrice: q.ask_price,
        bidSize: q.bid_size * 100,
        askSize: q.ask_size * 100
      })));

      url = data.next_url ? `${data.next_url}&apiKey=${process.env.POLYGON_API_KEY}` : null;

    } while (url);

    return allQuotes;

  } catch (error) {
    console.error('Quote fetch failed:', error);
    throw error;
  }
}