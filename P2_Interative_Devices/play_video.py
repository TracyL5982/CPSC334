import serial
import os
import time

# Set up the serial connection to the ESP32
ser = serial.Serial('/dev/ttyUSB0', 115200)

# Path to the video file
VIDEO_PATH = "/home/student334/CPSC334/P2_Interative_Devices/SkyMachineTimeLapseSmaller.mp4"

# Function to play the video
def play_video():
    print("Playing video...")
    os.system(f"export DISPLAY=:0 && cvlc --fullscreen --loop {VIDEO_PATH}")

try:
    while True:
        # Read the line from the serial input
        readedText = ser.readline().decode('utf-8').strip()
        
        # Check if the ESP32 has sent the "play_video" message
        if readedText == "play_video":
            play_video()
        time.sleep(0.1)

except KeyboardInterrupt:
    print("Exiting...")

finally:
    ser.close()

