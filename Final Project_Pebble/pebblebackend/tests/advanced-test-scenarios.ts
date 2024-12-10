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

  // Setup devices
  const [deviceA, deviceB] = await Promise.all([
    connectDevice(wsUrl, 'advanced-deviceA'),
    connectDevice(wsUrl, 'advanced-deviceB')
  ]);

  // Start heartbeats for both devices to ensure no idle timeouts
  const stopSignals = { stop: false };
  sendHeartbeatPeriodically(deviceA, 30000, stopSignals).catch(console.error);
  sendHeartbeatPeriodically(deviceB, 30000, stopSignals).catch(console.error);

  // Pair the devices
  await new Promise<void>(resolve => {
    console.log(`[${new Date().toISOString()}] Pairing device A with device B`);
    deviceA.client.sendPair(deviceB.deviceId);
    setTimeout(resolve, 2000);
  });

  // Confirm pairing by sending a test message and waiting for the response
  let messageReceivedCount = 0;
  deviceB.client.on('message', (msg) => {
    if (msg.type === 'click') {
      messageReceivedCount++;
      console.log(`[${new Date().toISOString()}] Device B received message: ${msg.messageId}`);
    }
  });

  // Send a series of messages in rapid succession
  const messageIntervals = [100, 150, 200]; // Slight delays between sends
  const sentMessageIds: string[] = [];

  for (const interval of messageIntervals) {
    await new Promise(resolve => setTimeout(resolve, interval));
    const messageId = deviceA.client.sendClick();
    sentMessageIds.push(messageId);
    console.log(`[${new Date().toISOString()}] Device A sent message: ${messageId}`);
  }

  // Wait a bit for all messages to arrive
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(`[${new Date().toISOString()}] Sent messages: ${sentMessageIds.length}, Received messages: ${messageReceivedCount}`);

  const statsA = deviceA.client.getMessageStats();
  const statsB = deviceB.client.getMessageStats();
  console.log('Device A stats:', statsA);
  console.log('Device B stats:', statsB);

  // Validate message ordering and count
  const allReceived = sentMessageIds.every(id => deviceB.client.getReceivedMessages().has(id));
  console.log(`[${new Date().toISOString()}] All messages received: ${allReceived ? 'Yes' : 'No'}`);

  // Additional assertions can go here: e.g., correct ordering
  const receivedArray = Array.from(deviceB.client.getReceivedMessages());
  const orderCorrect = receivedArray.every((id, idx) => id === sentMessageIds[idx]);
  console.log(`[${new Date().toISOString()}] Order correct: ${orderCorrect ? 'Yes' : 'No'}`);

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
