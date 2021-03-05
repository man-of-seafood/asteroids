import Mover from "./mover"
// todo make constant for width/height
class Asteroid extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "purple";
    const size = Math.max(Math.random() * 100, 10);
    this.width = size;
    this.height = size;
    this.velocity.linear.x = Math.random() * 30 * (Math.random() > 0.5 ? 1 : -1);
    this.velocity.linear.y = Math.random() * 30 * (Math.random() > 0.5 ? 1 : -1);
  }
}

export default Asteroid;