import pygame
import cv2
import serial
import sys

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

    # Main loop to play the video frame-by-frame
    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            break

        # Convert the frame from OpenCV's BGR format to Pygame's RGB format
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_surface = pygame.surfarray.make_surface(frame_rgb)

        # Resize the video to 1/4th of the screen
        frame_surface = pygame.transform.scale(frame_surface, (screen_width // 4, screen_height // 4))

        # Blit the video frame to the window at the top-left corner
        screen.fill((0, 0, 0))  # Black background
        screen.blit(frame_surface, (0, 0))  # Top-left corner
        pygame.display.update()

        # Handle quit events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                cap.release()
                pygame.quit()
                sys.exit()

    cap.release()
    pygame.quit()

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
