import Foundation

enum PebbleAPIError: Error {
    case invalidURL
    case connectionFailed
    case invalidResponse
    case notConnected
}

protocol PebbleAPIDelegate: AnyObject {
    func pebbleAPI(_ api: PebbleAPI, didReceiveClick message: [String: Any])
    func pebbleAPI(_ api: PebbleAPI, didChangeConnectionState isConnected: Bool)
    func pebbleAPI(_ api: PebbleAPI, didEncounterError error: Error)
}

class PebbleAPI: NSObject, URLSessionWebSocketDelegate {
    // MARK: - Properties
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession!
    private let baseURL = "wss://i4uw8vt2nb.execute-api.us-east-1.amazonaws.com/dev"
    private(set) var isConnected = false
    private var deviceId: String
    private var lastClickTime: TimeInterval = 0
    private var heartbeatTimer: Timer?
    
    private var partnerId: String? // The deviceId of the other device we pair with
    
    weak var delegate: PebbleAPIDelegate?
    
    // MARK: - Initialization
    // Here you set your unique deviceId for this device.
    // For Device A: deviceId = "my-device-A"
    // For Device B: deviceId = "my-device-B"
    init(deviceId: String) {
        self.deviceId = deviceId
        super.init()
        self.session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    }
    
    // MARK: - Set Partner
    func setPartnerId(_ partnerId: String) {
        self.partnerId = partnerId
        print("PebbleAPI: partnerId set to \(partnerId)")
    }
    
    // MARK: - Connection Management
    func connect() {
        var components = URLComponents()
        components.scheme = "wss"
        components.host = "i4uw8vt2nb.execute-api.us-east-1.amazonaws.com"
        components.path = "/dev"
        components.queryItems = [URLQueryItem(name: "deviceId", value: deviceId)]
        
        guard let url = components.url else {
            delegate?.pebbleAPI(self, didEncounterError: PebbleAPIError.invalidURL)
            return
        }
        
        print("PebbleAPI: Connecting to: \(url.absoluteString)")
        
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()
        startListening()
        setupHeartbeat()
    }

    func disconnect() {
        heartbeatTimer?.invalidate()
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        isConnected = false
        delegate?.pebbleAPI(self, didChangeConnectionState: false)
    }
    
    // MARK: - Message Handling
    func sendClick() {
        guard let partnerId = partnerId else {
            print("PebbleAPI: Cannot send click without a partnerId set.")
            return
        }
        
        let now = Date().timeIntervalSince1970 * 1000
        let timeSinceLastClick = lastClickTime > 0 ? now - lastClickTime : 0
        let messageId = "\(deviceId)-\(now)"
        
        // Use partnerId as receiverId so AWS knows where to deliver the message
        let message: [String: Any] = [
            "action": "message",
            "deviceId": deviceId,
            "receiverId": partnerId,
            "message": [
                "timestamp": now,
                "timeSinceLastClick": timeSinceLastClick,
                "messageId": messageId
            ]
        ]
        
        sendMessage(message)
        lastClickTime = now
    }
    
    func sendPairRequest(partnerId: String) {
        let message: [String: Any] = [
            "action": "pair",
            "deviceId": deviceId,
            "partnerId": partnerId
        ]
        
        sendMessage(message)
    }
    
    // MARK: - Private Methods
    private func setupHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.sendHeartbeat()
        }
    }
    
    private func sendHeartbeat() {
        let message: [String: Any] = [
            "action": "heartbeat",
            "deviceId": deviceId
        ]
        sendMessage(message)
    }
    
    private func startListening() {
        listenForMessage()
    }
    
    private func listenForMessage() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let message):
                self.handleMessage(message)
                self.listenForMessage() // Continue listening
                
            case .failure(let error):
                self.delegate?.pebbleAPI(self, didEncounterError: error)
                self.handleDisconnection()
            }
        }
    }
    
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            print("PebbleAPI: Received raw WebSocket message: \(text)")
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                print("PebbleAPI: Failed to parse message as JSON: \(text)")
                return
            }
            
            print("PebbleAPI: Parsed JSON message: \(json)")
            
            if let statusCode = json["statusCode"] as? Int {
                print("PebbleAPI: Connection response with status: \(statusCode)")
                if statusCode == 200 && !isConnected {
                    isConnected = true
                    delegate?.pebbleAPI(self, didChangeConnectionState: true)
                }
                return
            }
            
            if json["type"] as? String == "click" {
                print("PebbleAPI: Received click message from AWS")
                delegate?.pebbleAPI(self, didReceiveClick: json)
            }
            
        case .data(let data):
            print("PebbleAPI: Received binary message: \(data.count) bytes")
            
        @unknown default:
            print("PebbleAPI: Received unknown message type")
        }
    }
    
    private func sendMessage(_ message: [String: Any]) {
        guard let webSocket = webSocket, isConnected else {
            print("PebbleAPI: Attempted to send message while not connected")
            delegate?.pebbleAPI(self, didEncounterError: PebbleAPIError.notConnected)
            return
        }
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: message),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            print("PebbleAPI: Failed to encode message")
            return
        }
        
        print("PebbleAPI: Sending message: \(jsonString)")
        webSocket.send(.string(jsonString)) { [weak self] error in
            if let error = error {
                self?.delegate?.pebbleAPI(self!, didEncounterError: error)
                print("PebbleAPI: Send error: \(error)")
            } else {
                print("PebbleAPI: Message sent successfully")
            }
        }
    }
    
    private func handleDisconnection() {
        isConnected = false
        delegate?.pebbleAPI(self, didChangeConnectionState: false)
    }
    
    // MARK: - URLSessionWebSocketDelegate
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        isConnected = true
        delegate?.pebbleAPI(self, didChangeConnectionState: true)
    }
    
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        handleDisconnection()
    }
    
    func getDeviceId() -> String {
        return deviceId
    }
}

