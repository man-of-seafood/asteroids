import GameModel from "gameModel"

function init() {
  const game = new GameModel();
  game.init();
  window.game = game;
}

init();
