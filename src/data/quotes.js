// src/data/quotes.js
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../config/.env') });


export async function fetchQuotes(ticker, start, end) {
  try {
    let allQuotes = [];
    let url = `https://api.polygon.io/v3/quotes/${ticker}?timestamp.gte=${start.toISOString()}&timestamp.lte=${end.toISOString()}&limit=50000&apiKey=${process.env.POLYGON_API_KEY}`;
    
    console.log('Fetching URL:', url); // Debug log
    
    do {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      allQuotes = [...allQuotes, ...(data.results || [])];
      url = data.next_url ? `${data.next_url}&apiKey=${process.env.POLYGON_API_KEY}` : null;
      
      console.log(`Fetched ${data.results?.length || 0} quotes`); // Progress log
      
    } while (url && allQuotes.length < 100000); // Safety limit
    
    console.log('Total quotes fetched:', allQuotes.length);
    return allQuotes.map(q => {
      // Convert nanoseconds to milliseconds
      const timestamp = new Date(Math.floor(q.participant_timestamp / 1000000));
      
      // Fallback to SIP timestamp if participant timestamp is invalid
      const validTimestamp = isNaN(timestamp) 
        ? new Date(Math.floor(q.sip_timestamp / 1000000))
        : timestamp;
  
      return {
        timestamp: validTimestamp,
        bidPrice: q.bid_price,
        bidSize: q.bid_size * 100,
        askPrice: q.ask_price,
        askSize: q.ask_size * 100,
        sequence: q.sequence_number,
        tape: q.tape,
        conditions: q.conditions
      };
    });
    
  } catch (error) {
    console.error('Failed to fetch quotes:', error.message);
    console.error('Make sure:');
    console.error('1. Your Polygon API key is valid');
    console.error('2. The dates are in YYYY-MM-DD format');
    console.error('3. You have quotes access in your Polygon plan');
    return [];
  }
}