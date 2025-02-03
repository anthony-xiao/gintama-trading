// src/data/streams.js
import WebSocket from 'ws';
import env from '../config/env.js';

export class RealTimeStream {
  constructor(tickers) {
    this.ws = new WebSocket('wss://socket.polygon.io/stocks');
    this.tickers = tickers;
    this.orderBook = {
      bids: new Map(),
      asks: new Map(),
      trades: new Map(),
      lastSequence: new Map()
    };
  }

  connect() {
    this.ws.on('open', () => {
      console.log('WebSocket connection established');
      this.authenticate();
    });

    this.ws.on('message', data => this.processMessage(data));
    this.ws.on('error', error => this.handleError(error));
    this.ws.on('close', () => this.handleClose());
  }

  authenticate() {
    this.ws.send(JSON.stringify({
      action: "auth",
      params: env.POLYGON_API_KEY
    }), err => {
      if (err) {
        console.error('Authentication failed:', err);
      } else {
        console.log('Authentication successful');
        this.subscribe();
      }
    });
  }

  subscribe() {
    const channels = this.tickers.flatMap(t => [
      `Q.${t.toUpperCase()}`,  // Explicit uppercase
      `T.${t.toUpperCase()}`
    ]);    
    this.ws.send(JSON.stringify({
      action: "subscribe",
      params: channels
    }), err => {
      if (err) {
        console.error('Subscription failed:', err);
      } else {
        console.log(`Subscribed to ${channels.join(', ')}`);
      }
    });
  }

  processMessage(data) {
    try {
      const message = data.toString();
      console.log('Raw Message:', message); // Debugging
      const packets = JSON.parse(message);
      packets.forEach(packet => {
        console.log('PROCESSING PACKET:', packet); // Add this line
        switch(packet.ev) {
          case 'Q':
            this.processQuote(packet);
            break;
          case 'T':
            this.processTrade(packet);
            break;
          case 'status':
            console.log('Status:', packet.message);
            break;
          default:
            console.warn('Unknown event type:', packet.ev);
        }
      });
    } catch (error) {
      console.error('Message processing error:', error);
    }
  }

  processQuote(quote) {
    const symbol = quote.sym.toUpperCase(); // Normalize to uppercase
    
    // Initialize book if needed
    if (!this.orderBook.bids.has(symbol)) {
      this.orderBook.bids.set(symbol, new Map());
      this.orderBook.asks.set(symbol, new Map());
    }

    // Update bids
    if (quote.bid_price && quote.bid_size > 0) {
      this.orderBook.bids.get(symbol).set(quote.bid_price, quote.bid_size * 100);
    }

    // Update asks
    if (quote.ask_price && quote.ask_size > 0) {
      this.orderBook.asks.get(symbol).set(quote.ask_price, quote.ask_size * 100);
    }

    // Cleanup zero-size levels
    this.cleanBookLevels(this.orderBook.bids.get(symbol));
    this.cleanBookLevels(this.orderBook.asks.get(symbol));

    // Log updates
    console.log(`Updated ${symbol} order book:`);
    console.log('Bids:', Array.from(this.orderBook.bids.get(symbol).entries()));
    console.log('Asks:', Array.from(this.orderBook.asks.get(symbol).entries()));
  }

  cleanBookLevels(levels) {
    if (!levels) return;
    for (const [price, size] of levels.entries()) {
      if (size <= 0) levels.delete(price);
    }
  }

  getOrderBook(symbol) {
    return {
      bids: this.getSortedLevels(this.orderBook.bids.get(symbol), 'desc'),
      asks: this.getSortedLevels(this.orderBook.asks.get(symbol), 'asc'),
      trades: this.orderBook.trades.get(symbol) || [],
      lastUpdate: Date.now()
    };
  }

  getSortedLevels(levels, direction = 'asc') {
    if (!levels) return [];
    return Array.from(levels.entries())
      .sort((a, b) => direction === 'asc' ? a[0] - b[0] : b[0] - a[0])
      .map(([price, size]) => ({ price, size }));
  }

  handleError(error) {
    console.error('WebSocket error:', error);
  }

  handleClose() {
    console.log('WebSocket connection closed');
  }
}