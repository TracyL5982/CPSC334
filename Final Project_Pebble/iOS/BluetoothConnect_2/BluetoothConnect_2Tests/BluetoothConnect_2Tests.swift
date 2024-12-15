import XCTest
@testable import BluetoothConnect_2

class PebbleAPITests: XCTestCase, PebbleAPIDelegate {
    var api: PebbleAPI!
    var receivedMessages: [[String: Any]] = []
    var connectionStateChanges: [Bool] = []
    var errors: [Error] = []
    var currentExpectation: XCTestExpectation?  // Add this line

    
    override func setUp() {
        super.setUp()
        api = PebbleAPI(deviceId: "test-device-\(UUID().uuidString)")
        api.delegate = self
    }
    
    override func tearDown() {
        api.disconnect()
        api = nil
        receivedMessages = []
        connectionStateChanges = []
        errors = []
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    func testConnection() async {
        currentExpectation = XCTestExpectation(description: "Connection state change")
        api.connect()
        
        // Wait for initial connection
        await fulfillment(of: [currentExpectation!], timeout: 5.0)
        
        // Add delay to verify connection stability
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        
        // Connection should remain stable
        XCTAssertTrue(connectionStateChanges.last ?? false, "Connection should remain stable")
        XCTAssertTrue(errors.isEmpty, "Should not encounter errors during connection")
    }
    
    func testSendMessage() async {
        currentExpectation = XCTestExpectation(description: "Message sent")
        
        // First connect
        api.connect()
        
        // Wait for connection
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        
        // Send a click
        api.sendClick()
        
        // Wait longer for AWS response
        await fulfillment(of: [currentExpectation!], timeout: 10.0)  // Increased timeout
        XCTAssertTrue(errors.isEmpty, "Should not encounter errors when sending message")
    }
    
    func testDisconnect() async {
        currentExpectation = XCTestExpectation(description: "Disconnection")
        
        // First connect
        api.connect()
        await Task.sleep(2_000_000_000)
        
        // Then disconnect
        api.disconnect()
        
        await fulfillment(of: [currentExpectation!], timeout: 10.0)
        
        if let lastState = connectionStateChanges.last {
            XCTAssertFalse(lastState, "Should be disconnected")
        }
    }
    
    // MARK: - PebbleAPIDelegate
    func pebbleAPI(_ api: PebbleAPI, didReceiveClick message: [String: Any]) {
        receivedMessages.append(message)
        print("Received message: \(message)")
        currentExpectation?.fulfill()  // Use the instance
    }
    
    func pebbleAPI(_ api: PebbleAPI, didChangeConnectionState isConnected: Bool) {
        connectionStateChanges.append(isConnected)
        print("Connection state changed to: \(isConnected)")
        currentExpectation?.fulfill()  // Use the instance
    }
    
    func pebbleAPI(_ api: PebbleAPI, didEncounterError error: Error) {
        errors.append(error)
        print("Encountered error: \(error)")
        currentExpectation?.fulfill()  // Use the instance
    }
}
