const DIRECTIONS = Object.freeze({
  UP: "KeyW",
  DOWN: "KeyS",
  LEFT: "KeyA",
  RIGHT: "KeyD"
});

const SPACE = "Space";
const KEY_CODES = { DIRECTIONS, SPACE };
const HEIGHT = 700;
const WIDTH = 800;

class GameModel {
  constructor() {
    this.moverRegistry = {} // maps names to references to movers along with their positional info
    this.score = 0;
    this.removedIds = new Set();
  }

  init() {
    // sets up thing to update the mover registry on an interval
    this.spawnControlledMover();
    this.spawnAsteroid();
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
      this.reRender();
      if (this.useAnimationFrame) window.requestAnimationFrame(this.reAnimateWithPositionAbsolute.bind(this))
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

  spawnAsteroid() {
    const asteroid = new Asteroid({game: this})
    this.moverRegistry[asteroid.id] = asteroid;
  }

  spawnBullet(opts) {
    const ucMover = new Bullet(opts);
    this.moverRegistry[ucMover.id] = ucMover;
  }

  convertToRadians(degrees) {
    const radians = degrees * (Math.PI / 180);
    return radians;
  }
  calculateXVector(mover) {
    const radians = this.convertToRadians(mover.velocity.angle + 90);

    const x =  Math.cos(radians) * mover.velocity.speed;
    return x;
  }

  calculateYVector(mover) {
    const radians = this.convertToRadians(mover.velocity.angle + 90);
    const y = Math.sin(radians) * mover.velocity.speed;
    return -y;
  }

  recalculatePositions() {
    Object.values(this.moverRegistry).forEach(mover => {
      const newX = mover.position.x + this.calculateXVector(mover);
      const newY = mover.position.y + this.calculateYVector(mover);
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
        if ((Math.abs(b.position.x - a.position.x) < 10) && (Math.abs(b.position.y - a.position.y) < 10)) {
          if (!tuple) tuple = [b.id, a.id];
        }
      })
      return tuple;
    }).filter(t => !!t)

    // make a record of those deleted so we can remove them from the dom
    this.removedIds = new Set(collidingPairs.flat())
    collidingPairs.forEach(collidingPair => {
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
    // have to go in order from most specific to least specific to prevent false positives.
    // may just add a type field and do a strict equals check on that.
    if (mover instanceof ControlledMover) {
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
    } else if (mover instanceof Mover) {
      // no op on the x and y since change in angle will handle things for the bullets
      wallCorrectedX = Math.min(newX, WIDTH);
      wallCorrectedY = Math.min(newY, HEIGHT);
      if (newX < 0 || newX > WIDTH || newY < 0 || newY > HEIGHT) {
        // reverse the angle
        wallCorrectedSpeed = speed;
        wallCorrectedAngle = Math.abs(angle) % 180 === 0 
          ? angle + 180 
          : angle + 90;
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
      newMoverDiv.style.width = 10;
      newMoverDiv.style.height = 10;
      newMoverDiv.style.background = mover.color;
      newMoverDiv.id = mover.id;

      mainArea.appendChild(newMoverDiv);
    })
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
  constructor(initSpeed = 0, initAngle = 0) {
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
    this.color = "green";
  }
}

class Bullet extends Mover {}

class Asteroid extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "purple"
    this.velocity.speed = 2;
    this.velocity.angle = Math.floor(Math.random() * 360);
  }
}

// Has methods to update the velocity manually
class ControlledMover extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "red";

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
      this.velocity.angle += 15;
    } else if (direction === DIRECTIONS.RIGHT) {
      this.velocity.angle -= 15;
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
