# Virtual Heartbeat
Generative Art Project in p5.js

Link to Youtube Video: https://youtu.be/zcrOs2FX5zw

Virtual Heartbeat explores the tension between the artificial and the organic. It employs a meticulous, programmatic method to portray the signals of life. Inspired by De Jong alogrithm in polar coordinates, the heart composed of points embodies the simplicity and elegance of this algorithm. As the parameters change overtime, points form unexpected shapes from time to time, introducing irregularity and organic feeling. The ripples amplified the heartbeats, dissipating from crimson to indigo. 

# Usage:
Clone this GitHub repo to your Raspberry Pi. Plug any display device into the Raspberry Pi.
"cd" to this GitHub folder. Run "./upload_ip.sh".
A Firefox web page will automatically open up in full screen mode and play the generative art.

If you want it to run automatically whenever the Raspberry Pi reboots, copy the upload-ip.service file to "/etc/systemd/system" folder. 
Then do "sudo systemctl daemon-reload
sudo systemctl enable upload-ip.service
sudo systemctl status upload-ip.service"
