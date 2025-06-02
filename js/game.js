/* js/game.js: 
   - MemoryGame base constructor (using prototype inheritance)
   - EnhancedMemoryGame subclass extends MemoryGame
   - Dynamic SVG insertion, Drag & Drop, WebSocket stub, History API, prototype chaining
*/

// ─────────────────────────────────────────────────────────────────────────────
// 1) Base Constructor: MemoryGame
//    Implements core matching logic, timer, moves, and notifications
// ─────────────────────────────────────────────────────────────────────────────

function MemoryGame(gridContainerId, moveCountElemId, timerElemId) {
  // DOM references
  this.gridContainer = document.getElementById(gridContainerId);
  this.moveCountElem = document.getElementById(moveCountElemId);
  this.timerElem = document.getElementById(timerElemId);

  // Game state
  this.cards = [];           // Array of { id, faceValue, isFlipped, isMatched, element }
  this.firstCard = null;
  this.secondCard = null;
  this.moves = 0;
  this.timer = null;
  this.secondsElapsed = 0;
  this.gameOver = false;
  this.gameStarted = false;  // Starts false until "Start Game" is clicked

  // Audio elements
  this.audioFlip = document.getElementById('flip-sound');
  this.audioMatch = document.getElementById('match-sound');
  this.bgMusic = document.getElementById('bg-music');
  this.bgMusicStarted = false;

  // Default grid size
  this.rows = 4;
  this.cols = 4;
  this.totalPairs = (this.rows * this.cols) / 2;

  // Immediately generate a face-down grid—but do not start timer
  this.generateCards();
  this.renderGrid();

  // Attach card‐click handler (will be gated by this.gameStarted)
  var self = this;
  this.gridContainer.addEventListener('click', function(e) {
    self.handleClick(e);
  });

  // Prepare notifications (permission request)
  this.setupNotifications();
}

/* ---- prototype methods for MemoryGame ---- */

MemoryGame.prototype.setupNotifications = function() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported.');
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(function(permission) {
      console.log('Notification permission:', permission);
    });
  }
};

MemoryGame.prototype.startTimer = function() {
  if (this.timer) clearInterval(this.timer);
  this.secondsElapsed = 0;
  this.timerElem.textContent = '00:00';
  var self = this;
  this.timer = setInterval(function() {
    self.secondsElapsed++;
    var mm = String(Math.floor(self.secondsElapsed / 60)).padStart(2, '0');
    var ss = String(self.secondsElapsed % 60).padStart(2, '0');
    self.timerElem.textContent = mm + ':' + ss;
  }, 1000);
};

MemoryGame.prototype.loadGridSize = function(rows, cols) {
  this.rows = rows;
  this.cols = cols;
  this.totalPairs = (rows * cols) / 2;
  this.resetGameData();
  this.generateCards();
  this.renderGrid();
};

MemoryGame.prototype.resetGameData = function() {
  clearInterval(this.timer);
  this.cards = [];
  this.firstCard = null;
  this.secondCard = null;
  this.moves = 0;
  this.secondsElapsed = 0;
  this.gameOver = false;
  this.gameStarted = false;
  this.moveCountElem.textContent = '0';
  this.timerElem.textContent = '00:00';
  this.gridContainer.innerHTML = '';
};

MemoryGame.prototype.generateCards = function() {
  var faceValues = [];
  for (var i = 1; i <= this.totalPairs; i++) {
    faceValues.push(i);
  }
  var pairs = faceValues.concat(faceValues);
  // Shuffle
  for (var i = pairs.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = pairs[i];
    pairs[i] = pairs[j];
    pairs[j] = temp;
  }
  this.cards = pairs.map(function(value, index) {
    return {
      id: index,
      faceValue: value,
      isFlipped: false,
      isMatched: false,
      element: null
    };
  });
};

MemoryGame.prototype.renderGrid = function() {
  // Clear container
  this.gridContainer.innerHTML = '';

  // Apply grid size class
  this.gridContainer.classList.remove('size-4x4', 'size-4x6', 'size-6x6');
  var sizeClass = 'size-' + this.rows + 'x' + this.cols;
  this.gridContainer.classList.add(sizeClass);

  var self = this;
  this.cards.forEach(function(cardObj) {
    var cardElem = document.createElement('div');
    cardElem.classList.add('card');
    cardElem.setAttribute('draggable', 'true'); // make draggable
    cardElem.dataset.id = cardObj.id;

    var inner = document.createElement('div');
    inner.classList.add('card__inner');

    var faceFront = document.createElement('div');
    faceFront.classList.add('card__face', 'card__face--front');

    // Instead of <img>, we’ll insert an inline SVG dynamically
    var faceBack = document.createElement('div');
    faceBack.classList.add('card__face', 'card__face--back');

    // Placeholder: we’ll fetch the SVG after render
    faceBack.innerHTML = '<div class="svg-placeholder"></div>';

    inner.appendChild(faceFront);
    inner.appendChild(faceBack);
    cardElem.appendChild(inner);

    cardObj.element = cardElem;
    self.gridContainer.appendChild(cardElem);

    // Attach dragstart listener
    cardElem.addEventListener('dragstart', function(ev) {
      self.onDragStart(ev, cardObj);
    });
  });

  // After adding all card elements, fetch and inline each SVG
  this._inlineAllSVGs();
};

// Helper: fetch each iconN.svg and inline it
MemoryGame.prototype._inlineAllSVGs = function() {
  var self = this;
  this.cards.forEach(function(cardObj) {
    var iconPath = 'assets/svg/icon' + cardObj.faceValue + '.svg';
    fetch(iconPath)
      .then(function(response) {
        return response.text();
      })
      .then(function(svgText) {
        // Parse the SVG text as DOM
        var parser = new DOMParser();
        var doc = parser.parseFromString(svgText, 'image/svg+xml');
        var svgNode = doc.documentElement;

        // Attach an event listener to the SVG element
        svgNode.addEventListener('click', function() {
          console.log('SVG icon clicked, faceValue =', cardObj.faceValue);
          // Example: highlight on click
          svgNode.style.filter = 'brightness(1.2)';
          setTimeout(function() {
            svgNode.style.filter = '';
          }, 200);
        });

        // Replace the placeholder in cardElem
        var placeholder = cardObj.element.querySelector('.svg-placeholder');
        placeholder.replaceWith(svgNode);
      })
      .catch(function(err) {
        console.error('Failed to fetch SVG:', iconPath, err);
      });
  });
};

MemoryGame.prototype.handleClick = function(e) {
  if (!this.gameStarted) return;
  if (this.gameOver) return;

  // On first click, start music if not started
  if (!this.bgMusicStarted) {
    this.bgMusicStarted = true;
    this.bgMusic.play().catch(function(err) {
      console.warn('Music play failed:', err);
    });
  }

  var clickedCardElem = e.target.closest('.card');
  if (!clickedCardElem) return;
  if (clickedCardElem.classList.contains('flipped') ||
      clickedCardElem.classList.contains('matched')) {
    return;
  }

  var cardId = parseInt(clickedCardElem.dataset.id, 10);
  var cardObj = this.cards.find(function(c) { return c.id === cardId; });
  if (!cardObj) return;
  this.flipCard(cardObj);
};

MemoryGame.prototype.flipCard = function(cardObj) {
  if (this.firstCard && this.secondCard) return;

  cardObj.isFlipped = true;
  cardObj.element.classList.add('flipped');
  this.audioFlip.currentTime = 0;
  this.audioFlip.play();

  if (!this.firstCard) {
    this.firstCard = cardObj;
    return;
  }

  if (cardObj !== this.firstCard) {
    this.secondCard = cardObj;
    this.moves++;
    this.moveCountElem.textContent = this.moves;

    if (this.firstCard.faceValue === this.secondCard.faceValue) {
      this.audioMatch.currentTime = 0;
      this.audioMatch.play();
      this.firstCard.isMatched = true;
      this.secondCard.isMatched = true;
      this.firstCard.element.classList.add('matched');
      this.secondCard.element.classList.add('matched');

      // After a short delay, push a new history state
      this._pushHistoryState();

      // Reset flip references
      this.firstCard = null;
      this.secondCard = null;

      // Check for game over
      var allMatched = this.cards.every(function(c) { return c.isMatched; });
      if (allMatched) {
        this.endGame();
      }
    } else {
      var self = this;
      setTimeout(function() {
        self.firstCard.isFlipped = false;
        self.secondCard.isFlipped = false;
        self.firstCard.element.classList.remove('flipped');
        self.secondCard.element.classList.remove('flipped');
        self.firstCard = null;
        self.secondCard = null;

        // Also push state after a mismatch
        self._pushHistoryState();
      }, 1000);
    }
  }
};

MemoryGame.prototype.endGame = function() {
  clearInterval(this.timer);
  this.gameOver = true;

  // Update stats:
  $('#final-time').text(this.timerElem.textContent);
  $('#final-moves').text(this.moves);

  // Show the overlay by removing 'hidden'
  $('#game-over-overlay').removeClass('hidden');
};

// And your “Play Again” button:
$('#play-again-btn').on('click', function() {
  $('#game-over-overlay').addClass('hidden');  // hide it again
  window.location.reload();                     // or reset state
});

// Drag & Drop: when a drag starts on a card
MemoryGame.prototype.onDragStart = function(ev, cardObj) {
  // Only allow dragging if card is matched
  if (!cardObj.isMatched) {
    ev.preventDefault();
    return;
  }
  ev.dataTransfer.setData('text/plain', cardObj.id);
  ev.dataTransfer.effectAllowed = 'move';
};

// Push a snapshot of current game state into browser history
MemoryGame.prototype._pushHistoryState = function() {
  var state = {
    cards: this.cards.map(function(c) {
      return { id: c.id, isFlipped: c.isFlipped, isMatched: c.isMatched };
    }),
    moves: this.moves,
    time: this.secondsElapsed,
    rows: this.rows,
    cols: this.cols
  };
  var url = window.location.pathname + '?state=' + btoa(JSON.stringify(state));
  history.pushState(state, '', url);
};

// Restore game state when popstate is triggered
MemoryGame.prototype._restoreState = function(state) {
  if (!state) return;
  // Stop current timer
  clearInterval(this.timer);
  this.cards.forEach(function(cardObj) {
    var matching = state.cards.find(function(s) { return s.id === cardObj.id; });
    if (matching) {
      cardObj.isFlipped = matching.isFlipped;
      cardObj.isMatched = matching.isMatched;
      if (matching.isFlipped) {
        cardObj.element.classList.add('flipped');
      } else {
        cardObj.element.classList.remove('flipped');
      }
      if (matching.isMatched) {
        cardObj.element.classList.add('matched');
      } else {
        cardObj.element.classList.remove('matched');
      }
    }
  });
  this.moves = state.moves;
  this.moveCountElem.textContent = this.moves;
  this.secondsElapsed = state.time;
  var mm = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
  var ss = String(this.secondsElapsed % 60).padStart(2, '0');
  this.timerElem.textContent = mm + ':' + ss;
  // I do not restart timer automatically upon navigation; I would  manually call startTimer if needed
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) EnhancedMemoryGame: Subclass that “inherits” from MemoryGame
//    Uses prototypal inheritance (Object.create) and extends functionality
// ─────────────────────────────────────────────────────────────────────────────

function EnhancedMemoryGame(gridContainerId, moveCountElemId, timerElemId) {
  // Call the base constructor
  MemoryGame.call(this, gridContainerId, moveCountElemId, timerElemId);

  // Additional initialization for drag‐and‐drop and WebSocket
  this._setupDragAndDrop();
  this._initWebSocket();       // stub
  this._listenHistoryPopState();
}

// Inherit prototype from MemoryGame
EnhancedMemoryGame.prototype = Object.create(MemoryGame.prototype);
EnhancedMemoryGame.prototype.constructor = EnhancedMemoryGame;

/* 
 * Override renderGrid so that after base rendering, also
 * attach 'dragover' and 'drop' handlers to the matched zone.
 */
EnhancedMemoryGame.prototype.renderGrid = function() {
  // ────────────────────────────────────────────────────────────────────────
  // Capture `this` so inner callbacks can refer to the correct instance.
  // ────────────────────────────────────────────────────────────────────────
  var self = this;

  // Call the base class’s renderGrid to generate all .card elements
  MemoryGame.prototype.renderGrid.call(this);

  // Now that all cards are in #game-grid, attach drag‐and‐drop to #matched-zone
  var matchedZone = document.getElementById('matched-zone');

  matchedZone.addEventListener('dragover', function(ev) {
    ev.preventDefault();
    matchedZone.classList.add('over');
  });

  matchedZone.addEventListener('dragleave', function(ev) {
    matchedZone.classList.remove('over');
  });

  matchedZone.addEventListener('drop', function(ev) {
    ev.preventDefault();
    matchedZone.classList.remove('over');


    var cardId = ev.dataTransfer.getData('text/plain');
    var cardObj = self.cards.find(function(c) {
      return c.id === parseInt(cardId, 10);
    });

    if (cardObj && cardObj.isMatched) {
      // 1) Clone the original card element, append the clone into the matched‐zone.
      var clonedCard = cardObj.element.cloneNode(true);
      clonedCard.classList.add('archived');
      // Remove draggable from the clone so the user doesn’t accidentally drag it again
      clonedCard.removeAttribute('draggable');
      matchedZone.appendChild(clonedCard);

      // 2) Hide the ORIGINAL card in the grid (so its spot remains but is invisible).
      cardObj.element.classList.add('hidden-card');

      // 3) Find and hide the twin (other card with same faceValue).
      var twinCard = self.cards.find(function(c) {
        return c.faceValue === cardObj.faceValue
          && c.id !== cardObj.id
          && !c.element.classList.contains('hidden-card');
      });
      if (twinCard) {
        twinCard.element.classList.add('hidden-card');
      }
    }
  });
};

EnhancedMemoryGame.prototype._setupDragAndDrop = function() {
  // set each card's draggable="true" in base class


};

EnhancedMemoryGame.prototype._initWebSocket = function() {
  var self = this;
  // NOTE: This is a stub. need a real WebSocket server URL for full functionality.
  try {
    this.socket = new WebSocket('wss://echo.websocket.org'); 
  } catch (err) {
    console.warn('WebSocket connection failed:', err);
    return;
  }

  this.socket.addEventListener('open', function() {
    console.log('WebSocket connection opened.');
    self._appendChatLog('System: Connected to WebSocket (echo server).');
  });
  this.socket.addEventListener('message', function(event) {
    var msg = event.data;
    self._appendChatLog('Peer: ' + msg);
  });
  this.socket.addEventListener('close', function() {
    console.log('WebSocket connection closed.');
    self._appendChatLog('System: Disconnected from WebSocket.');
  });
  this.socket.addEventListener('error', function(error) {
    console.error('WebSocket error:', error);
    self._appendChatLog('System: WebSocket error.');
  });
};

// Append a message to the chat log (HTML)
EnhancedMemoryGame.prototype._appendChatLog = function(text) {
  var log = document.getElementById('chat-log');
  var p = document.createElement('p');
  p.textContent = text;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
};

EnhancedMemoryGame.prototype.performStartSequence = function() {
  // Same logic as base, we ensure history is updated as well
  this.gameStarted = true;
  $('#difficulty-select').prop('disabled', true);
  if (!this.bgMusicStarted) {
    this.bgMusicStarted = true;
    this.bgMusic.play().catch(function(err) {
      console.warn('Music play failed:', err);
    });
  }

  // Flip all cards face-up
  this.cards.forEach(function(c) {
    c.isFlipped = true;
    c.element.classList.add('flipped');
  });

  var self = this;
  setTimeout(function() {
    self.cards.forEach(function(c) {
      if (!c.isMatched) {
        c.isFlipped = false;
        c.element.classList.remove('flipped');
      }
    });
    self.startTimer();
    // Push initial state into history
    self._pushHistoryState();
  }, 5000);
};

EnhancedMemoryGame.prototype._listenHistoryPopState = function() {
  var self = this;
  window.addEventListener('popstate', function(event) {
    var state = event.state;
    if (state) {
      self._restoreState(state);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 3 DOM : instantiate EnhancedMemoryGame and wire up UI buttons
// ─────────────────────────────────────────────────────────────────────────────

$(function() {
  $('#game-over-modal').addClass('hidden');
  var username = localStorage.getItem('memoryGameUser');
  $('#player-name').text(username);

  // Instantiate the Enhanced version
  var game = new EnhancedMemoryGame('game-grid', 'move-count', 'timer');

  // Start Game button
  $('#start-game-btn').on('click', function() {
    if (game.gameStarted) return;
    game.performStartSequence();
    $(this).prop('disabled', true);
  });



  //Results button in the header
  $('#go-to-results-btn').on('click', function() {
    window.location.href = 'results.html';
  });

  // Music toggle button
  $('#toggle-music-btn').on('click', function() {
    if (game.bgMusic.paused) {
      game.bgMusic.play().catch(function(err) {
        console.warn(err);
      });
      $(this).text('🔈 Music On');
    } else {
      game.bgMusic.pause();
      $(this).text('🔇 Music Off');
    }
  });

  // Save Result button
  $('#save-result-btn').on('click', function () {
    if (navigator.onLine) {
      const results = JSON.parse(localStorage.getItem('memoryGameResults') || '[]');
  
 
      const rawDiff = $('#difficulty-select').val();
      let difficultyLabel = '4 × 4';
      if (rawDiff === '4x6') difficultyLabel = '4 × 6';
      else if (rawDiff === '6x6') difficultyLabel = '6 × 6';
  

      results.push({
        date: new Date().toISOString(),
        username: username,
        difficulty: difficultyLabel,  // 
        moves: game.moves,            
        time: game.timerElem.textContent 
      });
  
      localStorage.setItem('memoryGameResults', JSON.stringify(results));
      window.location.href = 'results.html';
    } else {
      alert('You are offline. Cannot save the result.');
    }
  });

  // Play Again button
  $('#play-again-btn').on('click', function() {
    window.location.reload();
  });

// Difficulty select change
$('#difficulty-select').on('change', function() {
  if (game.gameStarted) {
    $(this).prop('disabled', true);
    return;
  }

  var val = $(this).val(); // "4x4", "4x6", "6x6"
  var rows = 4, cols = 4;
  var sizeClass = 'size-4x4'; // default

  if (val === '4x4') {
    rows = 4; 
    cols = 4;
    sizeClass = 'size-4x4';
  } else if (val === '4x6') {
    rows = 4; 
    cols = 6;
    sizeClass = 'size-4x6';
  } else if (val === '6x6') {
    rows = 6; 
    cols = 6;
    sizeClass = 'size-6x6';
  }

  // Rebuild game grid at the new size
  game.loadGridSize(rows, cols);

  // Reset the move counter display
  $('#move-count').text('0');

  // Update #matched-zone to have exactly one size class
  $('#matched-zone')
    .removeClass('size-4x4 size-4x6 size-6x6')
    .addClass(sizeClass);
});
  // Chat: send stub message via WebSocket
  $('#chat-send-btn').on('click', function() {
    var msg = $('#chat-input').val().trim();
    if (!msg || !game.socket || game.socket.readyState !== WebSocket.OPEN) {
      alert('Chat server is not connected or message is empty.');
      return;
    }
    game.socket.send(msg);
    game._appendChatLog('You: ' + msg);
    $('#chat-input').val('');
  });

  // Initialize “drop” area CSS highlight removal
  $('#matched-zone').on('dragleave', function() {
    $(this).removeClass('over');
  });
});
