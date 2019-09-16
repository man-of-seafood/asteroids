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