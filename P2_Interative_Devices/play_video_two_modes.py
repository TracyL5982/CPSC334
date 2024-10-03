import pygame
import cv2
import serial
import sys
import os

os.environ["DISPLAY"] = ":0"  

ser = serial.Serial('/dev/ttyUSB0', 115200)

VIDEO_PATH = "/home/student334/CPSC334/P2_Interative_Devices/Sky_450_900.mp4"

playing = False  
mode = "A"       
move_distance = 10  

def play_video():
    global playing, mode 
    pygame.init()
    screen_width, screen_height = pygame.display.Info().current_w, pygame.display.Info().current_h
    print(f"Screen resolution: {screen_width}x{screen_height}")  
    screen = pygame.display.set_mode((screen_width, screen_height), pygame.NOFRAME | pygame.FULLSCREEN)
    screen.fill((0, 0, 0))
    pygame.display.update()
    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        print(f"Error: Could not open video at {VIDEO_PATH}.")
        return  
    
    print("Video opened successfully")

    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    video_size = min(original_width, original_height)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    video_length = total_frames / fps  

    current_frame = 0

    x_position = (screen_width // 2) - (video_size // 2)
    y_position = (screen_height // 2) - (video_size // 2)

    print(f"Initial video position: {x_position}, {y_position}") 

    def move_video(time_shift):
        nonlocal current_frame
        print(f"Moving video by {time_shift} seconds")  
        new_time = (current_frame / fps) + time_shift
        
        if new_time < 0:
            new_time = video_length + new_time  
        elif new_time > video_length:
            new_time = new_time - video_length  

        print(f"Setting video time to: {new_time} seconds (frame: {int(new_time * fps)})")  
        current_frame = int(new_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

    def calculate_movement(joystick_value, axis):
        if axis == "x":
            if joystick_value < 2907:
                return -((2907 - joystick_value) / 2907) * move_distance  
            elif joystick_value > 2917:
                return ((joystick_value - 2917) / (4095 - 2917)) * move_distance  
        elif axis == "y":
            if joystick_value < 1245:
                return ((1245 - joystick_value) / 1245) * move_distance  
            elif joystick_value > 1255:
                return -((joystick_value - 1255) / (4095 - 1255)) * move_distance  
        return 0  

    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            print("End of video or error reading frame. Looping video.")
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  
            continue  

        frame_rotated = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        frame_rgb = cv2.cvtColor(frame_rotated, cv2.COLOR_BGR2RGB)
        frame_surface = pygame.surfarray.make_surface(frame_rgb)
        frame_surface = pygame.transform.scale(frame_surface, (video_size, video_size))
        screen.fill((0, 0, 0))  
        screen.blit(frame_surface, (x_position, y_position))  
        pygame.display.update()
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                cap.release()
                pygame.quit()
                sys.exit()

        if ser.in_waiting > 0:
            readedText = ser.readline().decode('utf-8').strip()

            if readedText == "REST":
                pass  

            elif "MODE A" in readedText:
                mode = "A"  
                print("Switched to MODE A")

            elif "MODE B" in readedText:
                mode = "B"  
                print("Switched to MODE B")

            if mode == "A" and readedText.startswith("POS"):
                try:
                    parts = readedText.replace(",", " ").split()
                    if len(parts) == 3:
                        joystickXValue = int(parts[1])
                        joystickYValue = int(parts[2])

                        print(f"Joystick X: {joystickXValue}, Y: {joystickYValue}")  

                        x_position += calculate_movement(joystickXValue, "x")
                        y_position += calculate_movement(joystickYValue, "y")

                        x_position = max(0, min(x_position, screen_width - video_size))
                        y_position = max(0, min(y_position, screen_height - video_size))
                    else:
                        print(f"Error parsing joystick positions: {readedText}")

                except ValueError:
                    print(f"Error parsing joystick positions: {readedText}")

            elif mode == "B":
                try:
                    joystickXValue = int(readedText)  

                    print(f"Joystick X: {joystickXValue} in Mode B")  

                    if joystickXValue < 2907:
                        time_shift = -(2907 - joystickXValue) / 2907 * 20  
                        print(f"Rewinding video: {time_shift} seconds")  
                        move_video(time_shift)
                    elif joystickXValue > 2917:
                        time_shift = (joystickXValue - 2917) / (4095 - 2917) * 20  
                        print(f"Forwarding video: {time_shift} seconds")  
                        move_video(time_shift)

                except ValueError:
                    print(f"Error parsing joystick X value in Mode B: {readedText}")

    cap.release()
    pygame.quit()

try:
    while True:
        if not playing and ser.in_waiting > 0:
            readedText = ser.readline().decode('utf-8').strip()
            if "play_video" in readedText:
                print("Starting video playback")
                playing = True
                play_video()
                playing = False

except KeyboardInterrupt:
    print("Exiting...")

finally:
    ser.close()
