A Pair of pebbles. 
A squeeze. 
A buzz. 
A heartbeat saying “I miss you.”

The connection across distance is enabled by the communiation among ESP32, iPhone (iOS device), and AWS service. ESP32 pairs with iPhone through BLE (Bluetooth Low Energy). iOS App serves as the bridge between ESP32 and AWS web socket. When the button on ESP32 is pressed, iOS App will receive a notification and initiate an API call. AWS will then forward the message from iOS end to the other. The receiving iOS will parse out the message and start the vibrator on its corresponding ESP32 device. 

The BLE communication between ESP32 and iOS APP is achieved through consistent **service uuid** and **characteristic uuid**. The communication between iOS APP and AWS is achieved through unique **deviceIds**. (Both are hard-coded.)

