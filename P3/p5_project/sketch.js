let vid;
let playing = true;
let cloudDensity = 0.5;
let circleDiameter; 
let noiseOffsetX = 0;  
let noiseOffsetY = 0; 

// use skyState to decide which video to play!

// NIGHT -- all photoresistors dark --> skyState = 0, night.mp4
// MORNING -- photoresistors on the east side brighter than the west side --> sometime in the morning
  // depending on the brightness, can be beforesunrise(darkest), sunrise, morning(brightest)
// NOON -- all photoresisters equally bright! --> noon
// AFTERNOON --photoresistors on the west side brighter then the east side --> sometime in the afternoon
  // depending on the brightness, can be aftersunset(darkest), sunset, afternoon(brightest)

let skyState = 2;
let videoFiles = ['night.mp4', 'beforesunrise.mp4', 'sunrise.mp4', 'morning.mp4', 'noon.mp4', 'afternoon.mp4', 'sunset.mp4', 'aftersunset.mp4'];

function setup() {
  createCanvas(windowWidth, windowHeight); 
  background(0); 
  console.log("Canvas size (width x height):", width, "x", height);
  circleDiameter = min(width, height) / 2;
  loadVideoForSkyState();
}

function draw() {
  background(0); 
  let img = vid.get();
  let xCenter = (width - circleDiameter) / 2;
  let yCenter = (height - circleDiameter) / 2;
  image(img, xCenter, yCenter, circleDiameter, circleDiameter); 
  drawClouds(xCenter, yCenter);

  noiseOffsetX += random (-0.002, 0.005);
  noiseOffsetY += random (-0.002, 0.005);
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
