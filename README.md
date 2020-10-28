# Asteroids
A work in progress, very low-res Asteroids remake. The main focus was on creating the more math-heavy simulation elements and core gameplay logic from scratch, so having a thin visualization layer on top is sufficient for now. With that being said, it's not that far off from the original game, and this version even has colors. 

Currently supported gameplay features:

* Multiple inputs processed per frame (e.g. turning and shooting at the same time)
* Realistic reflections of bullets off the boundaries of the game world
* Unlike bullets, Asteroids and you, the Player, will wrap around the edges of the world
* Fully functioning collision detection between bullets and asteroids

## Usage
1. Clone repo
2. `npm install`
3. `npx webpack` to produce the bundled js
4. Open  `dist/index.html` in Chrome/Firefox


## Gameplay

* WASD movement
* Spacebar to shoot
* Destroy all asteroids to win!
* Refresh the page to start over


## Architecture

Fundamentally, the architecture is inspired by [ECS](https://en.wikipedia.org/wiki/Entity_component_system). Each of the game `entities` is as 'dumb' as possible, being primarily a container for their state (defined in terms of `components`). They do expose what are essentially setter methods, though these could also be removed and put into the domain of the `system`s that drive all the core game logic.

Each tick of the game triggers a call to each of the `system`s that process some slice of the game logic. This is in contrast with perhaps the more typical polymorphic OO approach wherein each entity would define an `update` method that handles all its own update logic. Each entity still exposes methods to help update its internal state, but orchestration of these methods to achieve game-level logic are called by the higher level `system`.

That being said, this is a naive implementation because each system has to iterate through all entites and choose those that it applies to manually, whereas in a more mature solution you'd likely see each `system`declaratively define the `entities` it cares about, and the framework would provide them to the `system`. 

Other noteworthy points:

* Updates occur based on the ∆t strategy, meaning that things like position updates will be frame-rate independent because elapsed time between frames is what informs progression of the simulation. (Note: Repainting is of course tied to frame-rate, but the model data being rendered will be updated according to the elapsed time since last frame. For low frame rates, this would mean big position jumps at each painting, but conversely, high refresh rate displays won't cause the game to run at 2-4x speed.
* The main `gameModel` maintains a map (JS `object`) that tracks all entities in the game world. Each entity is given a randomly generated id upon creation to ensure uniqueness. 
* `requestAnimationFrame` is used to ensure the smoothest animations possible


### Motivation for ECS

 A concrete motivator for the ECS architecture is that in most game worlds, fundamental features such as collision (for the purposes of movement, combat, etc.) involve multiple entities, and detecting collisions requires knowledge of all entities' position data. Basically, operating from the individual entity's perspective is impractical and cumbersome, and it's natural to introduce `system`s that decouple the functions from the data and operate at a global level. 
 
 ## Planned enhancements
 * Asteroid splitting
 * Acceleration as a function of your thruster force (currently, acceleration occurs at arbitrarily chosen fixed rate)
 * Different weapon types/fire patterns
 * (Far into the future): Networking...
 * Web workers for performing all physics simulation work in a different thread
 * Convert to TypeScript
 * Resizable world size
 * Responsive top bar