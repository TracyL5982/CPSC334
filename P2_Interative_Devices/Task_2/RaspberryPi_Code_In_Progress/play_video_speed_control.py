import pygame
import cv2
import serial
import sys
import time

ser = serial.Serial('/dev/ttyUSB0', 115200)

VIDEO_PATH = "/home/student334/CPSC334/P2_Interative_Devices/SkySquare.mp4"

def play_video():
    pygame.init()
    screen_width, screen_height = pygame.display.Info().current_w, pygame.display.Info().current_h
    screen = pygame.display.set_mode((screen_width, screen_height), pygame.NOFRAME | pygame.FULLSCREEN)
    screen.fill((0, 0, 0))
    pygame.display.update()
    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        print("Error: Could not open video.")
        return
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    video_length = total_frames / fps  

    current_frame = 0

    def move_video(time_shift):
        nonlocal current_frame
        new_time = (current_frame / fps) + time_shift

        if new_time < 0:
            new_time = video_length + new_time 
        elif new_time > video_length:
            new_time = new_time - video_length 

        current_frame = int(new_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            break

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_surface = pygame.surfarray.make_surface(frame_rgb)

        screen.fill((0, 0, 0))  
        screen.blit(frame_surface, (0, 0))  
        pygame.display.update()

        try:
            if ser.in_waiting > 0:
                readedText = ser.readline().decode('utf-8').strip()

                if readedText == "REST":
                    pass  
                else:
                    try:
                        joystick_value = int(readedText)
                        if joystick_value < 2910:
                            speed = (2910 - joystick_value) / 2910 * 30  
                            move_video(-speed)
                        elif joystick_value > 2920:
                            speed = (joystick_value - 2920) / (4095 - 2920) * 30  
                            move_video(speed)
                    except ValueError:
                        pass 
        except KeyboardInterrupt:
            cap.release()
            pygame.quit()
            sys.exit()

    cap.release()
    pygame.quit()

try:
    while True:
        readedText = ser.readline().decode('utf-8').strip()
        if readedText == "play_video":
            play_video()

except KeyboardInterrupt:
    print("Exiting...")

finally:
    ser.close()
