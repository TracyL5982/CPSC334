When you enter an interior space, your remaining connection with the outside world, with light, with sky is the window. 
Through openings and occlusions, the architect frames your view, frames your light for you. 
The world is no longer vast, endless, overwhelming. 
It becomes the rectangular space on your wall. 

There’s the unique comfort in seeing the world through a rectangle. 
When your view is limited, your eyes could more easily find an anchor point. 
When the visual information is purer, the senses are purer. 
You could more keenly observe the the color of the sky, the growth of the tree, 
the volume and quality of light shifting across time as light patches and shadows travel around your room. 

After looking at the same opening for a period of time, you cultivate a sense of intimacy with this tiny patch of the world. 
The rectangle on the wall brings a patch of the world into your territory. 
Through the window, we find comfort and intimacy in the vast, fleeting outside world and experience the immensity within us.

From James Turell’s Sky Space to Olafur Elliasson’s Weather Project, there’s the attempt to bring the Sun, the sky into our territory and to build a space of pure senses. 
Viewers described their experiences to be transcending as they, in the position of looking at the Sun moving across the room, 
are reminded of their own position as a creature located on Earth, spining around the Sun. 

Through Your Sky Machine, I hope to pack this experience into a portable 6*6*4” box and carry it with me. 
In a similar way that Olafur Elliasson always makes the mechanism and the construction of the “man-made nature” transparent to the viewers, 
Your Sky Machine is not trying to act as a mysterious magic box or trick people into believing the “man-made sky” is real. 
The focus is on the pure senses, perceptions, and experiences.

Notion Page: https://www.notion.so/Your-Sky-Machine-11459c88764b80989e15f99305e65aff

## **Instructions**

1. Check the circuit connection
    1. ESP32 connected to Raspberry Pi through the mini USB to USB-A.
    2. Power cable plugged into Raspberry Pi.
    3. Raspberry Pi connected to an external display through hdmi (ideally a projector)
    4. Joystick, button, switch should be properly connected to the ESP32 (pins are defined as such in my code)
        
        ```arduino
        #define BUTTON_PIN 14  
        #define JOYSTICK_X_PIN 27
        #define JOYSTICK_Y_PIN 26
        #define SWITCH_PIN 12 
        ```
        
2. Run the program
    1. Might need to install a virtual Python environment to run
    
    ```arduino
    python3 -m venv .venv
    source .venv/bin/activate
    
    python3 play_video_two_modes.py
    ```
    
3. Press the button the play the video
4. The Switch toggles between two modes — shifting in time and shifting in space. In Mode A, the joystick is responsible for moving the sky space across the display screen. In Mode B, the x axis on the joystick functions as a timeline. It will rewind the forward time accordingly. 
5. Control+C to exit
6. sudo shutdown -h now to shut down the Raspberry Pi
