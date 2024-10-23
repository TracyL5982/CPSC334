#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

#define SEALEVELPRESSURE_HPA (1013.25)
#define LIGHT_SENSOR_PIN1 34
#define LIGHT_SENSOR_PIN2 35
#define LIGHT_SENSOR_PIN3 32
#define LIGHT_SENSOR_PIN4 33

// FOR BME280, SCL GOES INTO GPIO 22, SDA GOES INTO GPIO21

const char* ssid = "yale wireless";
const char* server_ip = "172.29.31.198"; // CHANGE THIS IP TO YOUR DEVICE'S IP
const int server_port = 10000;

Adafruit_BME280 bme; 
bool bmeStatus = false;

void setup() {
  analogSetAttenuation(ADC_11db);
  Serial.begin(115200);

  WiFi.begin(ssid);
  unsigned long startAttemptTime = millis();
  const unsigned long timeout = 10000;

  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < timeout) {
    delay(500);
    Serial.println("...");
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Failed to connect to WiFi");
    return;
  }

  Serial.print("WiFi connected with IP: ");
  Serial.println(WiFi.localIP());

  initializeBME();
}

void initializeBME() {
  bmeStatus = bme.begin(0x76);
  if (!bmeStatus) {
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
  } else {
    Serial.println("BME280 sensor initialized successfully.");
  }
}

WiFiClient client;

void loop() {
  if (!client.connected()) {
    Serial.println("Reconnecting to host...");
    if (!client.connect(server_ip, server_port)) {
      Serial.println("Connection to host failed");
      delay(1000);
      return;
    }
    Serial.println("Connected to host");
  }

  if (!bmeStatus) {
    Serial.println("BME280 sensor not responding, attempting reinitialization...");
    initializeBME();
    delay(1000); 
  }

  printValues(client);
  delay(1000);
}

// light1,light2,light3,light4,temp,humidity,pressure,altitude
void printValues(WiFiClient &client) {
  float temperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure();
  float altitude = bme.readAltitude(SEALEVELPRESSURE_HPA);

  // if any reading fails, attempt to reinitialize the BME280
  if (isnan(temperature) || isnan(humidity) || isnan(pressure) || isnan(altitude)) {
    Serial.println("Invalid BME280 readings, attempting to reinitialize sensor...");
    initializeBME();
  }

  String message = String(analogRead(LIGHT_SENSOR_PIN1)) + ",";
  message += String(analogRead(LIGHT_SENSOR_PIN2)) + ",";
  message += String(analogRead(LIGHT_SENSOR_PIN3)) + ",";
  message += String(analogRead(LIGHT_SENSOR_PIN4)) + ",";
  message += String(temperature) + ",";
  message += String(humidity) + ",";
  message += String(pressure) + ",";
  message += String(altitude) + "\n";

  client.print(message);
  Serial.print(message);
}
