class Position {
  constructor(initX = 0 , initY = 0, heading = 0) {
    this.x = initX;
    this.y = initY;
    // This decouples the direction we're pointing from the velocity vector
    this.heading = heading;
  }
}

export default Position;
