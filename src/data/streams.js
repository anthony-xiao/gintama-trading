// src/data/streams.js
import WebSocket from 'ws';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../config/.env') });

export class RealTimeStream {
constructor(tickers) {
this.tickers = tickers;
    // Changed to primary endpoint
    this.ws = new WebSocket('wss://socket.polygon.io/stocks');
    
    // Add connection metadata
    this.connectionId = Date.now();
    this.reconnectAttempts = 0;
    this.lastMessageTime = null;

    // Enhanced subscription tracking
    this.subscriptions = {
      symbols: new Set(tickers),
      channels: new Set(['Q.*', 'T.*']) // Wildcard channels
    };
  }

  connect() {
    console.log(`Connecting [ID: ${this.connectionId}]...`);
    
    this.ws.on('open', () => {
      console.log(`Authenticating [ID: ${this.connectionId}]...`);
      this.ws.send(JSON.stringify({
        action: "auth",
        params: process.env.POLYGON_API_KEY
      }));
      
      // Delay subscription after auth
      setTimeout(() => this.resubscribe(), 1500);
    });

    // Add heartbeat monitoring
    setInterval(() => {
      if (this.lastMessageTime && Date.now() - this.lastMessageTime > 30000) {
        console.warn('No messages in 30 seconds, reconnecting...');
        this.reconnect();
      }
    }, 5000);
  }

  resubscribe() {
    const channels = this.tickers.flatMap(t => [
      `Q.${t}`,  // Quotes
      `T.${t}`    // Trades
    ]);
    
    console.log('Final subscription params:', channels);
    
    this.ws.send(JSON.stringify({
      action: "subscribe",
      params: channels
    }));
  }

  // Update processMessage to track timing
  processMessage(packet) {
    this.lastMessageTime = Date.now();
    // ... original processing logic ...
  }

  reconnect() {
    this.reconnectAttempts++;
    console.log(`Reconnecting [Attempt: ${this.reconnectAttempts}]...`);
    this.ws.close();
    this.ws = new WebSocket('wss://socket.polygon.io/stocks');
    this.connect();
  }
}