// test-live.js
import { RealTimeStream } from '../data/streams.js';

const stream = new RealTimeStream(['SPY']);
let dataReceived = false;

stream.connect();

// 1. Authentication Verification
stream.ws.on('open', () => {
  console.log('Connection opened - authentication should follow');
});

// 2. Subscription Verification 
stream.ws.on('message', data => {
  const packets = JSON.parse(data);
  
  packets.forEach(packet => {
    if (packet.status === 'auth_success') {
      console.log('Authenticated successfully');
      setTimeout(() => {
        console.log('Should send subscribe message now...');
      }, 1500);
    }
    
    if (packet.status === 'success' && packet.message === 'subscribed to') {
      console.log('Subscription confirmed:', packet.channels);
    }
    
    if (packet.ev === 'Q' || packet.ev === 'T') {
      console.log('Live Data Received:', {
        symbol: packet.sym,
        type: packet.ev,
        price: packet.bp || packet.p,
        time: new Date(packet.t)
      });
      dataReceived = true;
    }
  });
});

// 3. Timeout Handling
setTimeout(() => {
  if (!dataReceived) {
    console.error('No data received. Check:');
    console.log('1. Current time (ET):', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    console.log('2. Polygon account status');
    console.log('3. Network access to wss://socket.polygon.io/stocks');
    process.exit(1);
  }
}, 45000); // 45 seconds

// Keep process running
setInterval(() => {}, 1000);