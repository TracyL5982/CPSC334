#include <Stepper.h>

const int stepsPerRevolution = 2048;

#define IN1 19
#define IN2 18
#define IN3 5
#define IN4 17

const int redLedPin1 = 21;
const int yellowLedPin1 = 23;
const int whiteLedPin1 = 22;

const int redLedPin2 = 16;
const int yellowLedPin2 = 4;
const int whiteLedPin2 = 2;

Stepper myStepper(stepsPerRevolution, IN1, IN3, IN2, IN4);

unsigned long previousLEDUpdateMillis = 0;
const unsigned long ledUpdateInterval = 10;

int redBrightness1 = 0;
int yellowBrightness1 = 0;
int whiteBrightness1 = 0;

int redBrightness2 = 0;
int yellowBrightness2 = 0;
int whiteBrightness2 = 0;

int maxBrightness = 255;
int halfBrightness = maxBrightness / 2;

unsigned long cycleStartTime = 0;

void setup() {
  Serial.begin(115200);
  myStepper.setSpeed(10);

  pinMode(redLedPin1, OUTPUT);
  pinMode(yellowLedPin1, OUTPUT);
  pinMode(whiteLedPin1, OUTPUT);

  pinMode(redLedPin2, OUTPUT);
  pinMode(yellowLedPin2, OUTPUT);
  pinMode(whiteLedPin2, OUTPUT);

  cycleStartTime = millis();
}

void loop() {
  unsigned long currentMillis = millis();

  unsigned long totalCycleTime = 100000;
  unsigned long halfCycleTime = totalCycleTime / 2;

  unsigned long elapsedCycleTime = (currentMillis - cycleStartTime) % totalCycleTime;

  bool isSet1DayTime = elapsedCycleTime < halfCycleTime;

  unsigned long halfCycleElapsedTime = elapsedCycleTime % halfCycleTime;

  unsigned long phaseDuration = halfCycleTime / 9;
  int cycleStep = halfCycleElapsedTime / phaseDuration;
  float phaseProgress = (float)(halfCycleElapsedTime % phaseDuration) / phaseDuration;

  if (isSet1DayTime) {
    switch (cycleStep) {
      case 0:
        redBrightness1 = phaseProgress * halfBrightness;
        yellowBrightness1 = 0;
        whiteBrightness1 = 0;
        break;
      case 1:
        redBrightness1 = halfBrightness + (phaseProgress * halfBrightness);
        yellowBrightness1 = phaseProgress * halfBrightness;
        whiteBrightness1 = 0;
        break;
      case 2:
        redBrightness1 = maxBrightness - (phaseProgress * halfBrightness);
        yellowBrightness1 = halfBrightness + (phaseProgress * halfBrightness);
        whiteBrightness1 = 0;
        break;
      case 3:
        redBrightness1 = halfBrightness - (phaseProgress * halfBrightness);
        yellowBrightness1 = maxBrightness;
        whiteBrightness1 = 0;
        break;
      case 4:
        redBrightness1 = 0;
        yellowBrightness1 = maxBrightness;
        whiteBrightness1 = 0;
        break;
      case 5:
        redBrightness1 = phaseProgress * halfBrightness;
        yellowBrightness1 = maxBrightness;
        whiteBrightness1 = 0;
        break;
      case 6:
        redBrightness1 = halfBrightness + (phaseProgress * halfBrightness);
        yellowBrightness1 = maxBrightness - (phaseProgress * halfBrightness);
        whiteBrightness1 = 0;
        break;
      case 7:
        redBrightness1 = maxBrightness - (phaseProgress * halfBrightness);
        yellowBrightness1 = halfBrightness - (phaseProgress * halfBrightness);
        whiteBrightness1 = 0;
        break;
      case 8:
        redBrightness1 = halfBrightness - (phaseProgress * halfBrightness);
        yellowBrightness1 = 0;
        whiteBrightness1 = 0;
        break;
      default:
        redBrightness1 = 0;
        yellowBrightness1 = 0;
        whiteBrightness1 = 0;
        break;
    }

    if (phaseProgress < 0.25) {
      whiteBrightness2 = phaseProgress / 0.25 * maxBrightness;
    } else if (phaseProgress < 0.75) {
      whiteBrightness2 = maxBrightness;
    } else {
      whiteBrightness2 = (1 - (phaseProgress - 0.75) / 0.25) * maxBrightness;
    }
    redBrightness2 = 0;
    yellowBrightness2 = 0;
  } else {
    if (phaseProgress < 0.25) {
      whiteBrightness1 = phaseProgress / 0.25 * maxBrightness;
    } else if (phaseProgress < 0.75) {
      whiteBrightness1 = maxBrightness;
    } else {
      whiteBrightness1 = (1 - (phaseProgress - 0.75) / 0.25) * maxBrightness;
    }
    redBrightness1 = 0;
    yellowBrightness1 = 0;

    switch (cycleStep) {
      case 0:
        redBrightness2 = phaseProgress * halfBrightness;
        yellowBrightness2 = 0;
        whiteBrightness2 = 0;
        break;
      case 1:
        redBrightness2 = halfBrightness + (phaseProgress * halfBrightness);
        yellowBrightness2 = phaseProgress * halfBrightness;
        whiteBrightness2 = 0;
        break;
      case 2:
        redBrightness2 = maxBrightness - (phaseProgress * halfBrightness);
        yellowBrightness2 = halfBrightness + (phaseProgress * halfBrightness);
        whiteBrightness2 = 0;
        break;
      case 3:
        redBrightness2 = halfBrightness - (phaseProgress * halfBrightness);
        yellowBrightness2 = maxBrightness;
        whiteBrightness2 = 0;
        break;
      case 4:
        redBrightness2 = 0;
        yellowBrightness2 = maxBrightness;
        whiteBrightness2 = 0;
        break;
      case 5:
        redBrightness2 = phaseProgress * halfBrightness;
        yellowBrightness2 = maxBrightness;
        whiteBrightness2 = 0;
        break;
      case 6:
        redBrightness2 = halfBrightness + (phaseProgress * halfBrightness);
        yellowBrightness2 = maxBrightness - (phaseProgress * halfBrightness);
        whiteBrightness2 = 0;
        break;
      case 7:
        redBrightness2 = maxBrightness - (phaseProgress * halfBrightness);
        yellowBrightness2 = halfBrightness - (phaseProgress * halfBrightness);
        whiteBrightness2 = 0;
        break;
      case 8:
        redBrightness2 = halfBrightness - (phaseProgress * halfBrightness);
        yellowBrightness2 = 0;
        whiteBrightness2 = 0;
        break;
      default:
        redBrightness2 = 0;
        yellowBrightness2 = 0;
        whiteBrightness2 = 0;
        break;
    }
  }

  analogWrite(redLedPin1, redBrightness1);
  analogWrite(yellowLedPin1, yellowBrightness1);
  analogWrite(whiteLedPin1, whiteBrightness1);

  analogWrite(redLedPin2, redBrightness2);
  analogWrite(yellowLedPin2, yellowBrightness2);
  analogWrite(whiteLedPin2, whiteBrightness2);

  static unsigned long previousMotorStepMillis = 0;
  const unsigned long motorStepInterval = 2;
  if (currentMillis - previousMotorStepMillis >= motorStepInterval) {
    previousMotorStepMillis = currentMillis;
    myStepper.step(1);
  }
}
