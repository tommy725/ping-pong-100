'use strict';

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });
const utils = require('./utils');

wss.broadcast = function broadcast(msg) {
  const str = JSON.stringify(msg);

  wss.clients.forEach(function(client) {
    client.send(str);
  });
};

const idGen = (function() {
  let id = 0;
  return function() {
    return 'user' + id++;
  };
}());

let paddleContainerHeight;

const updatePlayerPositions = function() {
  const courtWidth = 98;
  const courtHeight = 54.25;
  const paddleContainerWidth = 1;
  const numPlayers = wss.clients.length;
  const playerCountIsEven = numPlayers % 2 === 0;
  paddleContainerHeight = utils.getReach(numPlayers);

  wss.clients.forEach(function(ws) {
    const x = (function() {
      if (ws.position) {
        return ws.position.x;
      }
      if (playerCountIsEven) {
        // spawn on right side
        return utils.randomIntBetween(courtWidth / 2, courtWidth - paddleContainerWidth);
      } else {
        // spawn on left side
        return utils.randomIntBetween(0, courtWidth / 2 - paddleContainerWidth);
      }
    }());
    const y = utils.randomIntBetween(0, courtHeight - paddleContainerHeight);
    wss.broadcast({type: 'destroyPlayer', id: ws.id});
    // randomize player positions
    ws.position = { x, y };
    wss.broadcast({type: 'spawnPlayer', id: ws.id, x, y});
  });
};

wss.on('connection', function connection(ws) {
  const id = idGen();
  console.log(id, 'connected');
  ws.id = id;
  ws.paddle = { y: 33 }; // initialize paddle position within paddleContainer to 33%

  // we always want to stringify our data
  ws.sendStr = function(msg) {
    if (wss.clients.indexOf(ws) === -1) {
      return;
    }
    ws.send(JSON.stringify(msg));
  };

  ws.sendStr({ type: 'id', id }); // inform client of its id

  // spawn/respawn all players with new positions based on number of connected clients
  // TODO: bear in mind we have a paddle container position (player movement boundaries)
  // and a vertical position within that which player can set by moving the mouse.
  // consider removing the container element and simply defining a max and min y value.
  updatePlayerPositions();

  ws.on('close', function() {
    wss.broadcast({type: 'destroyPlayer', id: id});
    updatePlayerPositions();
  });

  ws.on('message', function incoming(message) {
    const msg = JSON.parse(message);
    const messageHandlers = {
      movePlayer() {
        // TODO: see what happens if client sends a message with a y < 0 or > 100. prevent cheating if necessary.
        ws.paddle = { y: msg.y };
        wss.broadcast(msg);
      }
    };
    messageHandlers[msg.type]();
  });
});

// server game loop
const fps = 6;
const refreshRate = 1000 / fps;
const newBall = function() {
  return {
    position: { x: 50, y: 50 },
    velocity: { x: -2, y: -3 }
  };
};
const newScore = function() {
  // teams A & B
  return { a: 0, b: 0 }
}
let ball = newBall();
let score = newScore();

const loop = setInterval(function() {
  ball.position.x = ball.position.x + ball.velocity.x;
  ball.position.y = ball.position.y + ball.velocity.y;

  // bounce off the walls if we hit them
  if (ball.position.y < 0 || ball.position.y > 100) {
    ball.velocity.y = -ball.velocity.y;
  }

  // bounce off of paddles if we hit them
  // loop through paddles and calculate bounds of each based on paddle height, current positions and container heights
  let hasBounced = false;
  wss.clients.forEach(function(client) {
    if (hasBounced) {
      return;
    }
    const paddleHeight = 5;
    const paddleWidth = 1;

    if (ball.position.x >= client.position.x &&
        ball.position.x <= client.position.x + paddleWidth &&
        ball.position.y >= client.position.y + ((client.paddle.y / 100) * paddleContainerHeight) &&
        ball.position.y <= client.position.y + ((client.paddle.y / 100) * paddleContainerHeight) + paddleHeight) {
        ball.velocity.x = -ball.velocity.x;
        hasBounced = true;
    }
  });

  // update score and reposition ball if a goal is scored
  if (ball.position.x < 0) {
    score.b++;
    ball = newBall();
    wss.broadcast({ type: 'score', score });
  } else if (ball.position.x > 100) {
    score.a++;
    ball = newBall();
    wss.broadcast({ type: 'score', score });
  }

  // reset game at 11 points
  if (score.a >= 11 || score.b >= 11) {
    score = newScore();
  } else {
    wss.broadcast({ type: 'moveBall', x: ball.position.x, y: ball.position.y });
  }
}, refreshRate);
