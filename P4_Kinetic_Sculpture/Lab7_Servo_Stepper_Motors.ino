#include <Stepper.h>
#include <ESP32Servo.h>

const int stepsPerRevolution = 2048;

#define IN1 19
#define IN2 18
#define IN3 5
#define IN4 17
#define servoPin 13

Servo servo1;

Stepper myStepper(stepsPerRevolution, IN1, IN3, IN2, IN4);
bool first = true;

void setup() {
  Serial.begin(115200);
  myStepper.setSpeed(5);

  servo1.attach(servoPin);
}

void loop() {
  // Serial.println("clockwise");
  // myStepper.step(stepsPerRevolution);

  for (int i = 0; i < 2048; i++) {
    myStepper.step(1);
    String message = "Steps: " + String(i);
    Serial.println(message);

    if (!first && i == 1023) {
      servo1.write(0);
    }
    
    if (i == 2047) {
      servo1.write(10);
      first = false;
    }
  }
  
   // delay(1000);
}
