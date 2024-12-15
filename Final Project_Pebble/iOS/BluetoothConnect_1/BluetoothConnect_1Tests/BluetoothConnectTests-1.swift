// Test suite demonstrating proper usage of PebbleAPI for WebSocket connectivity and message exchange

import XCTest
@testable import BluetoothConnect_1

/**
Test class showing how to properly implement WebSocket communication between paired devices using PebbleAPI.

Key components demonstrated:
- Device connection establishment
- Device pairing
- Message sending and receiving
- Proper connection state and error handling

Important Notes:
1. All WebSocket operations require proper connection state before proceeding
2. Devices must be paired before messages can be exchanged
3. Connection state changes and message receipt are handled through delegate callbacks
*/

class PebbleAPITests: XCTestCase, PebbleAPIDelegate {
    var api: PebbleAPI!
    var receivedMessages: [[String: Any]] = []
    var expectation: XCTestExpectation?
    
    // MARK: - Setup & Teardown

    override func setUp() {
        super.setUp()
        // Initialize with unique device ID to avoid conflicts

        api = PebbleAPI(deviceId: "test-device-\(UUID().uuidString)")
        api.delegate = self
    }
    
    override func tearDown() {
        api.disconnect()
        // Proper cleanup is important to avoid lingering connections

        api = nil
        receivedMessages = []
        super.tearDown()
    }
    
    /**
      Example test demonstrating complete message exchange flow between paired devices.
      
      Key Steps:
      1. Create and connect two devices
      2. Pair the devices
      3. Send and verify message receipt
      
      Common Pitfalls Addressed:
      - Waiting for proper connection before sending messages
      - Handling connection state changes correctly
      - Ensuring devices are paired before attempting message exchange
      - Managing asynchronous expectations appropriately
      */

    func testSingleClick() async throws {
        // Create two separate devices with unique IDs
        let deviceA = PebbleAPI(deviceId: "test-deviceA-\(UUID().uuidString)")
        let deviceB = PebbleAPI(deviceId: "test-deviceB-\(UUID().uuidString)")
        deviceA.delegate = self
        deviceB.delegate = self
        
        // Wait for both devices to connect
        // Note: expectedFulfillmentCount = 2 because we need both connections
        expectation = expectation(description: "Connections")
        expectation?.expectedFulfillmentCount = 2
        
        deviceA.connect()
        deviceB.connect()
        await waitForExpectations(timeout: 5)
        
        // Important: Send pair request and wait for backend processing
        // Note: Backend doesn't send pairing confirmation, so we wait instead        print("🤝 Sending pair request")
        deviceA.sendPairRequest(partnerId: deviceB.getDeviceId())
        try await Task.sleep(nanoseconds: 1_000_000_000)  // Wait 1s for pairing
        
        // Send message only after connection and pairing are established
        expectation = expectation(description: "Message received")
        print("🔘 Sending click")
        deviceA.sendClick()
        
        await waitForExpectations(timeout: 10)
        XCTAssertEqual(receivedMessages.count, 1, "Should receive 1 message")
    }
    
    // MARK: - PebbleAPIDelegate Implementation
    
    /**
     Handle message receipt from paired device.
     
     Important: This will only be called for properly paired devices.
     Message format will include:
     - timestamp: Time message was sent
     - timeSinceLastClick: Delta from previous message
     - messageId: Unique identifier
     - sequenceNumber: Used for ordering
     */

    func pebbleAPI(_ api: PebbleAPI, didReceiveClick message: [String: Any]) {
        print("📱 Received click message: \(message)")
        receivedMessages.append(message)
        expectation?.fulfill()
    }
    
    
    /**
      Handle WebSocket connection state changes.
      
      Common States:
      - true: Connection established
      - false: Disconnected or connection lost
      
      Note: Connection may drop unexpectedly - implement reconnection logic in production code
      */
    
    
    func pebbleAPI(_ api: PebbleAPI, didChangeConnectionState isConnected: Bool) {
        print("🔌 Connection state changed: \(isConnected)")
        if isConnected {
            expectation?.fulfill()
        }
    }
    
    /**
      Handle errors during WebSocket operations.
      
      Common Errors:
      - Socket not connected: Attempted operation without valid connection
      - Connection timeout: Failed to establish connection
      - Message send failure: Network or backend issues
      */
    
    func pebbleAPI(_ api: PebbleAPI, didEncounterError error: Error) {
        print("❌ Error encountered: \(error)")
    }
}
