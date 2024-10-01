import pygame
import cv2
import serial
import sys
import time

# Initialize serial communication with ESP32
ser = serial.Serial('/dev/ttyUSB0', 115200)

# Path to the video file
VIDEO_PATH = "/home/student334/CPSC334/P2_Interative_Devices/SkySquare.mp4"

# Function to initialize Pygame and OpenCV to play the video
def play_video():
    # Initialize Pygame
    pygame.init()

    # Create a borderless window that fills the screen
    screen_width, screen_height = pygame.display.Info().current_w, pygame.display.Info().current_h
    screen = pygame.display.set_mode((screen_width, screen_height), pygame.NOFRAME | pygame.FULLSCREEN)
    
    # Set background color to black
    screen.fill((0, 0, 0))
    pygame.display.update()

    # Open the video using OpenCV
    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        print("Error: Could not open video.")
        return
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    video_length = total_frames / fps  # Total video length in seconds

    current_frame = 0

    def move_video(time_shift):
        nonlocal current_frame
        new_time = (current_frame / fps) + time_shift

        if new_time < 0:
            new_time = video_length + new_time  # Loop back if moving too far back
        elif new_time > video_length:
            new_time = new_time - video_length  # Loop forward if exceeding video length

        current_frame = int(new_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

    # Main loop to play the video frame-by-frame
    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            break

        # Convert the frame from OpenCV's BGR format to Pygame's RGB format
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_surface = pygame.surfarray.make_surface(frame_rgb)

        # Blit the video frame to the window
        screen.fill((0, 0, 0))  # Black background
        screen.blit(frame_surface, (0, 0))  # Fullscreen
        pygame.display.update()

        # Handle joystick input
        try:
            if ser.in_waiting > 0:
                readedText = ser.readline().decode('utf-8').strip()

                if readedText == "REST":
                    pass  # Do nothing if joystick is at rest
                else:
                    try:
                        joystick_value = int(readedText)
                        # If the value is below the center, move backward
                        if joystick_value < 2910:
                            speed = (2910 - joystick_value) / 2910 * 30  # Map to 0-30 seconds backward
                            move_video(-speed)
                        # If the value is above the center, move forward
                        elif joystick_value > 2920:
                            speed = (joystick_value - 2920) / (4095 - 2920) * 30  # Map to 0-30 seconds forward
                            move_video(speed)
                    except ValueError:
                        pass  # Ignore any invalid inputs
        except KeyboardInterrupt:
            cap.release()
            pygame.quit()
            sys.exit()

    cap.release()
    pygame.quit()

# Main loop to wait for play_video command
try:
    while True:
        # Read from the ESP32
        readedText = ser.readline().decode('utf-8').strip()

        # If "play_video" is received from ESP32, play the video
        if readedText == "play_video":
            play_video()

except KeyboardInterrupt:
    print("Exiting...")

finally:
    ser.close()

