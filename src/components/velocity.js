/**
 * Represents a 2d velocity vector. Updates will be a function of thruster force and heading
 */
class Velocity {
  constructor(linearVelocities, angular = 0) {
    // Measured as px/s
    this.linear = linearVelocities
    // Will correspond to degrees/s.
    // key press will immediately update angular velocity instead of having it be acceleration-based (like will be the case
    // with the above linear velocity).
    this.angular = angular;
  }
}

export default Velocity;
