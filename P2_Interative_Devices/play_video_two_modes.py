import pygame
import cv2
import serial
import sys
import time

# Initialize serial communication with ESP32
ser = serial.Serial('/dev/ttyUSB0', 115200)

# Path to the video file
VIDEO_PATH = "/home/student334/CPSC334/P2_Interative_Devices/SkySquare.mp4"

# Initialize state variables
playing = False

# Distance to move the video when the joystick is at its extremes (0 or 4095)
move_distance = 10  # Adjust this value based on how far you want the video to move

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
    
    # Get the original dimensions of the video
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Ensure that the video is square, adjusting for any irregularities
    video_size = min(original_width, original_height)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    video_length = total_frames / fps  # Total video length in seconds

    current_frame = 0

    # Initial video position (center of the screen)
    x_position = (screen_width // 2) - (video_size // 2)
    y_position = (screen_height // 2) - (video_size // 2)

    # Function to move the video forward/backward in time
    def move_video(time_shift):
        nonlocal current_frame
        new_time = (current_frame / fps) + time_shift

        if new_time < 0:
            new_time = video_length + new_time  # Loop back if moving too far back
        elif new_time > video_length:
            new_time = new_time - video_length  # Loop forward if exceeding video length

        current_frame = int(new_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

    # Function to calculate the movement distance based on joystick input
    def calculate_movement(joystick_value, axis):
        if axis == "x":
            # Move left if joystick_value is less than 2910, right if more than 2920
            if joystick_value < 2910:
                return -((2910 - joystick_value) / 2910) * move_distance
            elif joystick_value > 2920:
                return ((joystick_value - 2920) / (4095 - 2920)) * move_distance
        elif axis == "y":
            # Move up if joystick_value is less than 2840, down if more than 2850
            if joystick_value < 2840:
                return -((2840 - joystick_value) / 2840) * move_distance
            elif joystick_value > 2850:
                return ((joystick_value - 2850) / (4095 - 2850)) * move_distance
        return 0  # No movement if joystick is in the REST range

    # Main loop to play the video frame-by-frame
    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            break

        # Convert the frame from OpenCV's BGR format to Pygame's RGB format
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_surface = pygame.surfarray.make_surface(frame_rgb)
        
        # Ensure the video remains square, scale to its original size or adjusted size
        frame_surface = pygame.transform.scale(frame_surface, (video_size, video_size))

        # Read input from ESP32 (only if playing is True)
        if playing and ser.in_waiting > 0:
            readedText = ser.readline().decode('utf-8').strip()

            if readedText.startswith("POS"):
                # Mode A: Split and get the joystick X and Y values
                try:
                    parts = readedText.replace(",", " ").split()
                    if len(parts) == 3:
                        joystickXValue = int(parts[1])
                        joystickYValue = int(parts[2])

                        # Calculate movement based on joystick X and Y values
                        x_position += calculate_movement(joystickXValue, "x")
                        y_position += calculate_movement(joystickYValue, "y")

                        # Ensure the video doesn't go off-screen
                        x_position = max(0, min(x_position, screen_width - video_size))
                        y_position = max(0, min(y_position, screen_height - video_size))

                    else:
                        print(f"Error parsing joystick positions: {readedText}")

                except ValueError:
                    print(f"Error parsing joystick positions: {readedText}")

            elif readedText == "REST":
                pass  # Do nothing when in resting state

            else:
                try:
                    # Mode B: Assume this is the joystick X value to control the video time
                    joystick_value = int(readedText)
                    if joystick_value < 2910:
                        speed = (2910 - joystick_value) / 2910 * 30  # Map to 0-30 seconds backward
                        move_video(-speed)
                    elif joystick_value > 2920:
                        speed = (joystick_value - 2920) / (4095 - 2920) * 30  # Map to 0-30 seconds forward
                        move_video(speed)
                except ValueError:
                    pass  # Ignore any invalid inputs

        # Blit the video frame to the window at the updated position
        screen.fill((0, 0, 0))  # Black background
        screen.blit(frame_surface, (x_position, y_position))  # Update video position
        pygame.display.update()

        # Handle quit events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                cap.release()
                pygame.quit()
                sys.exit()

    cap.release()
    pygame.quit()

# Main loop to wait for play_video command
try:
    while True:
        # Wait for "play_video" command from ESP32 if not playing
        if not playing:
            if ser.in_waiting > 0:
                readedText = ser.readline().decode('utf-8').strip()

                # Start video playback when "play_video" is received
                if readedText == "play_video":
                    playing = True
                    play_video()

except KeyboardInterrupt:
    print("Exiting...")

finally:
    ser.close()
