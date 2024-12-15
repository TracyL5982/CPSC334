#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID "98765432-9876-5432-9876-54321fedcba0"
#define BUTTON_CHARACTERISTIC_UUID "fedcba12-6543-2109-abcd-ef0987654321"
#define VIBRATOR_CHARACTERISTIC_UUID "fedcba34-6543-2109-abcd-ef1234567890"

#define BUTTON_PIN 2
#define VIBRATOR_PIN 5

BLEServer *pServer = nullptr;
BLECharacteristic *buttonCharacteristic = nullptr;
BLECharacteristic *vibratorCharacteristic = nullptr;
bool deviceConnected = false;
bool oldButtonState = HIGH;

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
  }
  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
  }
};

class VibratorCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    String value = pCharacteristic->getValue().c_str();
    if (value == "vibrate") {
      Serial.println("Received vibrate command. Vibrating for 1 second...");
      digitalWrite(VIBRATOR_PIN, HIGH);
      delay(1000); 
      digitalWrite(VIBRATOR_PIN, LOW);
      Serial.println("Vibration complete.");
    }
  }
};

void setup() {
  Serial.begin(115200);
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(VIBRATOR_PIN, OUTPUT);

  // Initialize BLE
  BLEDevice::init("ESP32_MissYouDevice2");

  // Increase TX Power to make the device more discoverable
  BLEDevice::setPower(ESP_PWR_LVL_P9);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Button Characteristic (Notify)
  buttonCharacteristic = pService->createCharacteristic(
    BUTTON_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  buttonCharacteristic->addDescriptor(new BLE2902());

  // Vibrator Characteristic (Write)
  vibratorCharacteristic = pService->createCharacteristic(
    VIBRATOR_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  vibratorCharacteristic->setCallbacks(new VibratorCallbacks());

  pService->start();

  // Configure advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);

  // Construct Advertisement Data
  BLEAdvertisementData advData;
  advData.setFlags(ESP_BLE_ADV_FLAG_GEN_DISC | ESP_BLE_ADV_FLAG_BREDR_NOT_SPT);
  advData.setCompleteServices(BLEUUID(SERVICE_UUID));
  
  // Construct Scan Response Data to include the complete local name
  BLEAdvertisementData scanRespData;
  scanRespData.setName("ESP32_MissYouDevice2"); 

  pAdvertising->setAdvertisementData(advData);
  pAdvertising->setScanResponseData(scanRespData);
  pAdvertising->setScanResponse(true);

  // Keep the advertising interval as is, but we can try defaults for reliability
  // pAdvertising->setMinInterval(0x20); // ~20ms
  // pAdvertising->setMaxInterval(0x20); // Very frequent advertising
  // If detection is an issue, we can leave these lines commented out and let defaults apply.

  pAdvertising->start();
  Serial.println("BLE service started and advertising");
}

void loop() {
  bool buttonState = digitalRead(BUTTON_PIN);
  if (deviceConnected && buttonState == LOW && oldButtonState == HIGH) {
    Serial.println("Button pressed, sending notification");
    buttonCharacteristic->setValue("button_pressed");
    buttonCharacteristic->notify();
    delay(300); 
  }
  oldButtonState = buttonState;
  
  delay(10);
}
