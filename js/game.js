/* js/game.js: Implementation of Memory Game with SVG icons, difficulty levels, flip animation, and push notifications */

class MemoryGame {
  /**
   * @param {string} gridContainerId — ID of the div where cards will be placed
   * @param {string} moveCountElemId — ID of the element displaying move count
   * @param {string} timerElemId — ID of the element displaying timer
   */
  constructor(gridContainerId, moveCountElemId, timerElemId) {
    this.gridContainer = document.getElementById(gridContainerId);
    this.moveCountElem = document.getElementById(moveCountElemId);
    this.timerElem = document.getElementById(timerElemId);

    this.cards = []; // array of { id, faceValue, isFlipped, isMatched, element }
    this.firstCard = null;
    this.secondCard = null;
    this.moves = 0;
    this.timer = null;
    this.secondsElapsed = 0;
    this.gameOver = false;

    this.audioFlip = document.getElementById('flip-sound');
    this.audioMatch = document.getElementById('match-sound');
    this.bgMusic = document.getElementById('bg-music');
    this.bgMusicStarted = false;

    // Default grid size 4x4
    this.rows = 4;
    this.cols = 4;
    this.totalPairs = (this.rows * this.cols) / 2;

    this.init();
  }

  init() {
    // 1) Attach event listeners and start background music on first click
    this.setupNotifications();
    this.gridContainer.addEventListener('click', (e) => this.handleClick(e));

    // 2) Initialize timer
    this.startTimer();

    // 3) Load initial grid (4x4)
    this.loadGridSize(this.rows, this.cols);

    // 4) Start background music after first user gesture
    //    (handled inside handleClick)
  }

  /**
   * Set up Notification permission if not already granted/denied
   */
  setupNotifications() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission:', permission);
      });
    }
  }

  /**
   * Load grid of given rows and columns,
   * generate pairs of SVG icons accordingly.
   * @param {number} rows
   * @param {number} cols
   */
  loadGridSize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.totalPairs = (rows * cols) / 2;
    this.resetGameData();
    this.generateCards();
    this.renderGrid();
  }

  /**
   * Reset all game data (cards, moves, timer, flags)
   */
  resetGameData() {
    clearInterval(this.timer);
    this.cards = [];
    this.firstCard = null;
    this.secondCard = null;
    this.moves = 0;
    this.secondsElapsed = 0;
    this.gameOver = false;
    this.moveCountElem.textContent = '0';
    this.timerElem.textContent = '00:00';
    this.gridContainer.innerHTML = ''; // clear cards in DOM
    this.startTimer();
  }

  /**
   * Generate an array of card objects:
   * faceValue is a number (1..18) that corresponds to iconX.svg.
   */
  generateCards() {
    // We may have up to 18 pairs, so we assume we have icon1.svg..icon18.svg in assets/svg/
    const faceValues = [];
    for (let i = 1; i <= this.totalPairs; i++) {
      faceValues.push(i);
    }
    // Duplicate to make pairs
    const pairs = faceValues.concat(faceValues);
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    // Build card objects
    this.cards = pairs.map((value, index) => ({
      id: index,
      faceValue: value, // integer from 1..totalPairs
      isFlipped: false,
      isMatched: false,
      element: null, // will be assigned DOM element after render
    }));
  }

  /**
   * Render the grid of cards in the DOM,
   * applying appropriate CSS classes for grid size.
   */
  renderGrid() {
    // Remove existing grid-size classes
    this.gridContainer.classList.remove('size-4x4', 'size-4x6', 'size-6x6');

    // Add new class based on rows x cols
    const className = `size-${this.rows}x${this.cols}`;
    this.gridContainer.classList.add(className);

    // For each card in this.cards, create a .card element and insert into DOM
    this.cards.forEach((cardObj) => {
      const cardElem = document.createElement('div');
      cardElem.classList.add('card');
      cardElem.dataset.id = cardObj.id; // so we can find it on click

      // Inner container for flip animation
      const inner = document.createElement('div');
      inner.classList.add('card__inner');

      // Front face (back of card)
      const faceFront = document.createElement('div');
      faceFront.classList.add('card__face', 'card__face--front');
      // We could put a pattern or just a solid color – оставляем заливку

      // Back face (revealed icon)
      const faceBack = document.createElement('div');
      faceBack.classList.add('card__face', 'card__face--back');
      const img = document.createElement('img');
      img.src = `assets/svg/icon${cardObj.faceValue}.svg`;
      img.alt = `Icon ${cardObj.faceValue}`;
      faceBack.appendChild(img);

      inner.appendChild(faceFront);
      inner.appendChild(faceBack);
      cardElem.appendChild(inner);

      // Attach DOM element to cardObj
      cardObj.element = cardElem;

      this.gridContainer.appendChild(cardElem);
    });
  }

  /**
   * Start the game timer (increments every second).
   */
  startTimer() {
    this.timer = setInterval(() => {
      this.secondsElapsed++;
      const minutes = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
      const seconds = String(this.secondsElapsed % 60).padStart(2, '0');
      this.timerElem.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  /**
   * Handle click events on the grid container.
   * Identify which card was clicked and flip logic.
   */
  handleClick(e) {
    // On first click, start background music
    if (!this.bgMusicStarted) {
      this.bgMusicStarted = true;
      this.bgMusic.play().catch((err) => {
        console.warn('Failed to play background music:', err);
      });
    }

    if (this.gameOver) return;

    // Find closest .card ancestor
    const cardElem = e.target.closest('.card');
    if (!cardElem || cardElem.classList.contains('flipped') || cardElem.classList.contains('matched'))
      return;

    const cardId = parseInt(cardElem.dataset.id, 10);
    const cardObj = this.cards.find((c) => c.id === cardId);
    if (!cardObj) return;

    // Flip this card
    this.flipCard(cardObj);
  }

  /**
   * Flip a card and check for matches.
   * @param {object} cardObj 
   */
  flipCard(cardObj) {
    if (this.firstCard && this.secondCard) return; // waiting for previous pair to resolve

    cardObj.isFlipped = true;
    cardObj.element.classList.add('flipped');
    this.audioFlip.currentTime = 0;
    this.audioFlip.play();

    if (!this.firstCard) {
      this.firstCard = cardObj;
    } else if (cardObj !== this.firstCard) {
      this.secondCard = cardObj;
      this.moves++;
      this.moveCountElem.textContent = this.moves;

      // Check for match
      if (this.firstCard.faceValue === this.secondCard.faceValue) {
        this.audioMatch.currentTime = 0;
        this.audioMatch.play();
        this.firstCard.isMatched = true;
        this.secondCard.isMatched = true;
        this.firstCard.element.classList.add('matched');
        this.secondCard.element.classList.add('matched');

        this.firstCard = null;
        this.secondCard = null;

        // Check if game over
        if (this.cards.every((c) => c.isMatched)) {
          this.endGame();
        }
      } else {
        // If not matched, flip back after a short delay
        setTimeout(() => {
          this.firstCard.isFlipped = false;
          this.secondCard.isFlipped = false;
          this.firstCard.element.classList.remove('flipped');
          this.secondCard.element.classList.remove('flipped');
          this.firstCard = null;
          this.secondCard = null;
        }, 1000);
      }
    }
  }

  /**
   * Actions to take when all pairs are found.
   * Shows modal, stops timer, triggers notification.
   */
  endGame() {
    clearInterval(this.timer);
    this.gameOver = true;

    // Display in-modal stats
    $('#final-time').text(this.timerElem.textContent);
    $('#final-moves').text(this.moves);
    $('#game-over-modal').removeClass('hidden');

    // Show push notification if permitted
    if (Notification.permission === 'granted') {
      const notif = new Notification('Memory Game Completed!', {
        body: `You finished in ${this.moves} moves and ${this.timerElem.textContent}.`,
        icon: 'assets/svg/icon1.svg', // можно выбрать любую иконку
      });
      // auto-close notification after 5 seconds
      setTimeout(() => notif.close(), 5000);
    }
  }
}

$(function () {
  // Ensure modal is hidden on load
  $('#game-over-modal').addClass('hidden');

  const username = localStorage.getItem('memoryGameUser');
  $('#player-name').text(username);

  // Create game instance
  const game = new MemoryGame('game-grid', 'move-count', 'timer');

  // Handle "Save Result" button
  $('#save-result-btn').on('click', function () {
    if (navigator.onLine) {
      const results = JSON.parse(localStorage.getItem('memoryGameResults') || '[]');
      results.push({
        date: new Date().toISOString(),
        username: username,
        moves: game.moves,
        time: game.timerElem.textContent,
      });
      localStorage.setItem('memoryGameResults', JSON.stringify(results));
      window.location.href = 'results.html';
    } else {
      alert('You are offline. Cannot save the result.');
    }
  });

  // Handle "Play Again" button
  $('#play-again-btn').on('click', function () {
    // Reload the page to start fresh
    window.location.reload();
  });

  // Handle difficulty change
  $('#difficulty-select').on('change', function () {
    const val = $(this).val(); // "4x4" or "4x6" or "6x6"
    let rows = 4,
      cols = 4;
    if (val === '4x4') {
      rows = 4;
      cols = 4;
    } else if (val === '4x6') {
      rows = 4;
      cols = 6;
    } else if (val === '6x6') {
      rows = 6;
      cols = 6;
    }
    game.loadGridSize(rows, cols);
  });
});
