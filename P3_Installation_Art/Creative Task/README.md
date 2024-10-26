# Foxy's Adventure
TBD

# Links
- Starting on Boot: 
- 

# Usage
This project was designed to be compatible with a Raspberry Pi, so some of these instructions are directly related to running it on boot for your Pi. This project is of course usable without a Pi, given that you run it on some Linux system (we were developing this on primarily on Mac and WSL), and you may disregard any instructions as you see fit. You can simply run `play.sh` in the scripts directory to run it on your local machine.


1. Clone this repo into your Raspberry Pi (or whatever local machine).
2. Install dependencies. The main ones for this game are:
  - `sudo apt install unclutter`
  - `sudo apt install python3-websockets`
3. cd into the `"/CPSC334/P3_Installation_Art/Creative Task/scripts"` folder and run `sudo chmod +x play.sh`
4. Upload the `test.ino` file to your ESP-32.
5. To play the sky manually, you can simply run `./play.sh`.
6. To run this program on boot of the Raspberry pi:
    - cd into the `/etc/systemd/system` folder and run `sudo nano play-sky.service`. You can simply copy the contents of `"/CPSC334/P3_Installation_Art/Creative Task/scripts/play-sky.service"` here, and changing thje relevant file paths and directories.
    - Do the following commands:
        - `sudo systemctl daemon-reload`
        - `sudo systemctl enable play-sky.service`
    - Do the following commands:
        - `sudo systemctl start play-sky.service`
        - `sudo systemctl status play-sky.service`
7. You should now be able to reboot your Pi, and this program will start on boot (see video to see that process working in live video)


# Citations

