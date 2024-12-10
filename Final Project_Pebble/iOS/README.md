# Pebble iOS Frontend Documentation

## Overview
iOS App is responsible for:
1. BLT communication with ESP32S3 to receive button pressed notification and send vibration command
2. Web socket communication with AWS to initiate a websocket and achieve communication between two sets of devices

## BLT communication between ESP32S3 and iOS

```swift
import CoreBluetooth

class BLEManager: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    var centralManager: CBCentralManager!
    var peripheral: CBPeripheral?
    var characteristic: CBCharacteristic?

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }


    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            centralManager.scanForPeripherals(withServices: [serviceUUID])
        } else {
            print("Bluetooth not available.")
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        self.peripheral = peripheral
        self.peripheral?.delegate = self
        centralManager.stopScan()
        centralManager.connect(peripheral)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("Connected to \(peripheral.name ?? "device")")
        peripheral.discoverServices([serviceUUID])
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        for service in services {
            if service.uuid == serviceUUID {
                peripheral.discoverCharacteristics([characteristicUUID], for: service)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        for characteristic in characteristics {
            if characteristic.uuid == characteristicUUID {
                self.characteristic = characteristic
                peripheral.setNotifyValue(true, for: characteristic)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if characteristic.uuid == characteristicUUID, let value = characteristic.value {
            let receivedMessage = String(data: value, encoding: .utf8)
            if receivedMessage == "button_pressed" {
                print("Button pressed on ESP32")
                sendMessageToAWS(action: "message", message: ["type": "button_pressed"])
            }
        }
    }

    func sendVibrationCommand() {
        guard let characteristic = characteristic else { return }
        let command = "vibrate".data(using: .utf8)!
        peripheral?.writeValue(command, for: characteristic, type: .withResponse)
        print("Sent vibrate command to ESP32")
    }
}
```


## Web Socket Communication between iOS and AWS
```swift
import Starscream

class WebSocketManager: WebSocketDelegate {
    var socket: WebSocket!
    var deviceId: String = "your-unique-device-id"

    func connectToWebSocket() {
        let wsUrl = "wss://<api-id>.execute-api.<region>.amazonaws.com/dev?deviceId=\(deviceId)"
        var request = URLRequest(url: URL(string: wsUrl)!)
        socket = WebSocket(request: request)
        socket.delegate = self
        socket.connect()
    }

    func didReceive(event: WebSocketEvent, client: WebSocket) {
        switch event {
        case .connected(_):
            print("Connected to AWS WebSocket")
        case .disconnected(let reason, let code):
            print("Disconnected: \(reason) with code: \(code)")
        case .text(let text):
            print("Received text: \(text)")
            handleWebSocketMessage(text)
        case .error(let error):
            print("Error: \(String(describing: error))")
        default:
            break
        }
    }

    func sendMessageToAWS(action: String, message: [String: Any]) {
        let payload: [String: Any] = [
            "action": action,
            "deviceId": deviceId,
            "message": message
        ]

        do {
            let data = try JSONSerialization.data(withJSONObject: payload, options: [])
            let jsonString = String(data: data, encoding: .utf8)!
            socket.write(string: jsonString)
            print("Sent message to AWS: \(jsonString)")
        } catch {
            print("Failed to serialize message: \(error)")
        }
    }

    func handleWebSocketMessage(_ message: String) {
        guard let data = message.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let messageType = json["type"] as? String else { return }

        if messageType == "vibrate" {
            let bleManager = BLEManager()
            bleManager.sendVibrationCommand()
        }
    }
}

```