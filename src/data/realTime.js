// src/data/realTime.js
import WebSocket from 'ws';
import env from '../config/env.js';

export class DataStream {
  constructor() {
    this.ws = new WebSocket('wss://delayed.polygon.io/stocks');
    this.initialize();
  }

  initialize() {
    this.ws.on('open', () => {
      this.ws.send(JSON.stringify({
        action: "auth",
        params: env.POLYGON_API_KEY
      }));
    });
  }

  subscribe(tickers) {
    const params = tickers.flatMap(t => [`A.${t}`, `T.${t}`, `Q.${t}`]);
    this.ws.send(JSON.stringify({ action: "subscribe", params }));
  }

  start(callback) {
    this.ws.on('message', data => {
      const packets = JSON.parse(data.toString());
      packets.forEach(callback);
    });
  }
}