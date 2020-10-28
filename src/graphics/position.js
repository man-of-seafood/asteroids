class Position {
  constructor(initX = 0 , initY = 0) {
    this.x = initX
    this.y = initY
    // TODO: This will be used to decouple orientation from velocity
    this.angle = 0
  }
}

export default Position;
