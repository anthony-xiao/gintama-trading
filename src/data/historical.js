// src/data/historical.js
import fetch from 'node-fetch';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../config/.env') });

export async function fetchBars(ticker, start, end) {
  let url; // Declare outside try block
  let from; 
  let to;

  try {
    // Validate input dates
    if (!(start instanceof Date) || !(end instanceof Date)) {
      throw new Error('Invalid date parameters - must be Date objects');
    }

    // Convert to valid Polygon date format
    const formatDate = (date) => date.toISOString().split('T')[0];
    const from = formatDate(start);
    const to = formatDate(end);
    
    url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${from}/${to}?adjusted=true&apiKey=${process.env.POLYGON_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error(`Invalid response format from Polygon API: ${JSON.stringify(data)}`);
    }

    return data.results.map(r => ({
      time: new Date(r.t),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      vwap: r.vw,
      trades: r.n
    }));

  } catch (error) {
    console.error('Historical data fetch failed:');
    console.error('- URL:', url || 'Not generated');
    console.error('- Dates:', 
      `Start: ${from || 'N/A'}, End: ${to || 'N/A'}`,
      `(Input: ${start?.toISOString() || 'Invalid'} to ${end?.toISOString() || 'Invalid'})`
    );
    console.error('- Error:', error.message);
    
    if (error.response?.status) {
      console.error('- API Status:', error.response.status);
    }
    
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
}