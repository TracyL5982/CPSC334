import Foundation
import CoreBluetooth

class BLEManager: NSObject, ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate, PebbleAPIDelegate {
    @Published var isConnected = false
    @Published var lastButtonPress = "None"
    
    private var centralManager: CBCentralManager!
    private var targetPeripheral: CBPeripheral?
    private var vibratorCharacteristic: CBCharacteristic?
    
    private var deviceUUID: String = "unknown"
    private let targetDeviceName = "ESP32_MissYouDevice2"
    private let serviceUUIDString = "98765432-9876-5432-9876-54321fedcba0"
    private let buttonCharUUIDString = "fedcba12-6543-2109-abcd-ef0987654321"
    private let vibratorCharUUIDString = "fedcba34-6543-2109-abcd-ef1234567890"
    
    private let scanDuration: TimeInterval = 30.0
    private let rescanDelay: TimeInterval = 2.0
     
    private var scanTimer: Timer?
    private var rescanTimer: Timer?
    
    private var pebbleAPI: PebbleAPI?
    private var isPebbleAPIConnected = false
    private var hasPaired = false
    
    private let myDeviceId = "my-device-A"
    private let partnerId = "my-device-B"
    
    override init() {
        super.init()
        print("BLEManager: Initializing...")
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("BLEManager: Bluetooth is ON. Start scan in 1 second.")
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.startScanning()
            }
        case .resetting:
            print("BLEManager: Bluetooth resetting.")
        case .unsupported:
            print("BLEManager: Not supported.")
        case .unauthorized:
            print("BLEManager: Unauthorized. Check Info.plist")
        case .poweredOff:
            print("BLEManager: Bluetooth OFF.")
        case .unknown:
            print("BLEManager: Unknown state.")
        @unknown default:
            print("BLEManager: Unknown default.")
        }
    }
    
    private func startScanning() {
        stopScanning()
        print("BLEManager: Start scanning for BLE devices...")
        centralManager.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey:false])
        
        scanTimer = Timer.scheduledTimer(withTimeInterval: scanDuration, repeats: false) { [weak self] _ in
            print("BLEManager: Scan ended, will rescan.")
            self?.stopScanning()
            self?.scheduleRescan()
        }
    }
    
    private func stopScanning() {
        if centralManager.isScanning {
            centralManager.stopScan()
            print("BLEManager: Stopped scanning.")
        }
        scanTimer?.invalidate()
        scanTimer = nil
    }
    
    private func scheduleRescan() {
        rescanTimer?.invalidate()
        
        print("BLEManager: Rescan in \(rescanDelay)s.")
        rescanTimer = Timer.scheduledTimer(withTimeInterval: rescanDelay, repeats: false) { [weak self] _ in
            print("BLEManager: Rescan now.")
            self?.startScanning()
        }
    }
    
    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String : Any],
                        rssi RSSI: NSNumber) {
        
        guard let name = peripheral.name, name == targetDeviceName else {
            return
        }
        
        print("BLEManager: Found \(name), connecting...")
        stopScanning()
        
        targetPeripheral = peripheral
        targetPeripheral?.delegate = self
        central.connect(peripheral, options: nil)
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("BLEManager: Connected to \(peripheral.name ?? "Unknown")")
        isConnected = true
        
        deviceUUID = peripheral.identifier.uuidString
        print("BLEManager: Device UUID: \(deviceUUID)")
        
        // Initialize PebbleAPI with myDeviceId
        print("BLEManager: Initializing PebbleAPI with deviceId=\(myDeviceId)")
        pebbleAPI = PebbleAPI(deviceId: myDeviceId)
        pebbleAPI?.delegate = self
        pebbleAPI?.connect()  // Wait for didChangeConnectionState(true)
        
        peripheral.discoverServices(nil)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("BLEManager: Failed connect: \(error?.localizedDescription ?? "None")")
        isConnected = false
        scheduleRescan()
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("BLEManager: Disconnected.")
        isConnected = false
        targetPeripheral = nil
        scheduleRescan()
    }
    
    // MARK: - CBPeripheralDelegate
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let err = error {
            print("BLEManager: Error services: \(err.localizedDescription)")
            return
        }
        
        guard let services = peripheral.services else {
            print("BLEManager: No services, disconnect.")
            centralManager.cancelPeripheralConnection(peripheral)
            return
        }
        
        if let targetService = services.first(where: { $0.uuid.uuidString.lowercased() == serviceUUIDString.lowercased() }) {
            print("BLEManager: Found target service, discover chars...")
            peripheral.discoverCharacteristics(nil, for: targetService)
        } else {
            print("BLEManager: Target service not found, disconnect.")
            centralManager.cancelPeripheralConnection(peripheral)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let err = error {
            print("BLEManager: Error chars: \(err.localizedDescription)")
            return
        }
        
        guard let characteristics = service.characteristics else {
            print("BLEManager: No chars found.")
            return
        }
        
        if let buttonChar = characteristics.first(where: { $0.uuid.uuidString.lowercased() == buttonCharUUIDString.lowercased() }) {
            print("BLEManager: Found button char, enable notify.")
            peripheral.setNotifyValue(true, for: buttonChar)
        } else {
            print("BLEManager: Button char not found.")
        }
        
        if let vibChar = characteristics.first(where: { $0.uuid.uuidString.lowercased() == vibratorCharUUIDString.lowercased() }) {
            print("BLEManager: Found vibrator char.")
            vibratorCharacteristic = vibChar
        } else {
            print("BLEManager: Vibrator char not found.")
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let err = error {
            print("BLEManager: Update value error: \(err.localizedDescription)")
            return
        }
        
        guard let data = characteristic.value else {
            print("BLEManager: No data.")
            return
        }
        
        if characteristic.uuid.uuidString.lowercased() == buttonCharUUIDString.lowercased(),
           let message = String(data: data, encoding: .utf8) {
            print("BLEManager: Button pressed: \(message)")
            lastButtonPress = message
            
            if isPebbleAPIConnected && hasPaired {
                print("BLEManager: Conditions met, send click to partner.")
                pebbleAPI?.sendClick()
            } else {
                print("BLEManager: Not ready (connected=\(isPebbleAPIConnected), paired=\(hasPaired)).")
            }
        }
    }
    
    // MARK: - Vibrate
    func sendVibrateCommand() {
        guard let peripheral = targetPeripheral,
              let vibChar = vibratorCharacteristic else {
            print("BLEManager: Can't vibrate, no char.")
            return
        }
        
        if let data = "vibrate".data(using: .utf8) {
            print("BLEManager: Sending vibrate command...")
            peripheral.writeValue(data, for: vibChar, type: .withResponse)
        } else {
            print("BLEManager: Encode vibrate failed.")
        }
    }
    
    // MARK: - PebbleAPIDelegate
    func pebbleAPI(_ api: PebbleAPI, didReceiveClick message: [String : Any]) {
        print("BLEManager: Received click from AWS: \(message)")
        print("BLEManager: Vibrating device now.")
        sendVibrateCommand()
    }
    
    func pebbleAPI(_ api: PebbleAPI, didChangeConnectionState isConnected: Bool) {
        print("BLEManager: PebbleAPI state=\(isConnected)")
        isPebbleAPIConnected = isConnected
        if isConnected {
            // Once connected, set partnerId and send pair request
            pebbleAPI?.setPartnerId(partnerId)
            print("BLEManager: PebbleAPI connected, pair request to \(partnerId)")
            pebbleAPI?.sendPairRequest(partnerId: partnerId)
            
            // Wait 1 second
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.hasPaired = true
                print("BLEManager: Paired after wait. hasPaired=\(self.hasPaired)")
            }
        } else {
            isPebbleAPIConnected = false
            hasPaired = false
        }
    }
    
    func pebbleAPI(_ api: PebbleAPI, didEncounterError error: Error) {
        print("BLEManager: PebbleAPI error: \(error)")
    }
}


