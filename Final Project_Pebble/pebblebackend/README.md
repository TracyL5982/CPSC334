# Pebble WebSocket API Documentation

## Overview
The Pebble WebSocket API enables real-time communication between paired devices, preserving the timing of click patterns between them. This API is designed for low-latency transmission of click events while maintaining the relative timing between consecutive clicks.

## Connection Details
- WebSocket Endpoint: `wss://<api-id>.execute-api.<region>.amazonaws.com/dev`
- Connection Query Parameter: `deviceId` (required)

Example connection URL:
```
wss://i4uw8vt2nb.execute-api.us-east-1.amazonaws.com/dev?deviceId=device123
```

## Available Actions

### 1. Connect
Establishes a WebSocket connection for a device.

**Request:**
- Connect to WebSocket URL with deviceId parameter

**Response:**
- 200: Connection successful
- 400: Invalid deviceId
- 500: Connection error

### 2. Pair Devices
Pairs two devices for bidirectional communication.

**Request Format:**
```json
{
  "action": "pair",
  "deviceId": "device123",
  "partnerId": "device456"
}
```

**Response:**
- Success:
```json
{
  "statusCode": 200,
  "body": "Devices paired successfully"
}
```
- Error:
```json
{
  "statusCode": 400,
  "body": "One or both devices not found"
}
```

### 3. Send Click
Sends a click event to the paired device.

**Request Format:**
```json
{
  "action": "message",
  "deviceId": "device123",
  "message": {
    "timestamp": 1638297600000,
    "timeSinceLastClick": 500
  }
}
```

**Response to Paired Device:**
```json
{
  "type": "click",
  "timestamp": 1638297600000,
  "timeSinceLastClick": 500
}
```

## Timing Preservation System

### How It Works
1. The system preserves relative timing between clicks rather than absolute timing
2. Each click message includes:
   - Absolute timestamp of the click
   - Time elapsed since the last click (timeSinceLastClick)
3. The receiving device uses these values to maintain the original click pattern

### Implementation Guidelines

1. Sending Device:
```javascript
let lastClickTime = 0;

function sendClick() {
  const now = Date.now();
  const timeSinceLastClick = lastClickTime ? now - lastClickTime : 0;
  
  ws.send(JSON.stringify({
    action: "message",
    deviceId: "device123",
    message: {
      timestamp: now,
      timeSinceLastClick
    }
  }));
  
  lastClickTime = now;
}
```

2. Receiving Device:
```javascript
let lastPlayTime = 0;

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'click') {
    const { timeSinceLastClick } = data;
    
    if (timeSinceLastClick > 0) {
      // Schedule click with preserved timing
      const now = Date.now();
      const timeElapsed = now - lastPlayTime;
      const delay = Math.max(0, timeSinceLastClick - timeElapsed);
      
      setTimeout(() => {
        triggerVibration();
        lastPlayTime = Date.now();
      }, delay);
    } else {
      // Immediate click
      triggerVibration();
      lastPlayTime = Date.now();
    }
  }
};
```


## API Documentation

### Connection
```javascript
const ws = new WebSocket('wss://<api-id>.execute-api.<region>.amazonaws.com/dev?deviceId=device123');
```

### Actions

#### 1. Device Pairing
```javascript
// Request
{
  "action": "pair",
  "deviceId": "device123",
  "partnerId": "device456"
}

// Success Response
{
  "statusCode": 200,
  "body": "Devices paired successfully"
}
```

#### 2. Click Transmission
```javascript
// Send Click
{
  "action": "message",
  "deviceId": "device123",
  "message": {
    "timestamp": 1638297600000,
    "timeSinceLastClick": 500
  }
}

// Receive Click
{
  "type": "click",
  "timestamp": 1638297600000,
  "timeSinceLastClick": 500
}
```

## Example Usage

```javascript
const ws = new WebSocket(`${wsUrl}?deviceId=${deviceId}`);

// Handle connection
ws.onopen = () => {
  console.log('Connected to server');
};

// Handle messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'click') {
    handleClick(data.timeSinceLastClick);
  }
};

// Send click
function sendClick() {
  const now = Date.now();
  const timeSinceLastClick = lastClickTime ? now - lastClickTime : 0;
  
  ws.send(JSON.stringify({
    action: "message",
    deviceId: deviceId,
    message: {
      timestamp: now,
      timeSinceLastClick
    }
  }));
  
  lastClickTime = now;
}
```

## System Tests

The following test output demonstrates the expected behavior of the system:

```
Starting WebSocket tests...

Test 1: Basic Connection
Device device1 connected
✅ Device 1 connected successfully

Test 2: Invalid Device ID
Device  error: Error: Unexpected server response: 400
✅ Invalid device handled correctly

Test 3: Rapid Clicks
Device device2 connected
Device device2 sent click
Device device2 sent click
Device device2 sent click
Device device2 sent click
Device device2 sent click
✅ Sent 5 rapid clicks

Test 4: Paired Devices Communication
Device device3 connected
Device device4 connected
Device device3 requested pairing with device4
✅ Both devices connected and paired
Device device3 sent click
Device device4 received: { 
  type: 'click', 
  timestamp: 1733722720873, 
  timeSinceLastClick: 0 
}
// ... additional click patterns ...
✅ Received 3 messages

Test 5: Connection Persistence
Device device5 connected
Device device5 disconnected
Device device5 connected
✅ Reconnection successful

Tests completed!
```

### Test Cases Explained

1. **Basic Connection**: Verifies basic WebSocket connectivity
2. **Invalid Device ID**: Confirms proper error handling
3. **Rapid Clicks**: Tests system's ability to handle quick successive clicks
4. **Paired Devices**: Demonstrates bidirectional communication and timing preservation
5. **Connection Persistence**: Validates reconnection capabilities


## Error Handling

### Connection Errors
- Handle WebSocket connection errors with exponential backoff
- Implement automatic reconnection
- Maintain device state during reconnection

Example:
```javascript
function connect(retryCount = 0) {
  const maxRetries = 5;
  const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
  
  try {
    const ws = new WebSocket(`${wsUrl}?deviceId=${deviceId}`);
    
    ws.onerror = (error) => {
      if (retryCount < maxRetries) {
        setTimeout(() => connect(retryCount + 1), backoffMs);
      }
    };
    
    return ws;
  } catch (error) {
    if (retryCount < maxRetries) {
      setTimeout(() => connect(retryCount + 1), backoffMs);
    }
  }
}
```



## TODO
✅ 1. Implement heartbeat mechanism
✅ 2. Handle reconnections gracefully
✅ 3. Verify device pairing before sending
4. Monitor connection state
✅ 5. Log errors with timestamps
MAJOR REWORK PROTOCAL FOR OPTIMIZED REALTIME STREAMING