import Velocity from "../graphics/velocity"
import Position from "../graphics/position"

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

  remove() {
    this.game.removeMover(this.id);
  }

}


export default Mover;