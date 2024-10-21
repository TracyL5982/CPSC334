let vid;
let playing = true;
let cloudDensity = 0.5;
let circleDiameter; 

function setup() {
  createCanvas(windowWidth, windowHeight); 
  background(0); 
  console.log("Canvas size (width x height):", width, "x", height);
  circleDiameter = min(width, height) / 2;

  vid = createVideo('square.mp4');
  vid.size(circleDiameter, circleDiameter); 
  vid.volume(0);
  vid.loop();
  vid.hide();
}

function draw() {
  background(0); 
  let img = vid.get();
  let xCenter = (width - circleDiameter) / 2;
  let yCenter = (height - circleDiameter) / 2;
  image(img, xCenter, yCenter, circleDiameter, circleDiameter); 
  drawClouds(xCenter, yCenter);
}

function drawSmoothClouds(xCenter, yCenter) {
  let cloudRadius = circleDiameter / 2;

  loadPixels(); 

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let distFromCenter = dist(x, y, xCenter + cloudRadius, yCenter + cloudRadius);
      
      if (distFromCenter < cloudRadius) {
        let noiseValue = noise(x * 0.01, y * 0.01); 
        let alphaValue = map(noiseValue, 0, 1, 0, 255); 

        let pixelIndex = (x + y * width) * 4;
        pixels[pixelIndex] = 255; 
        pixels[pixelIndex + 1] = 255; 
        pixels[pixelIndex + 2] = 255; 
        pixels[pixelIndex + 3] = alphaValue * cloudDensity; 
      }
    }
  }

  updatePixels(); 
}

function drawClouds(xCenter, yCenter) {
  colorMode(RGB); 
  noStroke();

  let cloudRadius = circleDiameter / 2;
  let pixelSize = circleDiameter / 300; 

  for (let i = 0; i < 500; i++) { 
    for (let j = 0; j < 500; j++) { 
      let ran = noise(i / 50, j / 50); 
      let cloudColor = map(ran, 0, 1, 0, 255); 
      
      let x = map(i, 0, 200, -cloudRadius, cloudRadius);
      let y = map(j, 0, 200, -cloudRadius, cloudRadius);
      
      if (dist(x, y, 0, 0) < cloudRadius) {
        fill(255, 255, 255, cloudColor * cloudDensity); 
        rect(xCenter + cloudRadius + x, yCenter + cloudRadius + y, pixelSize, pixelSize); 
      }
    }
  }
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
