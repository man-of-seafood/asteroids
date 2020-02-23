import ControlledMover from "./movers/controlledMover"
import Asteroid from "./movers/asteroid"
import Bullet from "./movers/bullet"


const STARTING_ASTEROIDS = 10;
const AXES = {
  X: "x",
  Y: "y"
};

const HEIGHT = 700;
const WIDTH = 800;

function sum (nums) {
  return nums.reduce((sum, curr) => sum + curr);
}

function average(nums) {
  return sum(nums) / nums.length;
}

class GameModel {
  constructor(width, height) {
    this.moverRegistry = {} // maps names to references to movers along with their positional info
    this.playerId = null;
    this.score = 0;
    this.remainingAsteroids = STARTING_ASTEROIDS;
    this.hasWon = false;
    this.width = WIDTH;
    this.height = HEIGHT;
    this.isAlive = true;

    this.lastRecordedTimestamp = null;
    this.initialTimestamp;
    this.elapsedTime = 0;
    this.recentFrameRates = [];
    this.movingAverage = 0;
  }

  init() { 
    // sets up thing to update the mover registry on an interval
    this.spawnControlledMover();
    this.spawnAsteroids(STARTING_ASTEROIDS);

    this.setMainAreaStyle();
    // state updates are bundled with the render call so that
    // we don't run into a situation where a slight difference in timing of state update completion and rendering results in
    // a rendering of a frame that is based off a model that's had two state updates

    // because the state updates will happen (semi) unpredictably, we use the timestamp
    // provided by request animation frame to determine how much time has elapsed
    // since the last update. 
    window.requestAnimationFrame(this.updateState.bind(this))

  }

  updateState(timestamp) {
    if (!this.lastRecordedTimestamp) this.initialTimestamp = this.lastRecordedTimestamp = timestamp;
    // Default is 60 to avoid division by 0 error that would present itself in the case 
    // that this is the first frame being rendered (timestamp === lastRecordedStamp)
    const renderTimeDelta = (timestamp === this.lastRecordedTimestamp)
      ? 60
      : timestamp - this.lastRecordedTimestamp;
    this.elapsedTime += renderTimeDelta;
    this.lastRecordedTimestamp = timestamp;
    const fps = 1000 / renderTimeDelta;
    // add this into the array the holds recent fps calculations
    this.updateRecentFrameRates(fps);

    this.updateBulletLifespans(renderTimeDelta)
    this.recalculatePositions(renderTimeDelta);
    this.recalculateRemainingAsteroids();
    this.checkIfWon(this.remainingAsteroids);
    this.updatePlayerVelocity();
    this.render();
    window.requestAnimationFrame(this.updateState.bind(this))
  }

  updatePlayerVelocity() {
    if (!this.isAlive) return;
    const player = this.moverRegistry[this.playerId]
    // if some key is active, we should call the player's 
    // 'update' method, passing the active key
    Object.entries(player.keyStates).forEach(([key, isActive]) => {
      // debugger;
      if (isActive) {
        player.update(key);
      }
    })
  }

    // Removes all moving elements from the DOM and re-adds them with their updated coordinates.
    render() {
      // clear the DOM
      const allMovers = document.querySelectorAll(".mover")
      allMovers.forEach(mover => mover.remove())
      const mainArea = document.querySelector("#main-area")
      // Add everything in that's still in the registry
      Object.values(this.moverRegistry).forEach(mover => {
        const newMoverDiv = document.createElement("div");
        newMoverDiv.className = "mover";
        newMoverDiv.style.position = "absolute"
        newMoverDiv.style.left = mover.position.x;
        newMoverDiv.style.top = mover.position.y;
        newMoverDiv.style.width = mover.width;
        newMoverDiv.style.height = mover.height;
        newMoverDiv.style.background = mover.color;
        newMoverDiv.id = mover.id;

        if (newMoverDiv.id === this.playerId) {
          // make it a triangle
          newMoverDiv.style.width = 0;
          newMoverDiv.style.height = 0; 
          newMoverDiv.style.background = "transparent";
          newMoverDiv.style.transform = `rotate(${mover.velocity.angle}deg)`;
          newMoverDiv.style.borderLeft = "6px solid transparent";
          newMoverDiv.style.borderRight = "6px solid transparent";
          newMoverDiv.style.borderBottom = "15px solid red";
        }
  
        mainArea.appendChild(newMoverDiv);
      })
      document.querySelector("#score").innerHTML = `Score: ${this.score}`;
      document.querySelector("#remaining-asteroids").innerHTML = `Remaining Asteroids: ${this.remainingAsteroids}`;
      document.querySelector("#active-bullet-counter").innerHTML = `ActiveBullets: ${Bullet.count}`;
      document.querySelector("#moving-avg-fps").innerHTML = `Avg Fps: ${this.movingAverage}`;
      if (!this.isAlive) {
        document.querySelector("#you-died").innerHTML = `Y O U${"             "}D I E D`;
      } else if (this.hasWon) {
        document.querySelector("#you-won").innerHTML = "Y O U     D I D  I T.    G O O D   J O B";
      }
    }

  recalculateRemainingAsteroids() {
    this.remainingAsteroids = Object.values(this.moverRegistry).filter(m => m instanceof Asteroid).length;
  }

  checkIfWon(remainingAsteroids) {
    if (remainingAsteroids === 0) {
      this.hasWon = true;
    }
  }

  reAnimateWithTransitions() {
    this.recalculatePositions();
    this.renderUsingTranslations()
    window.requestAnimationFrame(this.reAnimate)
  }

  setMainAreaStyle() {
    const mainAreaStyle = document.querySelector("#main-area").style
    mainAreaStyle.position = "absolute"
    mainAreaStyle.top = 0;
    mainAreaStyle.left = 0;
    mainAreaStyle.background = "blue";
    mainAreaStyle.width = WIDTH;
    mainAreaStyle.height = HEIGHT;
  }

  calculateBulletValues(moverReference) {
    const initX = moverReference.position.x;
    const initY = moverReference.position.y;
    const initSpeed = moverReference.velocity.speed + 5;
    const initAngle = moverReference.velocity.angle;
    const opts = { initX, initY, initSpeed, initAngle, game: this };
    return opts;
  }

  handleShoot(moverReference) {
    const bulletOpts = this.calculateBulletValues(moverReference);
    this.spawnBullet(bulletOpts)
  }

  updateMinimumSpeed(elapsedTime) {
    // every 3 seconds the min speed increases
    const min = Math.floor(elapsedTime/3000);
    // console.log('new min speed', min);
    // update controlled mover
    this.getControlledMover().setMinimumSpeed(min);
  }

  spawnControlledMover() {
    const cMover = new ControlledMover({ initX: Math.random() * this.width, initY: Math.random() * this.height, game: this});
    this.playerId = cMover.id;
    this.moverRegistry[this.playerId] = cMover;
  }

  spawnAsteroids(numAsteroids) {
    for (let i = 0; i < numAsteroids; i++) {
      const asteroid = new Asteroid({game: this})
      this.moverRegistry[asteroid.id] = asteroid;
    }
  }

  spawnBullet(opts) {
    const ucMover = new Bullet(opts);
    this.moverRegistry[ucMover.id] = ucMover;
  }

  convertToRadians(degrees) {
    const radians = degrees * (Math.PI / 180);
    return radians;
  }

  determineQuadrantFromAngle(angle) {
    if (angle >= 0 && angle <= 90) {
      return 1;
    } else if (angle >= 91 && angle <= 180) {
      return 2;
    } else if(angle >= 181 && angle <= 270) {
      return 3;
    } else if (angle >= 271 && angle <= 360) {
      return 4;
    } else {
      throw new Error("Angle not between 0 and 360 inclusive")
    }
  }

  applyQuadrantToVectors(x, y, quadrant) {
    const quadrantToCoefficients = {
      1: [1, 1],
      2: [1, -1],
      3: [-1, -1],
      4: [-1, 1]
    };

    const coefficients = quadrantToCoefficients[quadrant];
    return { xVector: x * coefficients[0], yVector: y * coefficients[1] }
  }

  /**
   * 
   * @param {number} angle 
   * @returns {String} An axis (x or y)
   */
  determineClosestAxisFromAngle(angle) {
    const axisAngles = [0, 90, 180, 270, 360];
    
    const axisAnglesToAxis = {
      0: AXES.Y,
      90: AXES.X,
      180: AXES.Y,
      270: AXES.X,
      360: AXES.Y
    };

    // find the index of the min delta
    let closestAxisAngle;
    let lowestDelta = 360; // 359 is technically the highest, so any delta should be lowest
    axisAngles.forEach((axisAngle, index) => {
      const delta = Math.abs(axisAngle - angle)
      if (delta < lowestDelta) {
        lowestDelta = delta;
        closestAxisAngle = axisAngle;
      }
    })
    
    return {
      axisAngle: closestAxisAngle,
      axis: axisAnglesToAxis[closestAxisAngle]
    };
  }

  calculateVectors({angle, speed}) {
    // const { angle, speed } = mover.velocity;
    const {axisAngle, axis: closestAxis} = this.determineClosestAxisFromAngle(angle);

    // now calculate the angle that describes the separation from the axis it's closest to 
    const closestAxisOffsetAngle = Math.abs(axisAngle - angle);
    const radians = this.convertToRadians(closestAxisOffsetAngle);
    
    let xVector = this.calculateXVector(radians, speed);
    let yVector = this.calculateYVector(radians, speed);
    
    if (closestAxis === AXES.Y) {
      let tmp = xVector;
      xVector = -yVector;
      yVector = -tmp;
    }

    const quadrant = this.determineQuadrantFromAngle(angle);
    let { xVector: finalX, yVector: finalY } = this.applyQuadrantToVectors(xVector, yVector, quadrant);
    return { xVector: finalX, yVector: finalY }
  }

  // haven't yet figured out elegant function like side collision, but it is x reflection for
  // top bottom collision
  // x pos, y neg => add angle relative to X to nearest axis (reflect closest axis angle cross x axis) (90 + (90 - angle))
  // x pos, y pos => (90 - (angle - 90))
  // x neg, y neg =>  (270 - (angle - 270))
  // x neg, y pos => 270 + (270 - angle)

  // side ( mirrored y angle)

  // x pos, y neg => Math.abs(360 - angle)
  // x pos, y pos => Math.abs(360 - angle) 
  // x neg, y neg => Math.abs(360 - angle)
  // x neg, y pos => Math.abs(360 - angle)

  calculateWallReflectedAngle(angle, xVector, yVector, isSideBoundary) {
    const isPositive = num => num > 0;

    if (isSideBoundary) {
      const yReflectedAngle = Math.abs(360 - angle);
      return yReflectedAngle
    } else {
      if (isPositive(xVector) && !isPositive(yVector)) {
        return 90 + (90 - angle);
      } else if (isPositive(xVector) && isPositive(yVector)) {
        return 90 - (angle - 90);
      } else if (!isPositive(xVector) && !isPositive(yVector)) {
        return 270 - (angle - 270);
      } else if (!isPositive(xVector) && isPositive(yVector)) {
        return 270 + (270 - angle);
      }
    }
  }

  calculateXVector(radians, speed) {
    const coefficient = Math.cos(radians);
    const x = coefficient * speed;
    return x;
  }

  calculateYVector(radians, speed) {
    const coefficient = Math.sin(radians);
    const y = coefficient * speed;
    return -y;
  }

  calculateYVectorFromRaw(angle, speed) {
    const radians = this.convertToRadians(angle + 90);
    const y = Math.sin(radians) * speed;
    return -y;
  }

  getBullets() {
    return Object.values(this.moverRegistry).filter(mover => mover instanceof Bullet);
  }

  getControlledMover() {
    return Object.values(this.moverRegistry).find(mover => mover instanceof ControlledMover);
  }

  recalculatePositions(delta) {
    Object.values(this.moverRegistry).forEach(mover => {
      const { xVector, yVector } = this.calculateVectors(mover.velocity);
      const newX = mover.position.x + xVector;
      const newY = mover.position.y + yVector;
      const { wallCorrectedX, 
        wallCorrectedY, 
        wallCorrectedSpeed, 
        wallCorrectedAngle } = this.handleWallCollisions(newX, newY, mover);


      mover.position.x = wallCorrectedX;
      mover.position.y = wallCorrectedY;
      mover.velocity.speed = wallCorrectedSpeed;
      mover.setAngle(wallCorrectedAngle);
    })

    // now detect if there were object collisions
    this.detectAndHandleObjectCollisions()
    this.detectAndHandleAsteroidCollisions()
  }

  /**
   * Updates bullet lifetime and removes it if <= 0
   * @param {Date} timestamp 
   */
  updateBulletLifespans(delta) {
    // locate all bullets and subtract the delta from their lifespans
    this.getBullets().forEach(bullet => {
      bullet.remainingLifetime -= delta;
      if (bullet.remainingLifetime <= 0) {
        bullet.remove();
      }
    })
  }

  removeMover(moverId) {
    delete this.moverRegistry[moverId];
  }

  detectAndHandleObjectCollisions() {
    // if a bullet and an asteroid hit, remove both the asteroid and bullet from
    // the mover registry and add 1000 points to the score. 'hit' is defined as
    // within 10 px box
    const movers = Object.values(this.moverRegistry);
    const asteroids = movers.filter(m => m instanceof Asteroid)
    const bullets = movers.filter(m => m instanceof Bullet)
    // colliding pairs is tuple of bId, aId
    const collidingPairs = bullets.map(b => {
      let tuple = undefined;
      asteroids.forEach(a => {
        if ((Math.abs(b.position.x - a.position.x) < a.width) && (Math.abs(b.position.y - a.position.y) < a.height)) {
          if (!tuple) tuple = [b.id, a.id];
        }
      })
      return tuple;
    }).filter(t => !!t)

    collidingPairs.forEach(collidingPair => {
      Bullet.count--;
      this.score += 1000;
      const [bId, aId] = collidingPair;
      delete this.moverRegistry[bId];
      delete this.moverRegistry[aId];
    })
  }

  detectAndHandleAsteroidCollisions() {
    if (!this.isAlive) return;
    const movers = Object.values(this.moverRegistry);
    const asteroids = movers.filter(m => m instanceof Asteroid)
    const player = movers.find(m => m instanceof ControlledMover)
    asteroids.forEach(a => {
      if ((Math.abs(player.position.x - a.position.x) < a.width) && (Math.abs(player.position.y - a.position.y) < a.height)) {
        this.isAlive = false;
        delete this.moverRegistry[player.id];
      }
    })
  }

  handleWallCollisions(newX, newY, mover) {
    const { speed, angle } = mover.velocity;
    // assign the defaults since they may not change
    let wallCorrectedX = newX;
    let wallCorrectedY = newY;
    let wallCorrectedSpeed = speed;
    let wallCorrectedAngle = angle;
    // Player and asteroid will do the ole teleport
    if (mover instanceof ControlledMover || mover instanceof Asteroid) {
      // no-op on the velocity for the player controlled unit because we want teleportation to happen smoothly
      wallCorrectedSpeed = speed;
      wallCorrectedAngle = angle;
      if (newX < 0) {
        wallCorrectedX = WIDTH;
      } else if (newX > WIDTH) {
        wallCorrectedX = 0;
      }
      if (newY < 0) {
        wallCorrectedY = HEIGHT;
      } else if (newY > HEIGHT) {
        wallCorrectedY = 0;
      }
    } else if (mover instanceof Bullet) {
      // no op on the x and y since change in angle will handle things for the bullets
      const maxAllowableX = WIDTH - mover.width;
      const maxAllowableY = HEIGHT - mover.height;
      wallCorrectedX = newX <= 0 ? 0 : Math.min(newX, maxAllowableX);
      wallCorrectedY = newY <= 0 ? 0 : Math.min(newY, maxAllowableY);
      // if the adjusted coords correspond to a wall boundary, make it bounce off
      if (wallCorrectedX === 0 || wallCorrectedX === maxAllowableX || wallCorrectedY === 0 || wallCorrectedY === maxAllowableY) {
        const { xVector, yVector } = this.calculateVectors(mover.velocity);
        if (Math.abs(angle) % 180 === 0) {
          wallCorrectedAngle = angle + 180 
        } else {
          const isSideBoundary = wallCorrectedX === 0 || wallCorrectedX === maxAllowableX
          wallCorrectedAngle = this.calculateWallReflectedAngle(angle, xVector, yVector, isSideBoundary);
        }
      }
    }
    return { wallCorrectedX, wallCorrectedY, wallCorrectedSpeed, wallCorrectedAngle };
  }

  // takes care of ensuring the array has at most 100 els
  updateRecentFrameRates(newestFrameRate) {
    this.recentFrameRates.push(newestFrameRate);
    // update moving average over last 100 frames 
    if (this.recentFrameRates.length < 100) {
      this.movingAverage = average(this.recentFrameRates);
    } else {
      const frameRatesLen = this.recentFrameRates.length;
      this.movingAverage = average(this.recentFrameRates.slice(frameRatesLen - 100, frameRatesLen));
    }

  }

  reRenderUsingTranslations() {
    Object.values(this.moverRegistry).forEach(mover => {
      const moverDiv = document.querySelector(`#${mover.id}`)
      const translationString = `translate(${mover.position.x}px, ${mover.position.y}px}`
      console.log('translation string', translationString)
      moverDiv.style.transform = translationString;
    })
  }
}

export default GameModel;