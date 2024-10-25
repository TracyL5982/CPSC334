let vid;
let playing = true;
let cloudDensity = 0.5;
let circleDiameter; 
let noiseOffsetX = 0;  
let noiseOffsetY = 0;
let socket;
let sensorData;

// use skyState to decide which video to play!

// NIGHT -- all photoresistors dark --> skyState = 0, night.mp4
// MORNING -- photoresistors on the east side brighter than the west side --> sometime in the morning
  // depending on the brightness, can be beforesunrise(darkest), sunrise, morning(brightest)
// NOON -- all photoresisters equally bright! --> noon
// AFTERNOON --photoresistors on the west side brighter then the east side --> sometime in the afternoon
  // depending on the brightness, can be aftersunset(darkest), sunset, afternoon(brightest)


// LIGHT IS BETWEEN 0 - 3800
// TEMPERATURE IS BETWEEN 0 - 100 (C)
// HUMIDITY IS BETWEEN 0 - 100 (%)
// Variables to store the parsed sensor data
let light1, light2, light3, light4, temperature, humidity, pressure, altitude;

let skyState = 5;
let videoFiles = ['night.mp4', 'beforesunrise.mp4', 'sunrise.mp4', 'morning.mp4', 'noon.mp4', 'afternoon.mp4', 'sunset.mp4', 'aftersunset.mp4'];

function setup() {
  createCanvas(windowWidth, windowHeight); 
  background(0); 
  console.log("Canvas size (width x height):", width, "x", height);
  circleDiameter = min(width, height) / 2;
  loadVideoForSkyState();

  socket = new WebSocket('ws://localhost:8765');
  socket.onmessage = function(event) {
    sensorData = event.data;
    console.log(`Received raw sensor data: ${sensorData}`);

    parseSensorData(sensorData);
  };

  socket.onopen = function() {
    console.log('WebSocket connection established');
  };

  socket.onclose = function() {
    console.log('WebSocket connection closed');
  };
}

function draw() {
  background(0); 
  let img = vid.get();
  let xCenter = (width - circleDiameter) / 2;
  let yCenter = (height - circleDiameter) / 2;
  image(img, xCenter, yCenter, circleDiameter, circleDiameter); 
  drawClouds(xCenter, yCenter);

  noiseOffsetX += random(-0.002, 0.005);
  noiseOffsetY += random(-0.002, 0.005);
}

function parseSensorData(data) {
  // Split the data string into an array of values
  let parts = data.split(',');

  // Check if the data string has the expected number of values
  if (parts.length === 8) {
    light1 = parseFloat(parts[0]);
    light2 = parseFloat(parts[1]);
    light3 = parseFloat(parts[2]);
    light4 = parseFloat(parts[3]);
    temperature = parseFloat(parts[4]);
    humidity = parseFloat(parts[5]);
    pressure = parseFloat(parts[6]);
    altitude = parseFloat(parts[7]);

    // Default to average values if NaN is detected
    light1 = isNaN(light1) ? 1900 : light1;
    light2 = isNaN(light2) ? 1900 : light2;
    light3 = isNaN(light3) ? 1900 : light3;
    light4 = isNaN(light4) ? 1900 : light4;
    temperature = isNaN(temperature) ? 12.45 : temperature;
    humidity = isNaN(humidity) ? 50 : humidity;
    pressure = isNaN(pressure) ? 1013.25 : pressure;
    altitude = isNaN(altitude) ? 100 : altitude;

    console.log(`Parsed values - Light1: ${light1}, Light2: ${light2}, Light3: ${light3}, Light4: ${light4}, Temperature: ${temperature}, Humidity: ${humidity}, Pressure: ${pressure}, Altitude: ${altitude}`);

    cloudDensity = map(humidity, 0, 100, 0, 1); // not sure if this works right now, but maps humidity to 0 to 1
  } else {
    console.warn(`Unexpected data format: ${data} (length: ${parts.length})`);
  }
}


function drawClouds(xCenter, yCenter) {
  colorMode(RGB); 
  noStroke();

  let cloudRadius = circleDiameter / 2;
  let pixelSize = circleDiameter / 200; 

  for (let i = 0; i < 500; i++) { 
    for (let j = 0; j < 500; j++) { 
      let ran = noise(i / 50 + noiseOffsetX, j / 50 + noiseOffsetY); 
      let cloudColor = map(ran, 0, 1, 0, 255); 
      
      let x = map(i, 0, 200, -cloudRadius, cloudRadius);
      let y = map(j, 0, 200, -cloudRadius, cloudRadius);
      
      if (dist(x, y, 0, 0) < cloudRadius) {
        if (skyState == 0) {
          fill(0, 0, 0, cloudColor * cloudDensity); 
        } else {
          fill(255, 255, 255, cloudColor * cloudDensity); 
        }
        rect(xCenter + cloudRadius + x, yCenter + cloudRadius + y, pixelSize, pixelSize); 
      }
    }
  }
}

function loadVideoForSkyState() {
  if (vid) {
    vid.remove();
  }
  vid = createVideo(videoFiles[skyState]);
  vid.size(circleDiameter, circleDiameter); 
  vid.volume(0);
  vid.loop();
  vid.hide();
}

function mousePressed() {
  if (playing) {
    vid.pause();
  } else {
    vid.play();
  }
  playing = !playing;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); 
  draw(); 
}
