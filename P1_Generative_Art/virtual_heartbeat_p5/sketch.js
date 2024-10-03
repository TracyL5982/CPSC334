//CPSC 334 Generative Art Project
//By Tracy Xinran Li

let A, B, C, D;
let numPoints = 500; 
let rBase;
let points = [];
let ripples = []; 
let pMax = 50; 
let baseRBase; 

let frequency = 0.02; 
let cycleDuration = 7200; 
let cycleProgress = 0; 
let prevHeartbeat = 0; 

function setup() {
  createCanvas(windowWidth, windowHeight); 
  background(0); 
  noFill();
  
  let density = displayDensity();
  pixelDensity(density); 

  // Initialize De Jong attractor parameters with random values
  A = random(-2, 2);
  B = 1;
  C = random(-2, 2);
  D = 0.5;

  // Conditional: Set rBase based on the smaller of width/height for proportional heart size
  baseRBase = min(width, height) / 600 * random(0.75, 1.25) * PI;

  rBase = baseRBase; 

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
    frequency = map(cycleProgress, 0, 1, 0.05, 0.1); 
  } else {
    frequency = map(cycleProgress, 1, 2, 0.1, 0.05); 
  }

  let heartbeat = sin(frameCount * frequency); 
  rBase = baseRBase + heartbeat * baseRBase * 0.5; 

  if (prevHeartbeat < -0.98 && heartbeat > -0.99) {
    // Create a ripple when the heart starts expanding
    createRipple();
  }
  prevHeartbeat = heartbeat;

  // Translate the origin to the center of the canvas and apply rotation over time
  translate(width / 2, height / 2);
  rotate(millis() * 0.0002); 

  // Update A and C over time for smoother animation
  A = 2 * sin(millis() * 0.00001); 
  C = 2 * cos(millis() * 0.000015); 

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

  // Update and draw all ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].show();
    if (ripples[i].isDone()) {
      ripples.splice(i, 1);
    }
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

    // Conditional: Polar Coordinates Transformation (with smaller scaling)
    let dX = min(width, height) * 0.2 * currX; 
    let dY = min(width, height) * 0.2 * currY;
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
    //conditional: strokeSize changes with min(width, height)
    let strokeSize = min(width, height)/200; 
    stroke(200, 0, 60, this.alpha);
    strokeWeight(strokeSize); 
    point(this.scaledX, this.scaledY); 
  }
}

// Ripple class to create the ripple effect
class Ripple {
  constructor() {
    this.points = [];
    this.lifetime = 500; 

    // Conditional: Ripple radius proportional to the smaller dimension of width and height
    this.radius = min(width, height) * 0.25; 

    // Random rotation angle for the ripple
    this.rotationAngle = random(TWO_PI);

    // Generate points along the circle's perimeter
    for (let i = 0; i < 50; i++) {
      let angle = noise(i * 0.1) * TWO_PI;
      let x = this.radius * cos(angle);
      let y = this.radius * sin(angle);

      let direction = createVector(x, y);
      direction.normalize(); 

      this.points.push({
        x: x,
        y: y,
        direction: direction,
        //Conditional: speed in proportion to min(width, height)
        speed: random(0.5, 1) * min(width, height) * 0.0025,
        initialAlpha: random(100, 255), 
        currentAlpha: 255, 
        birthFrame: frameCount, 
      });
    }
  }

  update() {
    // Update each point's position along its direction
    for (let i = this.points.length - 1; i >= 0; i--) {
      let pt = this.points[i];
      pt.x += pt.direction.x * pt.speed;
      pt.y += pt.direction.y * pt.speed;

      // Reduce transparency over time
      let age = frameCount - pt.birthFrame;
      pt.currentAlpha = map(age, 0, this.lifetime, pt.initialAlpha, 0);

      // Remove point if it becomes completely transparent
      if (pt.currentAlpha <= 0) {
        this.points.splice(i, 1); 
      }
    }
  }

  show() {
    push();
    rotate(this.rotationAngle); 
    //Conditional: map stroke size of ripple
    let strokeSize = min(width, height)/200 * 0.8; 
    let ageRatio = (frameCount - this.points[0]?.birthFrame) / this.lifetime;
    let r = map(ageRatio, 0, 1, 180, 0);  
    let g = map(ageRatio, 0, 1, 0, 0);    
    let b = map(ageRatio, 0, 1, 60, 255);  
    stroke(r, 0, b, 150); 
    strokeWeight(strokeSize); 
    noFill();

    for (let pt of this.points) {
      stroke(r, 0, b, pt.currentAlpha);
      point(pt.x, pt.y);
    }
    pop();
  }

  isDone() {
    return this.points.length === 0;
  }
}

function createRipple() {
  ripples.push(new Ripple());
}
