import serial
ser=serial.Serial('/dev/ttyUSB0',115200)
while True:
        readedText = ser.readline()
        print(readedText)
ser.close()
