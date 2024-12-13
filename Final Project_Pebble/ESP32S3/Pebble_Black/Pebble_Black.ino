#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// UUIDs for ESP32_1
#define SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
#define BUTTON_CHARACTERISTIC_UUID "abcdef12-3456-789a-bcde-f0123456789a"
#define VIBRATOR_CHARACTERISTIC_UUID "abcdef34-5678-90ab-cdef-123456789abc"

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
    Serial.println("ESP32_1 connected");
  }
  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
    Serial.println("ESP32_1 disconnected");
  }
};

class VibratorCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    String value = pCharacteristic->getValue().c_str();
    if (value == "vibrate") {
      Serial.println("ESP32_1 Vibrating for 1 second...");
      digitalWrite(VIBRATOR_PIN, HIGH);
      delay(1000);
      digitalWrite(VIBRATOR_PIN, LOW);
      Serial.println("ESP32_1 Vibration complete.");
    }
  }
};

void setup() {
  Serial.begin(115200);
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(VIBRATOR_PIN, OUTPUT);

  BLEDevice::init("ESP32_MissYouDevice1");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  buttonCharacteristic = pService->createCharacteristic(
    BUTTON_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  buttonCharacteristic->addDescriptor(new BLE2902());

  vibratorCharacteristic = pService->createCharacteristic(
    VIBRATOR_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  vibratorCharacteristic->setCallbacks(new VibratorCallbacks());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);

  pAdvertising->setMinInterval(0x20);
  pAdvertising->setMaxInterval(0x20);

  pAdvertising->start();
  Serial.println("ESP32_1 BLE service started and advertising");
}

void loop() {
  bool buttonState = digitalRead(BUTTON_PIN);
  if (deviceConnected && buttonState == LOW && oldButtonState == HIGH) {
    Serial.println("ESP32_1 button pressed, sending notification");
    buttonCharacteristic->setValue("button_pressed");
    buttonCharacteristic->notify();
    delay(300);
  }
  oldButtonState = buttonState;
  delay(10);
}
