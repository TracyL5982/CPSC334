#define BUTTON_PIN 14
#define SWITCH_PIN 12

void setup()
{
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(SWITCH_PIN, INPUT_PULLUP);
}

void loop()
{
  Serial.println("button: ");
  Serial.println(digitalRead(BUTTON_PIN));
  Serial.println("switch: ");
  Serial.println(digitalRead(SWITCH_PIN));
  delay(100);
}
