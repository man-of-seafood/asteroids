// Has methods to update the velocity manually
class ControlledMover extends Mover {
  constructor(opts = {}) {
    super(opts);
    this.color = "red";
    this.width = 10;
    this.height = 10;
    document.addEventListener("keypress", e => {
      const { code } = e;
      this.update(code);
    })
    console.log('this', this)
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
      // convert this into a setter and add it to the mover base class so that controlled movers and bullets can get this
      // the correction logic will be in there as well 
      this.updateAngle(-15);
      
    } else if (direction === DIRECTIONS.RIGHT) {
      this.updateAngle(15);
    }
  }

  shoot() {
    this.game.handleShoot(this)
  }
}