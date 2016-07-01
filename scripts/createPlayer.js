const createPlayer = function(game, options) {
  const paddleContainer = PaddleContainer();
  game.appendChild(paddleContainer);

  paddleContainer.style.left = options.x + 'vw';
  paddleContainer.style.top = options.y + 'vw';

  const paddle = Paddle();
  paddleContainer.appendChild(paddle);

  paddle.style.backgroundColor = utils.randomColor();
  paddleContainer.appendChild(paddle);
  
  if (options.isClient) {
    let startY = 0;

    game.addEventListener('mousemove', function(event) {
      let newY = event.clientY - startY;
      const maxY = paddleContainer.offsetHeight - paddle.offsetHeight;
      newY = newY < 0 ? 0 : newY > maxY ? maxY : newY;
      paddle.style.top = newY;

      if (newY === 0) {
        startY = event.clientY;
      } else if (newY === maxY) {
        startY = event.clientY - maxY;
      }
    });
  }
};
