// TODO: move these inside startGame (here for now for console debugging)
let players = {};
let player; // ourself/client avatar

(function startGame() {
  const ws = new WebSocket('ws://localhost:8080');
  const game = document.querySelector('#game');
  const scoreA = document.querySelector('#a.score');
  const scoreB = document.querySelector('#b.score');
  const ball = document.querySelector('.ball');
  let id;

  const socket = {
    send(message) {
      // append client id to all outgoing messages
      const messageWithId = Object.assign({}, message, {id: id});
      const msg = JSON.stringify(messageWithId);
      ws.send(msg);
    }
  };

  // update players' y reach based on number of players
  // the more players connected, the less players should be able to move
  const updatePlayers = function() {
    const playerKeys = Object.keys(players);
    const numPlayers = playerKeys.length;
    const height = 54.1; // height expressed in vw (percentage of width)
//    var reach = utils.getReach(numPlayers) * (height / 100);
    var reach = utils.getReach(numPlayers);

    playerKeys.forEach(function(key) {
      const plr = players[key];
      plr.paddleContainer.style.height = reach + 'vw';
      plr.paddle.style.top = plr.paddleContainer.style.height / 3 + 'vw';
    });
  };

  ws.onmessage = function(data, flags) {
    const msg = JSON.parse(data.data);
    // console.log('received message:', msg);

    const messageHandlers = {
      id() {
        id = msg.id;
      },
      spawnPlayer() {
        const isClient = msg.id === id;
        const options = {x: msg.x, y: msg.y, isClient};

        players[msg.id] = createPlayer(game, socket, options);
        updatePlayers();

        if (isClient) {
          player = players[msg.id];
        }
      },
      movePlayer() {
        // TODO: interpolate movement!
        if (msg.id !== id) { // ignore this msg if it's us!
          players[msg.id].paddle.style.top = msg.y + '%'; // update player position
        }
      },
      destroyPlayer() {
        if (players[msg.id]) {
          var plr = players[msg.id];
          plr.paddleContainer.removeChild(plr.paddle);
          game.removeChild(plr.paddleContainer);
          delete players[msg.id]; // remove player from players to update reach // TODO: is there a better way?
          updatePlayers();
        }
      },
      moveBall() {
        ball.style.left = msg.x + '%';
        ball.style.top = msg.y + '%';
      },
      score() {
        scoreA.innerHTML = msg.score.a;
        scoreB.innerHTML = msg.score.b;
      }
    };

    messageHandlers[msg.type]();
  };
}());
