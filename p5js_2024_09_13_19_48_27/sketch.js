let A, B, C, D;
let numPoints = 600; 
let rBase;
let points = [];
let pMax = 100; 
let baseRBase; 

let frequency = 0.02; 
let cycleDuration = 7200; 
let cycleProgress = 0; 
let prevHeartbeat = 0; 

function setup() {
  createCanvas(windowWidth, windowHeight); 
  background(0); 
  noFill();

  // Initialize De Jong attractor parameters with random values
  A = random(-2, 2);
  B = 1;
  C = random(-2, 2);
  D = 0.5;

  baseRBase = min(width, height) / 600 * random(0.75, 1.25) * PI;

  rBase = baseRBase; 

  // Generate points with random transparency
  for (let i = 0; i < numPoints; i++) {
    points.push(new Point(random(-2, 2), random(-2, 2), random(50, 255))); 
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); 
  background(0); 
}

function draw() {
  fill(0, 0, 0, 50); 
  rect(0, 0, width, height);

  // Update heartbeat frequency based on cycle progress
  cycleProgress = (frameCount % (2 * cycleDuration)) / cycleDuration;
  if (cycleProgress <= 1) {
    frequency = map(cycleProgress, 0, 1, 0.05, 0.1); // Gradually increase
  } else {
    frequency = map(cycleProgress, 1, 2, 0.1, 0.05); // Gradually decrease
  }

  // Heartbeat effect for rBase (expands and shrinks)
  let heartbeat = sin(frameCount * frequency); 
  rBase = baseRBase + heartbeat * baseRBase * 0.5; 
  prevHeartbeat = heartbeat;

  // Translate the origin to the center of the canvas and apply rotation over time
  translate(width / 2, height / 2);
  rotate(millis() * 0.0002); 

  // Update A and C over time for smoother animation
  A = 2 * sin(millis() * 0.00001); 
  C = 2 * cos(millis() * 0.000015); 

  // If we're halfway through drawing, adjust parameters to avoid convergence
  if (frameCount > floor(pMax * 0.6)) {
    A = random(-1, 1);
    B = random(-1, 1); 
    C = random(-1, 1);
    D = random(-1, 1);  
  }

  // Update and draw all points
  for (let pt of points) {
    pt.update();
    pt.show();
  }

}

// Point class to handle each individual point's movement
class Point {
  constructor(prevX, prevY, alphaValue) {
    this.prevX = prevX;
    this.prevY = prevY;
    this.alpha = alphaValue; 
  }

  // Update the point using De Jong attractor equations
  update() {
    let currX = sin(TWO_PI * A * this.prevY) - cos(TWO_PI * B * this.prevX);
    let currY = sin(TWO_PI * C * this.prevX) - cos(TWO_PI * D * this.prevY);

    // Polar Coordinates Transformation (with smaller scaling)
    let dX = width * 0.2 * currX; 
    let dY = height * 0.2 * currY;
    let dR = rBase * currY; 

    // Polar to Cartesian conversion
    this.scaledX = (dX * cos(dR) - dY * sin(dR)); 
    this.scaledY = (dY * cos(dR) + dX * sin(dR)); 

    // Update the previous position with current values
    this.prevX = currX;
    this.prevY = currY;
  }

  // Display the point as a white dot with random transparency
  show() {
    stroke(255, this.alpha); 
    strokeWeight(6);
    point(this.scaledX, this.scaledY); 
  }
}

