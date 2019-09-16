import ControlledMover from "movers/ControlledMover"
import Asteroid from "movers/Asteroid"
import Bullet from "movers/Bullet"


const STARTING_ASTEROIDS = 10;
const AXES = {
  X: "x",
  Y: "y"
};

const HEIGHT = 700;
const WIDTH = 800;



class GameModel {
  constructor(width, height) {
    this.moverRegistry = {} // maps names to references to movers along with their positional info
    this.score = 0;
    this.remainingAsteroids = STARTING_ASTEROIDS;
    this.removedIds = new Set();
    this.width = width;
    this.height = height;
  }

  init() {
    // sets up thing to update the mover registry on an interval
    this.spawnControlledMover();
    this.spawnAsteroids(STARTING_ASTEROIDS);
    this.reRender();
    this.isAlive = true;

    this.useAnimationFrame = true;
    if (this.useAnimationFrame) window.requestAnimationFrame(this.reAnimateWithPositionAbsolute.bind(this))
    else {
       setInterval(() => {
         this.reAnimateWithPositionAbsolute()
        }, 1000/120)
    }

    this.setMainAreaStyle();
  }

  reAnimateWithPositionAbsolute() {
      this.recalculatePositions();
      this.recalculateRemainingAsteroids();
      this.reRender();
      if (this.useAnimationFrame) window.requestAnimationFrame(this.reAnimateWithPositionAbsolute.bind(this))
  }

  recalculateRemainingAsteroids() {
    this.remainingAsteroids = Object.values(this.moverRegistry).filter(m => m instanceof Asteroid).length;
  }
  reAnimateWithTransitions() {
    this.recalculatePositions();
    this.reRenderUsingTranslations()
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

  spawnControlledMover() {
    const cMover = new ControlledMover({game: this});
    this.moverRegistry[cMover.id] = cMover;
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
    // debugger;
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

  // haven't yet figured out elegant function like side collision, but it is x reflection for\
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

  recalculatePositions = () => {
    Object.values(this.moverRegistry).forEach(mover => {
      const { xVector, yVector } = this.calculateVectors(mover.velocity);
      if (mover instanceof ControlledMover) {

        console.log(`New vector: (${xVector}, ${yVector})`)
      }
      const newX = mover.position.x + xVector;
      const newY = mover.position.y + yVector;
      const { wallCorrectedX, 
        wallCorrectedY, 
        wallCorrectedSpeed, 
        wallCorrectedAngle } = this.handleWallCollisions(newX, newY, mover);

      // console.log(`New position: (${wallCorrectedX}, ${wallCorrectedY})`)
      mover.position.x = wallCorrectedX;
      mover.position.y = wallCorrectedY;
      mover.velocity.speed = wallCorrectedSpeed;
      mover.setAngle(wallCorrectedAngle);
    })

    // now detect if there were object collisions
    this.detectAndHandleObjectCollisions()
  }

  detectAndHandleObjectCollisions() {
    // if a bullet and an asteroid hit, remove the asteroid from the mover registry and add 1000 points to the score
    // 'hit' is defined as within 10 px box
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

    // make a record of those deleted so we can remove them from the dom
    this.removedIds = new Set(collidingPairs.flat())
    collidingPairs.forEach(collidingPair => {
      Bullet.count--;
      this.score += 1000;
      const [bId, aId] = collidingPair;
      delete this.moverRegistry[bId];
      delete this.moverRegistry[aId];
    })
  }

  // calculate border collision and
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
        // debugger
        // wallCorrectedSpeed = speed;
        if (Math.abs(angle) % 180 === 0) {
          wallCorrectedAngle = angle + 180 
        } else {
          const isSideBoundary = wallCorrectedX === 0 || wallCorrectedX === maxAllowableX
          wallCorrectedAngle = this.calculateWallReflectedAngle(angle, xVector, yVector, isSideBoundary);
        }
        const acceptableWallCorrected = mover.calculateAcceptableAngle(wallCorrectedAngle);
        const { xVector: projX, yVector: projY } = this.calculateVectors({angle: acceptableWallCorrected, speed: wallCorrectedSpeed});
        

        console.log(
          'current angle', mover.velocity.angle, 
          'wall corrected, acceptable angle', acceptableWallCorrected,
          'current y speed', yVector,
          'projected y speed', projY
        )
      }
    }
    return { wallCorrectedX, wallCorrectedY, wallCorrectedSpeed, wallCorrectedAngle };
  }

  // can also be used as the initial render call when using translations to animate
  reRender() {
    // iterate through moverRegistry and render divs at the proper coordinates
    // mixing model and view but yolo
    const mainArea = document.querySelector("#main-area")
    for (const deletedId of this.removedIds) {
      const existingNode = document.querySelector(`#${deletedId}`)
      mainArea.removeChild(existingNode);
    }
    Object.values(this.moverRegistry).forEach(mover => {
      // remove everything and then re-add it
      const existingNode = document.querySelector(`#${mover.id}`)
      if (existingNode) {
        mainArea.removeChild(existingNode);
      }
      const newMoverDiv = document.createElement("div");
      newMoverDiv.style.position = "absolute"
      newMoverDiv.style.left = mover.position.x;
      newMoverDiv.style.top = mover.position.y;
      newMoverDiv.style.width = mover.width;
      newMoverDiv.style.height = mover.height;
      newMoverDiv.style.background = mover.color;
      newMoverDiv.id = mover.id;

      mainArea.appendChild(newMoverDiv);
    })
    document.querySelector("#score").innerHTML = `Score: ${this.score}`;
    document.querySelector("#remaining-asteroids").innerHTML = `Remaining Asteroids: ${this.remainingAsteroids}`;
    document.querySelector("#active-bullet-counter").innerHTML = `ActiveBullets: ${Bullet.count}`;

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