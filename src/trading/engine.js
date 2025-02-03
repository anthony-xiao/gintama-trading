// src/trading/engine.js
import { RealTimeStream } from '../data/streams.js';
import { DynamicLSTM } from '../models/DynamicLSTM.js';
import { generateFeatures } from '../features/core.js';

export class TradingEngine {
  constructor(apiKey, symbols = ['SPY', 'QQQ', 'IWM']) {
    this.model = new DynamicLSTM();
    this.stream = new RealTimeStream(apiKey, symbols);
    this.positions = new Map();
    this.orderBooks = new Map();
    this.tradeHistory = new Map();
  }

  async initialize() {
    await this.model.load();
    this.stream.connect();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.stream.ws.on('message', (message) => {
      message.forEach(event => {
        switch(event.ev) {
          case 'Q':
            this.handleQuoteUpdate(event);
            break;
          case 'T':
            this.handleTrade(event);
            break;
        }
      });
    });

    this.stream.ws.on('error', (error) => {
      console.error('Stream error:', error);
    });

    this.stream.ws.on('open', () => {
      console.log('Stream connected and subscribed');
    });
  }

  handleQuoteUpdate(quote) {
    const symbol = quote.sym;
    const orderBook = this.stream.getOrderBook(symbol);
    
    // Update local copy
    this.orderBooks.set(symbol, orderBook);
    
    // Generate features from latest state
    const features = this.generateFeatures(symbol, orderBook);
    
    // Make prediction
    this.makeTradingDecision(symbol, features);
  }

  handleTrade(trade) {
    const symbol = trade.sym;
    const tradeData = {
      price: trade.p,
      size: trade.s * 100,
      timestamp: new Date(trade.t),
      exchange: String.fromCharCode(64 + trade.x)
    };

    // Store last 10 trades
    if (!this.tradeHistory.has(symbol)) {
      this.tradeHistory.set(symbol, []);
    }
    const history = this.tradeHistory.get(symbol);
    history.push(tradeData);
    if (history.length > 10) history.shift();
  }

  generateFeatures(symbol, orderBook) {
    const trades = this.tradeHistory.get(symbol) || [];
    const latestBar = this.getLatestBar(symbol); // Implement your bar aggregation
    
    return generateFeatures({
      orderBook,
      trades,
      bar: latestBar,
      symbol
    });
  }

  async makeTradingDecision(symbol, features) {
    const prediction = await this.model.predict(features);
    
    if (prediction.confidence > 0.7) {
      const orderBook = this.orderBooks.get(symbol);
      const midPrice = (orderBook.bids[0].price + orderBook.asks[0].price) / 2;
      
      this.executeOrder({
        symbol,
        direction: prediction.direction,
        price: midPrice,
        atr: prediction.atr,
        volatility: this.calculateVolatility(orderBook)
      });
    }
  }

  calculatePositionSize(volatility, atr) {
    const risk = 0.01 * this.portfolioValue;
    return Math.floor(risk / (volatility * atr));
  }

  executeOrder(order) {
    const size = this.calculatePositionSize(order.volatility, order.atr);
    const { stopLoss, takeProfit } = this.calculateLevels(order.price, order.atr);
    
    this.alpaca.createOrder({
      symbol: order.symbol,
      qty: size,
      side: order.direction,
      type: 'limit',
      limit_price: order.price,
      stop_loss: { 
        stop_price: stopLoss,
        limit_price: stopLoss * 0.995 // Add limit offset
      },
      take_profit: {
        limit_price: takeProfit
      }
    });
  }

  calculateLevels(entryPrice, atr) {
    return {
      stopLoss: entryPrice - (1.5 * atr),
      takeProfit: entryPrice + (2.5 * atr)
    };
  }

  // ... rest of helper methods ...

  calculateVolatility(orderBook) {
    const spread = orderBook.asks[0].price - orderBook.bids[0].price;
    const midPrice = (orderBook.bids[0].price + orderBook.asks[0].price) / 2;
    return spread / midPrice; // Spread as percentage of mid price
  }

  getPortfolioValue() {
    // Implement your portfolio value calculation
    return this.positions.reduce((total, position) => 
      total + (position.marketValue || position.costBasis), 
      this.cashBalance
    );
  }

  // Position Management
  getPosition(symbol) {
    return this.positions.get(symbol) || {
      symbol,
      quantity: 0,
      costBasis: 0,
      marketValue: 0
    };
  }

  updatePosition(orderResponse) {
    const position = this.getPosition(orderResponse.symbol);
    const fillPrice = orderResponse.filled_avg_price;
    const fillSize = orderResponse.filled_qty;
    
    if (orderResponse.side === 'buy') {
      position.quantity += fillSize;
      position.costBasis += fillPrice * fillSize;
    } else {
      position.quantity -= fillSize;
      position.costBasis -= fillPrice * fillSize;
    }
    
    position.marketValue = position.quantity * fillPrice;
    this.positions.set(orderResponse.symbol, position);
  }

  // Order Monitoring
  async monitorOrders() {
    const openOrders = await this.alpaca.getOrders({
      status: 'open',
      limit: 100
    });

    openOrders.forEach(order => {
      if (this.shouldCancelOrder(order)) {
        this.alpaca.cancelOrder(order.id);
      }
    });
  }

  shouldCancelOrder(order) {
    const position = this.getPosition(order.symbol);
    const currentPrice = this.orderBooks.get(order.symbol).midPrice;
    
    // Cancel if too far from current price
    const priceDiff = Math.abs(order.limit_price - currentPrice);
    if (priceDiff > (2 * this.atrValues.get(order.symbol))) {
      return true;
    }

    // Cancel if position limit reached
    if (order.side === 'buy' && 
        position.quantity >= this.positionLimits.get(order.symbol)) {
      return true;
    }

    return false;
  }

  // Market State
  getMarketState() {
    const states = new Map();
    
    this.orderBooks.forEach((book, symbol) => {
      const spread = book.asks[0].price - book.bids[0].price;
      const midPrice = (book.asks[0].price + book.bids[0].price) / 2;
      
      states.set(symbol, {
        spread,
        midPrice,
        volume: this.getRecentVolume(symbol),
        volatility: this.calculateVolatility(book)
      });
    });

    return states;
  }

  getRecentVolume(symbol) {
    const trades = this.tradeHistory.get(symbol) || [];
    return trades.reduce((sum, t) => sum + t.size, 0);
  }

  // Error Handling
  handleOrderError(error, order) {
    console.error('Order error:', error);
    
    // Implement retry logic
    if (error.message.includes('insufficient buying power')) {
      this.adjustPositionSize(order.symbol);
    }
  }

  adjustPositionSize(symbol) {
    const currentSize = this.positionSizes.get(symbol) || 1;
    this.positionSizes.set(symbol, Math.max(1, currentSize * 0.8));
  }

  // Reporting
  generateTradeReport() {
    return Array.from(this.positions.entries()).map(([symbol, position]) => ({
      symbol,
      quantity: position.quantity,
      costBasis: position.costBasis,
      marketValue: position.marketValue,
      pnl: position.marketValue - position.costBasis
    }));
  }

  // Cleanup
  async shutdown() {
    // Cancel all open orders
    const orders = await this.alpaca.getOrders({ status: 'open' });
    await Promise.all(orders.map(o => this.alpaca.cancelOrder(o.id)));
    
    // Close WebSocket
    this.stream.disconnect();
  }
}