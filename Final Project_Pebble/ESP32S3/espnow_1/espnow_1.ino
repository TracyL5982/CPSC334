#include <esp_now.h>
#include <WiFi.h>

#define BUTTON_PIN 2
#define VIBRATOR_PIN 5

// MAC address of Device 1
uint8_t peerAddress[] = {0xD8, 0x3B, 0xDA, 0x89, 0x36, 0xB8};

typedef struct struct_message {
    bool buttonPressed;
} struct_message;

struct_message outgoingMessage;
struct_message incomingMessage;

// Callback when data is sent
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("ESP32_2: Last Packet Send Status: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}

// Updated callback for receiving data
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  memcpy(&incomingMessage, data, sizeof(incomingMessage));
  Serial.println("ESP32_2: Data received");
  
  if (incomingMessage.buttonPressed) {
    Serial.println("ESP32_2: Received button press from Device 1. Vibrating...");
    digitalWrite(VIBRATOR_PIN, HIGH);
    delay(1000);
    digitalWrite(VIBRATOR_PIN, LOW);
    Serial.println("ESP32_2: Vibration complete.");
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(VIBRATOR_PIN, OUTPUT);

  WiFi.mode(WIFI_STA);

  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP32_2: Error initializing ESP-NOW");
    return;
  }

  esp_now_register_send_cb(OnDataSent);
  esp_now_register_recv_cb(OnDataRecv);

  // Add Device 1 as a peer
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, peerAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("ESP32_2: Failed to add peer");
    return;
  }

  Serial.println("ESP32_2: Setup complete");
}

void loop() {
  static bool oldButtonState = HIGH;
  bool currentButtonState = digitalRead(BUTTON_PIN);

  if (oldButtonState == HIGH && currentButtonState == LOW) {
    // Button pressed
    Serial.println("ESP32_2: Button pressed, sending message to Device 1");
    outgoingMessage.buttonPressed = true;
    esp_err_t result = esp_now_send(peerAddress, (uint8_t *)&outgoingMessage, sizeof(outgoingMessage));
    if (result == ESP_OK) {
      Serial.println("ESP32_2: Sent with success");
    } else {
      Serial.println("ESP32_2: Error sending the data");
    }
  }

  oldButtonState = currentButtonState;
  delay(50);
}
