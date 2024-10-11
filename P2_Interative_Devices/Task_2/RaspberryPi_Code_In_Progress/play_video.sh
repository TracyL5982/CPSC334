#!/bin/bash

VIDEO_PATH="/home/student334/CPSC334/P2_Interative_Devices/SkyMachineTimeLapseSmaller.mp4"

# Loop the video with VLC
export DISPLAY=:0
cvlc --fullscreen --loop "$VIDEO_PATH"

