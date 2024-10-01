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
VIDEO_PATH = "/home/student334/CPSC334/P2_Interative_Devices/SkySquareSlow.mp4"

# Initialize state variables
playing = False  # Global variable to track whether video is playing

# Distance to move the video when the joystick is at its extremes (0 or 4095)
move_distance = 10  # Adjust this value based on how far you want the video to move

# Function to initialize Pygame and OpenCV to play the video
def play_video():
    global playing  # Declare that we are using the global playing variable

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

    # Ensure that the video is square, adjusting for any irregularities
    video_size = min(original_width, original_height)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    video_length = total_frames / fps  # Total video length in seconds

    current_frame = 0

    # Initial video position (center of the screen)
    x_position = (screen_width // 2) - (video_size // 2)
    y_position = (screen_height // 2) - (video_size // 2)

    print(f"Initial video position: {x_position}, {y_position}")  # Debug video position

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

    # Main loop to play the video frame-by-frame
    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            print("End of video or error reading frame.")
            break  # Exit loop if there is no frame to read

        # Rotate the frame 90 degrees clockwise using OpenCV
        frame_rotated = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)

        # Convert the frame from OpenCV's BGR format to Pygame's RGB format
        frame_rgb = cv2.cvtColor(frame_rotated, cv2.COLOR_BGR2RGB)
        frame_surface = pygame.surfarray.make_surface(frame_rgb)
        
        # Ensure the video remains square, scale to its original size or adjusted size
        frame_surface = pygame.transform.scale(frame_surface, (video_size, video_size))

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
