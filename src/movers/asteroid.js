import Mover from "./mover"

class Asteroid extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "purple"
    this.velocity.speed = 100;
    this.velocity.angle = Math.floor(Math.random() * 360);
    this.width = 10;
    this.height = 10;
  }
}

export default Asteroid;