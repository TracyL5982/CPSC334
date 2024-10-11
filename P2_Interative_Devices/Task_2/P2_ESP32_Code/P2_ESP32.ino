#define BUTTON_PIN 14  
#define JOYSTICK_X_PIN 27
#define JOYSTICK_Y_PIN 26
#define SWITCH_PIN 12  

int joystickXCenterValue = 2915;
int joystickYCenterValue = 2845;
int minJoystickValue = 0;
int maxJoystickValue = 4095;

int lastSwitchState = HIGH;           
unsigned long lastDebounceTime = 0;  
unsigned long debounceDelay = 500;     

void setup() {
  Serial.begin(115200);  
  pinMode(BUTTON_PIN, INPUT_PULLUP);  
  pinMode(JOYSTICK_X_PIN, INPUT); 
  pinMode(JOYSTICK_Y_PIN, INPUT);
  pinMode(SWITCH_PIN, INPUT_PULLUP);  
}

void loop() {
  int buttonReading = digitalRead(BUTTON_PIN);
  if (buttonReading == LOW) {
    Serial.println("play_video");
  }

  int joystickXValue = analogRead(JOYSTICK_X_PIN);
  int joystickYValue = 4095 - analogRead(JOYSTICK_Y_PIN);

  int switchReading = digitalRead(SWITCH_PIN);

  // Debounce the switch
  if (switchReading != lastSwitchState) {
    lastDebounceTime = millis();
  }
  if ((millis() - lastDebounceTime) > debounceDelay) {
    int switchState = switchReading;

    // Mode A: Adjust video position on screen (switch is LOW)
    if (switchState == 0) {
      Serial.println("MODE A");
      if (joystickXValue >= 2907 && joystickXValue <= 2917 && joystickYValue >= 1245 && joystickYValue <= 1255) {
        Serial.println("REST");
      } else {
        Serial.print("POS ");
        Serial.print(joystickXValue);
        Serial.print(",");
        Serial.println(joystickYValue);  
      }
    }
    // Mode B: Control video playback time (switch is HIGH)
    else {
      Serial.println("MODE B");
      if (joystickXValue >= 2910 && joystickXValue <= 2920) {
        Serial.println("REST");
      } else {
        Serial.println(joystickXValue);  
      }
    }
  }

  lastSwitchState = switchReading;

  delay(500);  
}
