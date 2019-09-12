const DIRECTIONS = Object.freeze({
  UP: "KeyW",
  DOWN: "KeyS",
  LEFT: "KeyA",
  RIGHT: "KeyD"
});

const SPACE = "Space";
const KEY_CODES = { DIRECTIONS, SPACE };
const STARTING_ASTEROIDS = 0;
const HEIGHT = 700;
const WIDTH = 800;

class GameModel {
  constructor() {
    this.moverRegistry = {} // maps names to references to movers along with their positional info
    this.score = 0;
    this.remainingAsteroids = STARTING_ASTEROIDS;
    this.removedIds = new Set();
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
    return { xVector: x * coefficients[0], yVector: y * coefficients[1] }
  }

  calculateVectors(mover) {
    // get some common info liike the normalized angle 
    const { angle, speed } = mover.velocity;
    if (angle !== 360) debugger;
    // first calculate the quadrant
    const quadrant = this.determineQuadrantFromAngle(angle);
    // normalize the angle
    const normalizedAngle = angle > 90 ? angle % 90 : angle;
    // now calculate the angle that describes the separation from the x axis
    const xAxisOffsetAngle = 90 - normalizedAngle;

    const radians = this.convertToRadians(xAxisOffsetAngle);

    const preQuadrantX = this.calculateXVector(radians, speed);
    const preQuadrantY = this.calculateYVector(radians, speed);
    const { xVector, yVector } = this.applyQuadrantToVectors(preQuadrantX, preQuadrantY, quadrant);
    return {xVector, yVector}
  }
  calculateXVector(radians, speed) {
    const x =  Math.cos(radians) * speed;
    return x;
  }

  calculateYVector(radians, speed) {
    const y = Math.sin(radians) * speed;
    return -y;
  }

  calculateYVectorFromRaw(angle, speed) {
    const radians = this.convertToRadians(angle + 90);
    const y = Math.sin(radians) * speed;
    return -y;
  }

  recalculatePositions() {
    Object.values(this.moverRegistry).forEach(mover => {
      const { xVector, yVector } = this.calculateVectors(mover);

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
      mover.velocity.angle = wallCorrectedAngle;
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
      // if the adjusted coords correspond to a wall boundary, reverse it
      if (wallCorrectedX === 0 || wallCorrectedX === maxAllowableX || wallCorrectedY === 0 || wallCorrectedY === maxAllowableY) {
        wallCorrectedSpeed = speed;
        if (Math.abs(angle) % 180 === 0) {
          wallCorrectedAngle = angle + 180 
        } else {
          wallCorrectedAngle = angle + 90
        }
        console.log(
          'current angle', mover.velocity.angle, 
          'wall corrected angle', wallCorrectedAngle,
          'current y speed', this.calculateYVector(mover),
          'Math.sin of current angle', Math.sin(this.convertToRadians(angle)),
          'current angle in radians', this.convertToRadians(mover.velocity.angle),
          'wall corrected angle in radians', this.convertToRadians(wallCorrectedAngle),
          'Math.sin of projected angle', Math.sin(this.convertToRadians(wallCorrectedAngle)),
          'projected y speed', this.calculateYVectorFromRaw(wallCorrectedAngle, wallCorrectedSpeed)
        )
        // debugger;
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

class Velocity {
  constructor(initSpeed = 1, initAngle = 360) {
    this.speed = initSpeed; // something like px/s
    this.angle = initAngle; // something like a compass angle
  }
}

class Position {
  constructor(initX , initY) {
    this.x = initX || Math.floor(Math.random() * WIDTH)
    this.y = initY || Math.floor(Math.random() * HEIGHT)
  }
}

class Mover {
  constructor({ initX, initY, initSpeed, initAngle, game } = {}) {
    this.velocity = new Velocity(initSpeed, initAngle);
    this.position = new Position(initX, initY);
    this.id = "id-" + Math.random().toString().substring(2);
    this.game = game;
    this.color = "";
    this.width = 1;
    this.height = 1;
  }
}

class Bullet extends Mover {
  constructor(opts) {
    super(opts)
    this.width = 5;
    this.height = 5;
    this.color = "pink"
    this.constructor.count++;
  }
}

Bullet.count = 0;

class Asteroid extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "purple"
    this.velocity.speed = 2;
    this.velocity.angle = Math.floor(Math.random() * 360);
    this.width = 10;
    this.height = 10;
  }
}

// Has methods to update the velocity manually
class ControlledMover extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "red";
    this.width = 10;
    this.height = 10;
    document.addEventListener("keypress", e => {
      const { code } = e;
      this.update(code);
    })
  }

  update(keyCode) {
    const { DIRECTIONS, SPACE } = KEY_CODES;
    if (Object.values(DIRECTIONS).includes(keyCode)) this.updateVelocity(keyCode)
    else if (keyCode === SPACE) this.shoot();
  }
  updateVelocity(direction) {
    this.updateSpeed(direction);
    this.updateDirection(direction);
    console.log(`Speed: ${this.velocity.speed}, direction: ${this.velocity.angle}`)
  }
  updateSpeed(direction) {
    if (direction === DIRECTIONS.UP) {
      this.velocity.speed++;
    } else if (direction === DIRECTIONS.DOWN && this.velocity.speed > 0) {
      this.velocity.speed--;
    }
  }

  updateDirection(direction) {
    if (direction === DIRECTIONS.LEFT) {
      this.velocity.angle -= 15;
      // keeps the angle 'rotating'
      if (this.velocity.angle <= 0) {
        const negativeAmount = this.velocity.angle;
        // this will actually end up being a substraction because the angle is negative
        this.velocity.angle = 360 + this.velocity.angle;
      }
    } else if (direction === DIRECTIONS.RIGHT) {
      this.velocity.angle += 15;
      if (this.velocity.angle > 360) {
        const amountAbove360 = this.velocity.angle - 360;
        this.velocity.angle = amountAbove360;
      }
      
    }
  }

  shoot() {
    this.game.handleShoot(this)
  }
}

function init() {
  const game = new GameModel();
  game.init();
  window.game = game;
}

init();
