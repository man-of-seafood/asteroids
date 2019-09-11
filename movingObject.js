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
  }

  init() {
    // sets up thing to update the mover registry on an interval
    this.spawnControlledMover();
    this.reRender();

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
    this.spawnUncontrolledMover(bulletOpts)
  }

  spawnControlledMover() {
    const cMover = new ControlledMover({game: this});
    this.moverRegistry[cMover.id] = cMover;
  }

  spawnUncontrolledMover(opts) {
    const ucMover = new Mover(opts);
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

      console.log(`New temp position: (${newX}, ${newY})`)
      mover.position.x = wallCorrectedX;
      mover.position.y = wallCorrectedY;
      mover.velocity.speed = wallCorrectedSpeed;
      mover.velocity.angle = wallCorrectedAngle;
    })
  }

  // calculate border collision and
  handleWallCollisions(newX, newY, mover) {
    const { speed, angle } = mover.velocity;
    const { x, y } = mover.position;
    // assign the defaults since they may not change
    let wallCorrectedX = x;
    let wallCorrectedY = y;
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
      wallCorrectedX = x;
      wallCorrectedY = y;
      if (newX < 0 || newX > WIDTH || newY < 0 || newY > HEIGHT) {
        // reverse the angle
        wallCorrectedSpeed = speed;
        wallCorrectedAngle = angle + 90;
      }
    }
    return { wallCorrectedX, wallCorrectedY, wallCorrectedSpeed, wallCorrectedAngle };
  }

  // can also be used as the initial render call when using translations to animate
  reRender() {
    // iterate through moverRegistry and render divs at the proper coordinates
    // mixing model and view but yolo
    const mainArea = document.querySelector("#main-area")
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

// Has methods to update the velocity manually
class ControlledMover extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "red";

    document.addEventListener("keypress", e => {
      // debugger;
      const { code } = e;
      // console.log('Key code is:', code, typeof code)
      this.update(code);
    })
  }

  update(keyCode) {
    // debugger;
    const { DIRECTIONS, SPACE } = KEY_CODES;
    if (Object.values(DIRECTIONS).includes(keyCode)) this.updateVelocity(keyCode)
    else if (keyCode === SPACE) this.shoot();
  }
  updateVelocity(direction) {
    this.updateSpeed(direction);
    this.updateDirection(direction);
    // console.log('New speed', this.velocity.speed);
    // console.log('New direction', this.velocity.angle);
  }
  updateSpeed(direction) {
    // debugger;
    if (direction === DIRECTIONS.UP) {
      this.velocity.speed++;
    } else if (direction === DIRECTIONS.DOWN && this.velocity.speed > 0) {
      this.velocity.speed--;
    }
  }

  updateDirection(direction) {
    // debugger;
    if (direction === DIRECTIONS.LEFT) {
      this.velocity.angle += 15;
    } else if (direction === DIRECTIONS.RIGHT) {
      this.velocity.angle -= 15;
    }
  }

  shoot() {
    // create a new mover (bullet) with speed
    this.game.handleShoot(this)
  }
}

function init() {
  const game = new GameModel();
  game.init();
  window.game = game;
}

init();

