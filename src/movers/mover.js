import Velocity from "../components/velocity"
import Position from "../components/position"

class Mover {
  constructor({ initX, initY, initHeading, linearVelocities, angularVelocity = 0, mass = 1000, game } = {}) {
    this.velocity = new Velocity(linearVelocities, angularVelocity);
    this.position = new Position(initX, initY, initHeading);
    this.mass = mass; // kilos
    this.id = "id-" + Math.random().toString().substring(2);
    this.game = game;
    this.color = "";
    this.width = 1;
    this.height = 1;
  }


  calculateAcceptableAngle(rawAngle) {
    if (rawAngle <= 0) {
      const negativeAmount = rawAngle;
      return 360 + negativeAmount;
    } if (rawAngle > 360) {
      const amountAbove360 = rawAngle - 360;
      return  amountAbove360;
    }
    return rawAngle;
  }

  updateAngle(angleDelta) {
    const rawNewAngle = this.velocity.angle + angleDelta;
    this.velocity.angle = this.calculateAcceptableAngle(rawNewAngle);
  }

  setAngle(newAngle) {
    this.velocity.angle = this.calculateAcceptableAngle(newAngle);
  }

  updateVelocity() {

  }

  // TODO: this should definitely be a function on the top level game object
  // Entities shouldn't be able to remove themselves
  remove() {
    this.game.removeMover(this.id);
  }

}


export default Mover;