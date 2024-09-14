let A, B, C, D;
let numPoints = 200; // Number of points to generate
let rBase;
let points = [];
let ripples = []; // Store ripple objects
let pMax = 200; // Total number of points to generate
let baseRBase; // The base value for rBase

let frequency = 0.02; // Initial heartbeat frequency
let cycleDuration = 7200; // 30 seconds at 60 FPS (1800 frames)
let cycleProgress = 0; // Progress within the 30-second cycle (0 to 1)
let prevHeartbeat = 0; // To detect when the heart starts expanding

function setup() {
  createCanvas(windowWidth, windowHeight); // Full-screen canvas
  background(0); // Black background
  strokeWeight(5); // Thicker stroke for the points
  noFill();

  // Initialize De Jong attractor parameters with random values
  A = random(-2, 2);
  B = 1;
  C = random(-2, 2);
  D = 0.5;

  baseRBase = min(width, height) / 600 * random(0.75, 1.25) * PI;

  rBase = baseRBase; // Initial value for rBase

  // Generate points with random transparency
  for (let i = 0; i < numPoints; i++) {
    points.push(new Point(random(-2, 2), random(-2, 2), random(50, 255))); // Random alpha for transparency
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // Adjust canvas size when window is resized
  background(0); // Redraw background to avoid leftover artifacts
}

function draw() {
  // Clear the background slightly to avoid accumulation, but keep some trace
  fill(0, 0, 0, 50); // Black with partial transparency
  rect(0, 0, width, height);

  // Update heartbeat frequency based on cycle progress
  cycleProgress = (frameCount % (2 * cycleDuration)) / cycleDuration;
  if (cycleProgress <= 1) {
    frequency = map(cycleProgress, 0, 1, 0.02, 0.1); // Gradually increase
  } else {
    frequency = map(cycleProgress, 1, 2, 0.1, 0.02); // Gradually decrease
  }

  // Heartbeat effect for rBase (expands and shrinks)
  let heartbeat = sin(frameCount * frequency); // Sinusoidal function for smooth shrinking and expanding
  rBase = baseRBase + heartbeat * baseRBase * 0.5; // Adjust magnitude for the heartbeat effect

  // Check if the heart starts expanding from its minimum point
  if (prevHeartbeat < -0.98 && heartbeat > -0.99) {
    // Create a ripple when the heart starts expanding
    createRipple();
  }
  prevHeartbeat = heartbeat;

  // Translate the origin to the center of the canvas and apply rotation over time
  translate(width / 2, height / 2);
  rotate(millis() * 0.0002); // Rotate the shape over time

  // Update A and C over time for smoother animation
  A = 2 * sin(millis() * 0.00001); // Animate A over time
  C = 2 * cos(millis() * 0.000015); // Animate C separately for dynamic behavior

  // If we're halfway through drawing, adjust parameters to avoid convergence
  if (frameCount > floor(pMax * 0.6)) {
    A = random(-1, 1);
    B = random(-1, 1);  // Allow B to change as well for more dynamic output
    C = random(-1, 1);
    D = random(-1, 1);  // Introduce more randomness to D as well
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
      ripples.splice(i, 1); // Remove ripple when it's done
    }
  }
}

// Point class to handle each individual point's movement
class Point {
  constructor(prevX, prevY, alphaValue) {
    this.prevX = prevX;
    this.prevY = prevY;
    this.alpha = alphaValue; // Random transparency (alpha)
  }

  // Update the point using De Jong attractor equations
  update() {
    let currX = sin(TWO_PI * A * this.prevY) - cos(TWO_PI * B * this.prevX);
    let currY = sin(TWO_PI * C * this.prevX) - cos(TWO_PI * D * this.prevY);

    // Polar Coordinates Transformation (with smaller scaling)
    let dX = width * 0.1 * currX; // Smaller scaling to make the sphere smaller
    let dY = height * 0.1 * currY;
    let dR = rBase * currY; // Radial distance

    // Polar to Cartesian conversion
    this.scaledX = (dX * cos(dR) - dY * sin(dR)); // X coordinate in polar form
    this.scaledY = (dY * cos(dR) + dX * sin(dR)); // Y coordinate in polar form

    // Update the previous position with current values
    this.prevX = currX;
    this.prevY = currY;
  }

  // Display the point as a white dot with random transparency
  show() {
    stroke(255, this.alpha); // White color with random transparency
    point(this.scaledX, this.scaledY); // Draw the point at its current position
  }
}

// Ripple class to create the ripple effect
class Ripple {
  constructor() {
    this.points = [];
    this.lifetime = 500; // Ripple lasts for 500 frames

    // Random radius for the initial circle
    this.radius = random(50, 150);

    // Random rotation angle for the ripple
    this.rotationAngle = random(TWO_PI);

    // Generate points along the circle's perimeter
    for (let i = 0; i < 50; i++) {
      let angle = noise(i * 0.1) * TWO_PI;
      let x = this.radius * cos(angle);
      let y = this.radius * sin(angle);

      // Store the direction vector for each point (from center to perimeter)
      let direction = createVector(x, y);
      direction.normalize(); // Normalize to get the direction

      this.points.push({
        x: x,
        y: y,
        direction: direction,
        speed: random(0.5, 1),
        initialAlpha: random(100, 255), // Initial transparency
        currentAlpha: 255, // Start with full transparency
        birthFrame: frameCount, // The frame when the ripple was created
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
        this.points.splice(i, 1); // Remove point from array
      }
    }
  }

  show() {
    push();
    // Rotate the ripple in 2D
    rotate(this.rotationAngle); // 2D rotation
    stroke(255, 150); // Set the stroke color
    noFill();

    // Draw each point with decreasing transparency
    for (let pt of this.points) {
      stroke(255, pt.currentAlpha); // Set transparency
      point(pt.x, pt.y);
    }
    pop();
  }

  // Check if the ripple is done (all points are gone)
  isDone() {
    return this.points.length === 0;
  }
}

// Create a new ripple whenever the heart starts expanding
function createRipple() {
  ripples.push(new Ripple());
}
