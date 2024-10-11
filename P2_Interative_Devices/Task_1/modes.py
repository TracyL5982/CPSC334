# Module 2 Task 1 by Tracy Li and Brandon Wu
# import the libraries
import RPi.GPIO as GPIO
from time import sleep
GPIO.setmode(GPIO.BCM)

# set the pin numbers to be used from Broadcom chip

xpin = 2 # pin for x movement of joystick
ypin = 3 # pin for y movement of joystick
pushpin = 17 # assign a variable name to pin 17
switchpin = 27 # assign pin 27 for switch
GPIO.setup(xpin, GPIO.IN) # set GPIO pin 2 as Input
GPIO.setup(ypin, GPIO.IN) # set GPIO pin 3 as Input
GPIO.setup(pushpin, GPIO.IN) # set GPIO pin 17 as Input
GPIO.setup(switchpin, GPIO.IN)


while True:
	if GPIO.input(switchpin) == 0:
		if GPIO.input(xpin) == 0:
			print("left state")
		elif GPIO.input(ypin) == 0:
			print("up state")
		else:
			print("other states")
	sleep(0.2)

