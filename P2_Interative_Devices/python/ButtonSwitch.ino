#define BUTTON_PIN 2

void setup()
{
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
}

void loop()
{
  Serial.println(digitalRead(BUTTON_PIN));
  delay(100);
}
