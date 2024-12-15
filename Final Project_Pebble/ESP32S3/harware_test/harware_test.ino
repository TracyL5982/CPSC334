#define BUTTON_PIN 2
#define MOTOR_PIN 5

bool motorState = false;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(MOTOR_PIN, OUTPUT);

}

void loop() {
  if (digitalRead(BUTTON_PIN) == LOW){
    motorState = !motorState;
    delay(300);
  }
  if(motorState){
    analogWrite (MOTOR_PIN, 128);
    //analogWrite (MOTOR_PIN, 0);
  }else{
    analogWrite (MOTOR_PIN, 0);
  }

}
