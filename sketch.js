// Bakeoff #2 - Seleção de Alvos e Fatores Humanos
// IPM 2020-21, Semestre 2
// Entrega: até dia 7 de Maio às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 3 de Maio

// p5.js reference: https://p5js.org/reference/

var audio = new Audio('soft_notification-[AudioTrimmer.com].mp3');
let ciclo = 0;
let wsize = 0;
let lastMouseClick = {x: 0, y: 0};

// Database (CHANGE THESE!)
const GROUP_NUMBER = 25;      // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = false;  // Set to 'true' before sharing during the simulation and bake-off days

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;

// Metrics
let testStartTime, testEndTime;// time between the start and end of one attempt (48 trials)
let hits = 0;      // number of successful selections
let misses = 0;      // number of missed selections (used to calculate accuracy)
let database;                  // Firebase DB  

// Study control parameters
let draw_targets = false;  // used to control what to show in draw()
let trials = [];     // contains the order of targets that activate in the test
let current_trial = 0;      // the current trial number (indexes into trials array above)
let attempt = 0;      // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs = [];     // add the Fitts ID for each selection here (-1 when there is a miss)

// Target class (position and width)
class Target {
  constructor(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

// Runs once at the start
function setup() {
  createCanvas(700, 500);    // window size in px before we go into fullScreen()
  frameRate(60);             // frame rate (DO NOT CHANGE!)

  randomizeTrials();         // randomize the trial order at the start of execution

  textFont("Arial", 18);     // font size for the majority of the text
  drawUserIDScreen();        // draws the user input screen (student number and display size)
}

// Runs every frame and redraws the screen
function draw() {

  if (draw_targets) {
    cursor("ball.png");
    // The user is interacting with the 4x4 target grid
    background(color(0, 0, 0));        // sets background to black

    // Print trial count at the top left-corner of the canvas
    fill(color(255, 255, 255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);

    // Draw all 16 targets
    for (var i = 0; i < 16; i++) drawTarget(i);
  }
}

// Print and save results at the end of 48 trials
function printAndSavePerformance() {
  // DO NOT CHANGE THESE! 
  let accuracy = parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time = (testEndTime - testStartTime) / 1000;
  let time_per_target = nf((test_time) / parseFloat(hits + misses), 0, 3);
  let penalty = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
  let target_w_penalty = nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
  let timestamp = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();

  background(color(0, 0, 0));   // clears screen
  fill(color(255, 255, 255));   // set text fill color to white
  text(timestamp, 10, 20);    // display time on screen (top-left corner)

  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width / 2, 60);
  text("Hits: " + hits, width / 2, 100);
  text("Misses: " + misses, width / 2, 120);
  text("Accuracy: " + accuracy + "%", width / 2, 140);
  text("Total time taken: " + test_time + "s", width / 2, 160);
  text("Average time per target: " + time_per_target + "s", width / 2, 180);
  text("Average time for each target (+ penalty): " + target_w_penalty + "s", width / 2, 220);

  // Print Fitts IDS (one per target, -1 if failed selection)
  let heightCount = 480;
  let alinha = 370;
  textAlign(CENTER);
  text("Fitts index of Performance", width / 2, height - 480);
  textAlign(LEFT);
  for (i in fitts_IDs) {
    if (i != 0) {
      if (fitts_IDs[i] !== -1)
        text("Target " + i + ": " + Math.round((fitts_IDs[i] + Number.EPSILON) * 100) / 100, width / 2 - alinha, height - heightCount);
      else
        text("Target " + i + ": MISSED", width / 2 - alinha, height - heightCount);
    }
    else
      text("Target " + i + ": --- ", width / 2 - alinha, height - heightCount);

    heightCount -= 20;
    if (i == 23) {
      heightCount = 480;
      alinha = -370;
    }

  }
  // Saves results (DO NOT CHANGE!)
  let attempt_data =
  {
    project_from: GROUP_NUMBER,
    assessed_by: student_ID,
    test_completed_by: timestamp,
    attempt: attempt,
    hits: hits,
    misses: misses,
    accuracy: accuracy,
    attempt_duration: test_time,
    time_per_target: time_per_target,
    target_w_penalty: target_w_penalty,
    fitts_IDs: fitts_IDs
  }

  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY) {
    // Access the Firebase DB
    if (attempt === 0) {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }

    // Add user performance results
    let db_ref = database.ref('G' + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() {
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets) {

    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);

    // Check to see if the mouse cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters
    if (dist(target.x, target.y, mouseX, mouseY) < target.w / 2) {
      hits++;
      fitts_IDs.push(calculateFittsId(target, lastMouseClick, target.w));;
      audio.play();
    }
    else {
      misses++;
      fitts_IDs.push(-1);
    }
    lastMouseClick.x = mouseX;
    lastMouseClick.y = mouseY;
    current_trial++;                 // Move on to the next trial/target

    // Check if the user has completed all 48 trials
    if (current_trial === trials.length) {
      testEndTime = millis();
      draw_targets = false;          // Stop showing targets and the user performance results
      printAndSavePerformance();     // Print the user's results on-screen and send these to the DB
      attempt++;

      // If there's an attempt to go create a button to start this
      if (attempt < 2) {
        continue_button = createButton('START 2ND ATTEMPT');
        continue_button.mouseReleased(continueTest);
        continue_button.position(width / 2 - continue_button.size().width / 2, height / 2 - continue_button.size().height / 2);
      }
    }
  }
}

function keyPressed() {
  if (keyCode == ENTER) {
    let oi = getTargetBounds(trials[current_trial - 1]);
    let oioi = getTargetBounds(trials[current_trial]);
    let hello = getTargetBounds(trials[current_trial + 1]);
    print("anterior: x: " + oi.x + "y: " + oi.y);
    print("current: x: " + oioi.x + "y: " + oioi.y);
    print("proximo: x: " + hello.x + "y: " + hello.y);
  }
}

// Draw target on-screen
function drawTarget(i) { // IMPORTANT_-------------------------------------------------------!!!
  // Get the location and size for target (i)
  let target = getTargetBounds(i);

  // Check whether this target is the target the user should be trying to select
  if (trials[current_trial] === i) {
    // Highlights the target the user should be trying to select
    // with a white border
    if (ciclo === 6) {
      ciclo = 0;
      wsize++;
    }
    ciclo++;
    stroke(color(127, 255, 0)); // Stroke Color !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    strokeWeight(Math.abs(Math.sin(wsize) * (target.w / 10))); // Stroke Wieght !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    if (dist(target.x, target.y, mouseX, mouseY) <= target.w) { // if the cursor is over the target
      fill(color(127, 255, 0));
    }
    else
      fill(color(0, 128, 0));
    // Remember you are allowed to access targets (i-1) and (i+1)
    // if this is the target the user should be trying to select
    //

  }
  else if (trials[current_trial + 1] === i) { // NEXT BALLLLLLL!!!!!!!!!!!!!!!!!!!!
    stroke(color(0, 0, 220));
    strokeWeight(0);
    fill(color(250, 100, 250, 90));
  }


  // Does not draw a border if this is not the target the user
  // should be trying to select
  else {
    noStroke();
    fill(color(120, 120, 120, 80));
  }

  circle(target.x, target.y, target.w);
  if (i === 15) {
    let last = getTargetBounds(trials[current_trial - 1]);
    let current = getTargetBounds(trials[current_trial]);
    let next = getTargetBounds(trials[current_trial + 1]);
    //---------------------Last to Current------------------------------

    //drawArc(createVector(current.x, current.y), color(250));
    if (last.x === current.x && last.y === current.y) {
      drawArc(createVector(current.x, current.y), color(250), target.w);
    }
    else if (current_trial !== 0) {
      let v0 = createVector(last.x, last.y);
      let v1 = createVector(current.x - last.x, current.y - last.y);
      let ola = getVector(v0, createVector(current.x, current.y), target.w / 1.5);
      // print("x1: " + v1.x + " y1: " + v1.y);
      //print("x2: " + ola.x + " y2: " + ola.y);
      drawArrow(v0, ola, color(250), target.w);
    }
    //-------------------------------------------------------------------

    if (current_trial !== 47 && next.x === current.x && next.y === current.y) {
      drawArc(createVector(current.x, current.y), color(200, 100, 250, 70), target.w);
    }

    else if (current_trial !== 0 && current_trial !== 47 &&
      is_antiColenear(createVector(current.x - last.x, current.y - last.y),
        createVector(next.x - current.x, next.y - current.y))) {

      print("anticolinear");
      if (current.x === next.x) { // vertical 
        v0 = createVector(current.x - (current.w / 2), current.y);
        v1 = createVector(next.x - (current.x - (current.w / 2)), next.y - current.y);
        let ola = getVector(v0, createVector(next.x, next.y), target.w / 1.5);
        drawArrow(v0, ola, color(200, 100, 250, 70), target.w);
      }

      else if (current.y === current.y) { // horizontal e obliquo
        v0 = createVector(current.x, current.y - current.w / 2);
        v1 = createVector(next.x - current.x, next.y - (current.y - current.w / 2));
        let ola = getVector(v0, createVector(next.x, next.y), target.w / 1.5);
        drawArrow(v0, ola, color(200, 100, 250, 70), target.w);
      }
      else {
        let move = (Math.sqrt(2) * current.w) / 2;
        v0 = createVector(current.x - move, current.y - move);
        v1 = createVector(next.x - v0.x, next.y - vo.y);
        let ola = getVector(v0, createVector(next.x, next.y), target.w / 1.5);
        drawArrow(v0, ola, color(200, 100, 250, 70), target.w);

      }

    }

    else if (current_trial !== 47) {
      v0 = createVector(current.x, current.y);
      v1 = createVector(next.x - current.x, next.y - current.y);
      let ola = getVector(v0, createVector(next.x, next.y), target.w / 1.5);
      drawArrow(v0, ola, color(200, 100, 250, 70), target.w);
    }
  }
}

function getVector(pi, pf, targetSize) {
  let vi = createVector(pf.x - pi.x, pf.y - pi.y);
  let distance = Math.sqrt(Math.pow(vi.x, 2) + Math.pow(vi.y, 2));
  let normalisedVector = createVector(vi.x / distance, vi.y / distance);
  distance = distance - targetSize;
  let hey = createVector(normalisedVector.x * distance, normalisedVector.y * distance);
  return hey;
}

function calculateFittsId(p1, p2, size) { // 138
  let distance = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  return Math.log2(distance / size + 1);
}

function produtoEscalar(v1, v2) {
  return (v1.x * v2.x + v1.y * v2.y);
}

function is_antiColenear(v1, v2) {
  if (v1.x === v2.x && v1.y === v2.y)
    return false;
  return Math.abs(produtoEscalar(v1, v2) -
    Math.sqrt((v1.x) ** 2 + (v1.y ** 2)) * Math.sqrt((v2.x) ** 2 + (v2.y ** 2)) * (-1)) < 1;
}



function drawArc1(base, Color) {
  let x = base.x + 21;
  let y = base.y + 1;
  noFill();
  stroke(color(Color));
  strokeWeight(7);
  arc(x, y, 60, 40, -PI / 2, PI / 2);
  triangle(x + 4, y + 17, x, y + 20, x + 4, y + 23);
}


function drawArc(base, Color, size) {
  let addx = size / 1.7;
  let addy = size / 20;
  let x = base.x + addx;
  let y = base.y - addy + addy / 40;
  noFill();
  stroke(color(Color));
  strokeWeight(size / 10);
  arc(x, y, size * 1.3, size / 1.1, -PI / 2, PI / 2);
  triangle(x - (addx / 30), y + size / 2.15 - addy, x - (addx / 6), y + size / 2.15, x - (addx / 30),
    y + size / 2.15 + addy);

}




function drawArrow(base, vec, Color, size) {
  push();
  stroke(Color);
  strokeWeight(size / 10);
  fill(Color);
  translate(base.x, base.y);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
  let arrowSize = 8;
  translate(vec.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();
}

// Returns the location and size of a given target
function getTargetBounds(i) {
  var x = parseInt(LEFT_PADDING) + parseInt((i % 4) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 4) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest() {
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);

  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];

  continue_button.remove();

  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  let display = new Display({diagonal: display_size}, window.screen);

  // DO NOT CHANGE THESE!
  PPI = display.ppi;                        // calculates pixels per inch
  PPCM = PPI / 2.54;                         // calculates pixels per cm
  TARGET_SIZE = 1.5 * PPCM;                         // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM;                         // sets the padding around the targets in cm
  MARGIN = 1.5 * PPCM;                         // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING = width / 2 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING = height / 2 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}
