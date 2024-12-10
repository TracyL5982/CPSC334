// tests/advanced-test-scenarios.ts
import { WebSocketClient } from './websocket-client';

interface TestDevice {
  client: WebSocketClient;
  deviceId: string;
}

async function connectDevice(wsUrl: string, deviceId: string): Promise<TestDevice> {
  const device = new WebSocketClient(wsUrl, deviceId);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Connection timed out for ${deviceId}`)), 10000);

    device.once('connected', () => {
      clearTimeout(timeout);
      console.log(`[${new Date().toISOString()}] Device ${deviceId} connected successfully.`);
      resolve({ client: device, deviceId });
    });

    device.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function sendHeartbeatPeriodically(device: TestDevice, intervalMs: number, stopSignal: { stop: boolean }) {
  while (!stopSignal.stop) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    if (!stopSignal.stop) {
      console.log(`[${new Date().toISOString()}] Device ${device.deviceId} sending heartbeat`);
      device.client.sendHeartbeat();
    }
  }
}

async function runAdvancedTests(wsUrl: string): Promise<void> {
  console.log('Starting advanced WebSocket tests...');

  // Setup devices for baseline pairing and messaging
  const [deviceA, deviceB] = await Promise.all([
    connectDevice(wsUrl, 'advanced-deviceA'),
    connectDevice(wsUrl, 'advanced-deviceB')
  ]);

  // Start heartbeats for both devices
  const stopSignals = { stop: false };
  sendHeartbeatPeriodically(deviceA, 30000, stopSignals).catch(console.error);
  sendHeartbeatPeriodically(deviceB, 30000, stopSignals).catch(console.error);

  // Pair the devices
  await new Promise<void>(resolve => {
    console.log(`[${new Date().toISOString()}] Pairing device A with device B`);
    deviceA.client.sendPair(deviceB.deviceId);
    setTimeout(resolve, 2000);
  });

  // Set up message listener for device B
  const receivedMessages: { id: string; timestamp: number }[] = [];
  deviceB.client.on('message', (msg) => {
    if (msg.messageId) {
      // We record the message ID and the time it was received
      receivedMessages.push({ id: msg.messageId, timestamp: Date.now() });
      console.log(`[${new Date().toISOString()}] Device B received message: ${msg.messageId}`);
    }
  });

  console.log('\n=== Test: More Rapid Messages ===');
  // Test sending a large number of messages at very short intervals
  const rapidMessagesCount = 20;
  const rapidSentMessageIds: string[] = [];
  console.log(`[${new Date().toISOString()}] Sending ${rapidMessagesCount} rapid messages at ~10ms intervals`);
  
  for (let i = 0; i < rapidMessagesCount; i++) {
    await new Promise(resolve => setTimeout(resolve, 320));
    const messageId = deviceA.client.sendClick();
    rapidSentMessageIds.push(messageId);
  }

  // Wait a bit for all messages to arrive
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check how many of these rapid-fire messages arrived
  const rapidReceived = rapidSentMessageIds.filter(id => deviceB.client.getReceivedMessages().has(id));
  console.log(`[${new Date().toISOString()}] Rapid Messages: Sent ${rapidSentMessageIds.length}, Received ${rapidReceived.length}`);

  if (rapidReceived.length < rapidSentMessageIds.length) {
    console.warn('❌ Not all rapid messages were received.');
  } else {
    console.log('✅ All rapid messages received.');
  }

  // Check ordering for rapid messages
  const rapidOrderCorrect = rapidSentMessageIds.every((id, idx) => {
    const receivedIndex = receivedMessages.findIndex(m => m.id === id);
    return receivedIndex === idx;
  });
  console.log(`Rapid message order correct: ${rapidOrderCorrect ? '✅' : '❌'}`);

  if (!rapidOrderCorrect) {
    console.warn('The order of messages was not preserved under rapid conditions.');
  }


//   console.log('\n=== Test: Message Interval and Order Testing (Morse Code Simulation) ===');
//   // Simulate a Morse code pattern:
//   // Dot (.) = short interval, Dash (-) = longer interval
//   // For example: . . - . -
//   // Dot: send a message, wait 50ms
//   // Dash: send a message, wait 150ms
//   const morsePattern = ['.', '.', '-', '.', '-'];
//   const morseIntervals: number[] = morsePattern.map(symbol => symbol === '.' ? 50 : 150);
//   const morseSentMessageIds: string[] = [];

//   console.log(`[${new Date().toISOString()}] Sending Morse pattern: ${morsePattern.join(' ')}`);
//   for (const interval of morseIntervals) {
//     // Send message immediately
//     const messageId = deviceA.client.sendClick();
//     morseSentMessageIds.push(messageId);

//     // Wait the interval to simulate the spacing between signals
//     await new Promise(resolve => setTimeout(resolve, interval));
//   }

//   // Wait for all Morse messages to be processed
//   await new Promise(resolve => setTimeout(resolve, 2000));

//   // Verify all Morse messages were received
//   const morseReceived = morseSentMessageIds.filter(id => deviceB.client.getReceivedMessages().has(id));
//   console.log(`Morse pattern messages: Sent ${morseSentMessageIds.length}, Received ${morseReceived.length}`);
//   const allMorseReceived = morseReceived.length === morseSentMessageIds.length;
//   console.log(`All Morse messages received: ${allMorseReceived ? '✅' : '❌'}`);

//   // Check the order of Morse messages
//   // We'll check the timestamps recorded for each received message to ensure the order matches
//   const morseMessageReceipts = morseSentMessageIds.map(id => receivedMessages.find(m => m.id === id)).filter(Boolean) as { id: string; timestamp: number }[];
//   const morseOrderCorrect = morseMessageReceipts.every((m, idx) => m.id === morseSentMessageIds[idx]);

//   console.log(`Morse message order correct: ${morseOrderCorrect ? '✅' : '❌'}`);

//   // Optional: Check intervals between messages to approximate correctness
//   // Although exact timing can vary due to network conditions, we can at least check that the order and presence are correct.
//   if (morseOrderCorrect && allMorseReceived) {
//     console.log('✅ Morse code simulation passed.');
//   } else {
//     console.warn('❌ Morse code simulation failed either in order or completeness.');
//   }
console.log('\n=== Test: Message Interval and Order Testing (Morse Code Simulation) ===');
const morsePattern = ['.', '.', '-', '.', '-'];
const morseIntervals: number[] = morsePattern.map(symbol => symbol === '.' ? 50 : 150);
const morseSentMessages: { id: string; sentTime: number }[] = [];
const morseReceivedMessages: { id: string; receivedTime: number }[] = [];

// Clear any previous message handlers
deviceB.client.removeAllListeners('message');

// Set up message listener for device B
deviceB.client.on('message', (msg) => {
  if (msg.messageId) {
    morseReceivedMessages.push({ 
      id: msg.messageId, 
      receivedTime: Date.now()
    });
    console.log(`[${new Date().toISOString()}] Received message: ${msg.messageId}`);
  }
});

console.log(`[${new Date().toISOString()}] Sending Morse pattern: ${morsePattern.join(' ')}`);
for (const interval of morseIntervals) {
  const sentTime = Date.now();
  const messageId = deviceA.client.sendClick();
  morseSentMessages.push({ id: messageId, sentTime });
  console.log(`Sent message ${messageId} at ${sentTime}`);
  await new Promise(resolve => setTimeout(resolve, interval));
}

// Wait for all Morse messages to be processed
await new Promise(resolve => setTimeout(resolve, 2000));

// Sort received messages to match sent order for proper analysis
const sortedReceivedMessages = morseSentMessages.map(sent => {
  const matching = morseReceivedMessages.find(received => received.id === sent.id);
  return matching || null;
}).filter((msg): msg is {id: string; receivedTime: number} => msg !== null);

// Check order preservation
const orderPreserved = morseReceivedMessages.every((received, idx) => 
  received.id === morseSentMessages[idx].id
);

// Calculate latencies for each message
const latencies = morseSentMessages.map((sent, idx) => {
  const received = sortedReceivedMessages[idx];
  return received ? received.receivedTime - sent.sentTime : null;
});

// Calculate intervals between messages in their sent order
const receivedIntervals = [];
for (let i = 1; i < sortedReceivedMessages.length; i++) {
  const interval = sortedReceivedMessages[i].receivedTime - sortedReceivedMessages[i-1].receivedTime;
  receivedIntervals.push(interval);
}

console.log('\nDetailed Results:');
console.log('Messages in Sent Order:');
morseSentMessages.forEach((sent, idx) => {
  const received = sortedReceivedMessages[idx];
  console.log(`Message ${idx + 1}:
    ID: ${sent.id}
    Sent: ${sent.sentTime}
    Received: ${received?.receivedTime || 'Not received'}
    Latency: ${latencies[idx] || 'N/A'}ms`);
});

console.log('\nOrder Analysis:');
console.log('Received Order:', morseReceivedMessages.map(m => m.id));
console.log('Expected Order:', morseSentMessages.map(m => m.id));
console.log('Order Preserved:', orderPreserved ? '✅' : '❌');

console.log('\nTiming Analysis:');
console.log('Sent Intervals:', morseIntervals);
console.log('Received Intervals:', receivedIntervals);
console.log('Average Latency:', latencies.filter(l => l !== null).reduce((a, b) => a + b!, 0) / latencies.filter(l => l !== null).length);

const INTERVAL_TOLERANCE_MS = 50;
const intervalsReasonable = receivedIntervals.every((interval, idx) => {
  const expectedInterval = morseIntervals[idx];
  const difference = Math.abs(interval - expectedInterval);
  return difference <= INTERVAL_TOLERANCE_MS;
});

console.log('\nInterval Preservation:', intervalsReasonable ? '✅' : '❌');

  // Cleanup
  console.log(`[${new Date().toISOString()}] Cleaning up...`);
  stopSignals.stop = true;
  deviceA.client.close();
  deviceB.client.close();
  console.log('Test run complete.');
}

// Usage
const wsUrl = process.argv[2];
if (!wsUrl) {
  console.error('Please provide the WebSocket URL as an argument');
  process.exit(1);
}

runAdvancedTests(wsUrl).catch(console.error);



// // tests/test-scenarios.ts
// import { WebSocketClient } from './websocket-client';

// async function runTests(wsUrl: string): Promise<void> {
//   console.log('Starting WebSocket tests...');

//   // Test 1: Basic Connection
//   console.log('\nTest 1: Basic Connection');
//   const device1 = new WebSocketClient(wsUrl, 'device1');
//   await new Promise<void>(resolve => device1.once('connected', resolve));
//   console.log('✅ Device 1 connected successfully');

//   // Test 2: Connection with Invalid Device ID
//   console.log('\nTest 2: Invalid Device ID');
//   const invalidDevice = new WebSocketClient(wsUrl, '');
//   await new Promise<void>(resolve => invalidDevice.once('error', resolve));
//   console.log('✅ Invalid device handled correctly');

//   // Test 3: Rapid Clicks
//   console.log('\nTest 3: Rapid Clicks');
//   let clickCount = 0;
//   const device2 = new WebSocketClient(wsUrl, 'device2');
//   await new Promise<void>(resolve => device2.once('connected', resolve));
  
//   const clicks = [0, 100, 50, 200, 75]; // Timing patterns in ms
//   for (const delay of clicks) {
//     await new Promise(resolve => setTimeout(resolve, delay));
//     device2.sendClick();
//     clickCount++;
//   }
//   console.log(`✅ Sent ${clickCount} rapid clicks`);


// // Test 4: Paired Devices Communication
// console.log('\nTest 4: Paired Devices Communication');
// const device3 = new WebSocketClient(wsUrl, 'device3');
// const device4 = new WebSocketClient(wsUrl, 'device4');

// await Promise.all([
//   new Promise<void>(resolve => device3.once('connected', resolve)),
//   new Promise<void>(resolve => device4.once('connected', resolve))
// ]);

// // Add pairing step
// await new Promise<void>(resolve => {
//   device3.sendPair(device4.getDeviceId());
//   setTimeout(resolve, 1000);
// });

// console.log('✅ Both devices connected and paired');

// const sentMessageIds: string[] = [];
// const receivedMessages = new Set<string>();

// device4.on('message', (message) => {
//   if (message.messageId) {
//     receivedMessages.add(message.messageId);
//   }
//   console.log('Device 4 received message:', message);
// });

// // Send rapid clicks with varying intervals
// const intervals = [0, 50, 100, 50, 200, 75, 100, 50];
// console.log(`Sending ${intervals.length} messages with varying intervals...`);

// for (const interval of intervals) {
//   await new Promise(resolve => setTimeout(resolve, interval));
//   const messageId = device3.sendClick();
//   sentMessageIds.push(messageId);
// }

// // Wait for message processing
// console.log('Waiting for message processing...');
// await new Promise(resolve => setTimeout(resolve, 2000));

// // Verify message delivery
// const stats = device4.getMessageStats();
// console.log('Message delivery stats:', stats);

// const allMessagesReceived = sentMessageIds.every(id => receivedMessages.has(id));
// console.log(`Message delivery verification: ${allMessagesReceived ? '✅ All messages received' : '❌ Some messages missing'}`);

// if (!allMessagesReceived) {
//   console.log('Missing messages:', sentMessageIds.filter(id => !receivedMessages.has(id)));
// }

// // Verify message ordering
// const receivedArray = Array.from(receivedMessages);
// const orderCorrect = receivedArray.every((id, index) => id === sentMessageIds[index]);
// console.log(`Message order verification: ${orderCorrect ? '✅ Correct order' : '❌ Order mismatch'}`);

// if (!orderCorrect) {
//   console.log('Expected order:', sentMessageIds);
//   console.log('Received order:', receivedArray);
// }

// // Test cleanup
// [device3, device4].forEach(d => d.close());

// // Test 5: Connection Persistence
// console.log('\nTest 5: Connection Persistence');
// console.log('Creating initial device5 connection...');

// const device5 = new WebSocketClient(wsUrl, 'device5');
// await new Promise<void>((resolve, reject) => {
//   const timeout = setTimeout(() => {
//     reject(new Error('Initial connection timeout'));
//   }, 10000);

//   device5.once('connected', () => {
//     clearTimeout(timeout);
//     console.log('Initial device5 connection established');
//     resolve();
//   });

//   device5.once('error', (error) => {
//     clearTimeout(timeout);
//     reject(error);
//   });
// });

// console.log('Waiting before closing connection...');
// await new Promise(resolve => setTimeout(resolve, 1000));

// console.log('Closing device5 connection...');
// await new Promise<void>((resolve) => {
//   device5.once('disconnected', (details) => {
//     console.log('Device5 disconnected with details:', details);
//     resolve();
//   });
//   device5.close();
// });

// console.log('Waiting for cleanup...');
// await new Promise(resolve => setTimeout(resolve, 3000));

// console.log('Attempting to reconnect device5...');
// const reconnectedDevice = new WebSocketClient(wsUrl, 'device5');
// await new Promise<void>((resolve, reject) => {
//   const timeout = setTimeout(() => {
//     reject(new Error('Reconnection timeout'));
//   }, 10000);

//   reconnectedDevice.once('connected', () => {
//     clearTimeout(timeout);
//     console.log('Device5 reconnection successful');
//     resolve();
//   });

//   reconnectedDevice.once('error', (error) => {
//     clearTimeout(timeout);
//     reject(error);
//   });
// });

// console.log('✅ Reconnection test completed');

// // Cleanup
// console.log('Cleaning up connections...');
// [device5, reconnectedDevice].forEach(d => {
//   try {
//     d.close();
//   } catch (error) {
//     console.error('Error during cleanup:', error);
//   }
// });

//   // Test 6: Heartbeat Mechanism
//   console.log('\nTest 6: Heartbeat Mechanism');
//   const heartbeatDevice = new WebSocketClient(wsUrl, 'heartbeat-device');
//   await new Promise<void>(resolve => heartbeatDevice.once('connected', resolve));
  
//   // Wait for a few heartbeat cycles
//   await new Promise(resolve => setTimeout(resolve, 65000));
//   console.log('✅ Heartbeat mechanism working');

//   // Test 7: Connection State Monitoring
//   console.log('\nTest 7: Connection State Monitoring');
//   const monitorDevice1 = new WebSocketClient(wsUrl, 'monitor-device1');
//   const monitorDevice2 = new WebSocketClient(wsUrl, 'monitor-device2');
  
//   await Promise.all([
//     new Promise<void>(resolve => monitorDevice1.once('connected', resolve)),
//     new Promise<void>(resolve => monitorDevice2.once('connected', resolve))
//   ]);

//   let partnerStateChanged = false;
//   monitorDevice1.on('partnerStateChange', (isConnected) => {
//     partnerStateChanged = true;
//     console.log('Partner connection state changed:', isConnected);
//   });

//   await new Promise<void>(resolve => {
//     monitorDevice1.sendPair(monitorDevice2.getDeviceId());
//     setTimeout(resolve, 1000);
//   });

//   // Wait for heartbeat to trigger partner state notification
//   await new Promise(resolve => setTimeout(resolve, 31000));
//   console.log('✅ Connection state monitoring working:', partnerStateChanged);

//   // Test 8: Graceful Reconnection
//   console.log('\nTest 8: Graceful Reconnection');
//   const reconnectDevice = new WebSocketClient(wsUrl, 'reconnect-device');
//   await new Promise<void>(resolve => reconnectDevice.once('connected', resolve));

//   let reconnected = false;
//   reconnectDevice.on('connected', () => {
//     reconnected = true;
//   });

//   // Force disconnect and wait for reconnection
//   reconnectDevice.close();
//   await new Promise(resolve => setTimeout(resolve, 6000));
//   console.log('✅ Reconnection handling:', reconnected);

//   // Test 9: Message Delivery During Partner Disconnect
//   console.log('\nTest 9: Message Delivery During Partner Disconnect');
//   const senderDevice = new WebSocketClient(wsUrl, 'sender-device');
//   const receiverDevice = new WebSocketClient(wsUrl, 'receiver-device');
  
//   await Promise.all([
//     new Promise<void>(resolve => senderDevice.once('connected', resolve)),
//     new Promise<void>(resolve => receiverDevice.once('connected', resolve))
//   ]);

//   await new Promise<void>(resolve => {
//     senderDevice.sendPair(receiverDevice.getDeviceId());
//     setTimeout(resolve, 1000);
//   });

//   let messageReceived = false;
//   receiverDevice.on('message', () => {
//     messageReceived = true;
//   });

//   // Close receiver and try to send message
//   receiverDevice.close();
//   await new Promise(resolve => setTimeout(resolve, 1000));
  
//   senderDevice.sendClick();
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   console.log('✅ Message handling during disconnect working:', !messageReceived);

//   // Cleanup
//   [device1, device2, device3, device4, device5, reconnectedDevice].forEach(d => d.close());
//   [
//     heartbeatDevice,
//     monitorDevice1,
//     monitorDevice2,
//     senderDevice,
//     receiverDevice
//   ].forEach(d => d.close());
  
//   console.log('\nAll tests completed!');
// }

// // Usage
// const wsUrl = process.argv[2];
// if (!wsUrl) {
//   console.error('Please provide WebSocket URL as argument');
//   process.exit(1);
// }

// runTests(wsUrl).catch(console.error);