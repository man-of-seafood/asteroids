import Mover from "./mover"
import KEY_CODES from "../constants/keyCodes"

const { DIRECTIONS } = KEY_CODES;

class ControlledMover extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "red";
    this.width = 10;
    this.height = 10;
    // Instead of responding to key events as they happen, updates will take place at each tick,
    // taking into account the state of the map.
    // mapping from keyCode to true/false
    this.keyStates = {};
    const { DIRECTIONS, SPACE } = KEY_CODES;
    Object.values(DIRECTIONS).forEach(dir => {
      this.keyStates[dir] = false;
    });
    this.keyStates[SPACE] = false;

    // document.addEventListener("keypress", e => {
    //   // console.log(`key ${e.code} (${e.keyCode}) has triggered keypress`)
    //   const { code } = e;
    //   this.update(code);
    // })

    document.addEventListener("keydown", e => this.setKeyActive(e.code))
    document.addEventListener("keyup", e => this.setKeyInactive(e.code))
  }
  setKeyActive(code) {
    console.log(`Setting key ${code} active`)
    // debugger;
    this.keyStates[code] = true;
  }

  setKeyInactive(code) {
    console.log(`Setting key ${code} inactive`)

    // debugger;
    this.keyStates[code] = false;
  }

  update(keyCode) {
    // console.log('update has been called to a keypress event')
    const { DIRECTIONS, SPACE } = KEY_CODES;
    if (Object.values(DIRECTIONS).includes(keyCode)) this.updateVelocity(keyCode)
    else if (keyCode === SPACE) this.shoot();
  }
  updateVelocity(direction) {
    this.updateSpeed(direction);
    this.updateDirection(direction);
  }
  updateSpeed(direction) {
    if (direction === DIRECTIONS.UP) {
      this.velocity.speed+= 0.3;
    } else if (direction === DIRECTIONS.DOWN && this.velocity.speed > 0) {
      this.velocity.speed= Math.max(0, this.velocity.speed - 0.3);
    }
  }

  updateDirection(direction) {
    if (direction === DIRECTIONS.LEFT) {
      // convert this into a setter and add it to the mover base class so that controlled movers and bullets can get this
      // the correction logic will be in there as well 
      this.updateAngle(-5);
      
    } else if (direction === DIRECTIONS.RIGHT) {
      this.updateAngle(5);
    }
  }

  shoot() {
    this.game.handleShoot(this)
  }
}

export default ControlledMover;