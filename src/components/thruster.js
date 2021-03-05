export default class Thruster {
  constructor(thrusterForce = 10) {
    this.force = thrusterForce;
    // Will be updated by InputHandler system
    // Physics system will then reference this to see if it should update acceleration
    this.isEnabled = false;
  }
}