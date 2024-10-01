import pygame
import cv2
import serial
import sys
import os

# Set the display environment to ensure it's directed to the correct screen
os.environ["DISPLAY"] = ":0"  # Adjust if your external screen is on another display

# Initialize serial communication with ESP32
ser = serial.Serial('/dev/ttyUSB0', 115200)

# Path to the video file
VIDEO_PATH = "/home/student334/CPSC334/P2_Interative_Devices/SkyMachineSlow.mp4"

# Initialize state variables
playing = False  # Global variable to track whether video is playing
mode = "A"       # Mode A (move video) or Mode B (control time)
move_distance = 10  # Distance to move the video when joystick is at its extremes (0 or 4095)

# Function to ensure the video is displayed as a square
def ensure_square_dimensions(width, height):
    # Force the video to be square by taking the smaller dimension
    video_size = min(width, height)
    return video_size, video_size

# Function to initialize Pygame and OpenCV to play the video
def play_video():
    global playing, mode  # Declare that we are using the global playing and mode variables

    # Initialize Pygame
    pygame.init()

    # Create a borderless window that fills the screen
    screen_width, screen_height = pygame.display.Info().current_w, pygame.display.Info().current_h
    print(f"Screen resolution: {screen_width}x{screen_height}")  # Debugging screen size
    screen = pygame.display.set_mode((screen_width, screen_height), pygame.NOFRAME | pygame.FULLSCREEN)
    
    # Set background color to black
    screen.fill((0, 0, 0))
    pygame.display.update()

    # Open the video using OpenCV
    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        print(f"Error: Could not open video at {VIDEO_PATH}.")
        return  # Exit function if video can't be opened
    
    print("Video opened successfully")

    # Get the original dimensions of the video
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Ensure the video is square, adjust for any irregularities
    video_width, video_height = ensure_square_dimensions(original_width, original_height)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    video_length = total_frames / fps  # Total video length in seconds

    current_frame = 0

    # Initial video position (center of the screen)
    x_position = (screen_width // 2) - (video_width // 2)
    y_position = (screen_height // 2) - (video_height // 2)

    print(f"Initial video position: {x_position}, {y_position}")  # Debug video position

    # Function to move the video forward/backward in time
    def move_video(time_shift):
        nonlocal current_frame
        print(f"Moving video by {time_shift} seconds")  # Debugging time shift
        new_time = (current_frame / fps) + time_shift

        # Loop the video if it goes beyond the start or end
        if new_time < 0:
            new_time = video_length + new_time  # Loop back if moving too far back
        elif new_time > video_length:
            new_time = new_time - video_length  # Loop forward if exceeding video length

        print(f"Setting video time to: {new_time} seconds (frame: {int(new_time * fps)})")  # Debug current time
        current_frame = int(new_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

    # Function to calculate the movement distance based on joystick input (new ranges)
    def calculate_movement(joystick_value, axis):
        if axis == "x":
            # Use 2907-2917 as the rest range for X-axis
            if joystick_value < 2907:
                return -((2907 - joystick_value) / 2907) * move_distance  # Move left
            elif joystick_value > 2917:
                return ((joystick_value - 2917) / (4095 - 2917)) * move_distance  # Move right
        elif axis == "y":
            # Reverse the Y-axis movement (so upward joystick movement moves video upwards)
            if joystick_value < 1245:
                return ((1245 - joystick_value) / 1245) * move_distance  # Move up
            elif joystick_value > 1255:
                return -((joystick_value - 1255) / (4095 - 1255)) * move_distance  # Move down
        return 0  # No movement if joystick is in the REST range

    # Main loop to play the video frame-by-frame
    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            print("End of video or error reading frame. Looping video.")
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Reset video to start
            continue  # Start video loop

        # Rotate the frame 90 degrees clockwise using OpenCV
        frame_rotated = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)

        # Convert the frame from OpenCV's BGR format to Pygame's RGB format
        frame_rgb = cv2.cvtColor(frame_rotated, cv2.COLOR_BGR2RGB)
        frame_surface = pygame.surfarray.make_surface(frame_rgb)
        
        # Scale the video to ensure it remains square
        frame_surface = pygame.transform.scale(frame_surface, (video_width, video_height))

        # Blit the video frame to the window at the updated position
        screen.fill((0, 0, 0))  # Black background
        screen.blit(frame_surface, (x_position, y_position))  # Update video position
        pygame.display.update()

        # Force update display to ensure frames are rendered
        pygame.display.flip()

        # Handle quit events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                cap.release()
                pygame.quit()
                sys.exit()

        # Process joystick and switch input from ESP32
        if ser.in_waiting > 0:
            readedText = ser.readline().decode('utf-8').strip()

            if readedText == "REST":
                pass  # Do nothing when in resting state

            elif "MODE A" in readedText:
                mode = "A"  # Switch to Mode A
                print("Switched to MODE A")

            elif "MODE B" in readedText:
                mode = "B"  # Switch to Mode B
                print("Switched to MODE B")

            if mode == "A" and readedText.startswith("POS"):
                # Handle Mode A (moving the video)
                try:
                    parts = readedText.replace(",", " ").split()
                    if len(parts) == 3:
                        joystickXValue = int(parts[1])
                        joystickYValue = int(parts[2])

                        print(f"Joystick X: {joystickXValue}, Y: {joystickYValue}")  # Debugging joystick input

                        x_position += calculate_movement(joystickXValue, "x")
                        y_position += calculate_movement(joystickYValue, "y")

                        # Ensure the video doesn't go off-screen
                        x_position = max(0, min(x_position, screen_width - video_width))
                        y_position = max(0, min(y_position, screen_height - video_height))
                    else:
                        print(f"Error parsing joystick positions: {readedText}")

                except ValueError:
                    print(f"Error parsing joystick positions: {readedText}")

            elif mode == "B":
                # Handle Mode B (controlling video time)
                try:
                    joystickXValue = int(readedText)  # Only the X value is sent in Mode B

                    print(f"Joystick X: {joystickXValue} in Mode B")  # Debugging joystick input in Mode B

                    if joystickXValue < 2910:
                        time_shift = -(2910 - joystickXValue) / 2910 * 20  # Rewind up to 20 seconds
                        print(f"Rewinding video: {time_shift} seconds")  # Debug rewind
                        move_video(time_shift)
                    elif joystickXValue > 2920:
                        time_shift = (joystickXValue - 2920) / (4095 - 2920) * 20  # Forward up to 20 seconds
                        print(f"Forwarding video: {time_shift} seconds")  # Debug forward
                        move_video(time_shift)

                except ValueError:
                    print(f"Error parsing joystick X value in Mode B: {readedText}")

    # Release the video once finished
    cap.release()
    pygame.quit()

# Main loop to wait for play_video command
try:
    while True:
        # Wait for "play_video" command from ESP32 if not playing
        if not playing and ser.in_waiting > 0:
            readedText = ser.readline().decode('utf-8').strip()

            # Check if "play_video" is mixed in with other messages
            if "play_video" in readedText:
                print("Starting video playback")
                playing = True
                play_video()
                # After playing the video, reset playing to False to allow future playback
                playing = False

except KeyboardInterrupt:
    print("Exiting...")

finally:
    ser.close()
