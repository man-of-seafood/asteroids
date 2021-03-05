import Mover from "./mover"
import Thruster from "../components/thruster"
import KEY_CODES from "../constants/keyCodes"

const { DIRECTIONS, SPACE } = KEY_CODES;

class ControlledMover extends Mover {
  constructor(opts = {}) {
    super(opts);
    // TODO: Play with the default force value
    this.thruster = new Thruster(3000);
    // Below should be bundled into 'Appearance' component.
    this.color = "red";
    this.width = 10;
    this.height = 10;

    // Instead of responding to key events as they happen, updates will take place at each tick,
    // taking into account the state of the keyStates mapping.
    this.keyStates = {};
    Object.values(DIRECTIONS).forEach(dir => {
      this.keyStates[dir] = false;
    });
    this.keyStates[SPACE] = false;

    document.addEventListener("keydown", e => this.setKeyActive(e.code))
    document.addEventListener("keyup", e => this.setKeyInactive(e.code))
  }

  setKeyActive(code) {
    this.keyStates[code] = true;
  }

  setKeyInactive(code) {
    this.keyStates[code] = false;
  }

  setMinimumSpeed(newMin) {
    this.minSpeed = newMin;
    if (this.velocity.speed < newMin) {
      this.velocity.speed = newMin;
    }
  }
}

export default ControlledMover;