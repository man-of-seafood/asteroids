import Mover from "./mover"

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

export default Bullet;