/* js/game.js: Implementation of Memory Game with SVG icons, difficulty levels,
   flip animation, push notifications, and a "Start Game" sequence */

   class MemoryGame {
    /**
     * @param {string} gridContainerId — ID of the div where cards will be placed
     * @param {string} moveCountElemId — ID of the element displaying move count
     * @param {string} timerElemId — ID of the element displaying timer
     */
    constructor(gridContainerId, moveCountElemId, timerElemId) {
      // Cache DOM elements
      this.gridContainer = document.getElementById(gridContainerId);
      this.moveCountElem = document.getElementById(moveCountElemId);
      this.timerElem = document.getElementById(timerElemId);
  
      // Game state
      this.cards = [];           // Array of card objects: { id, faceValue, isFlipped, isMatched, element }
      this.firstCard = null;     // First flipped card in a pair
      this.secondCard = null;    // Second flipped card in a pair
      this.moves = 0;            // Number of moves (pairs attempted)
      this.timer = null;         // Reference to the interval for timer
      this.secondsElapsed = 0;   // Seconds elapsed since official “start”
      this.gameOver = false;     // Flag indicating if game is finished
      this.gameStarted = false;  // Flag indicating if “Start Game” was clicked
  
      // Audio elements
      this.audioFlip = document.getElementById('flip-sound');
      this.audioMatch = document.getElementById('match-sound');
      this.bgMusic = document.getElementById('bg-music');
      this.bgMusicStarted = false;
  
      // Default grid size: 4×4
      this.rows = 4;
      this.cols = 4;
      this.totalPairs = (this.rows * this.cols) / 2;
  
      // Immediately generate and render a face‐down grid. But do NOT start timer or enable clicks yet.
      this.generateCards();
      this.renderGrid();
  
      // Set up click listener (but handleClick guards against !this.gameStarted)
      this.gridContainer.addEventListener('click', (e) => this.handleClick(e));
  
      // Prepare notifications and UI, but do not start the timer/music here
      this.setupNotifications();
    }
  
    /**
     * Request Notification API permission if not already granted/denied
     */
    setupNotifications() {
      if (!('Notification' in window)) {
        console.warn('Notifications API not supported in this browser.');
        return;
      }
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          console.log('Notification permission:', permission);
        });
      }
    }
  
    /**
     * Start or restart the timer that increments every second,
     * updating the timer element in the DOM.
     */
    startTimer() {
      // If a timer is already running, clear it first
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.secondsElapsed = 0;
      this.timerElem.textContent = '00:00';
  
      this.timer = setInterval(() => {
        this.secondsElapsed++;
        const mm = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
        const ss = String(this.secondsElapsed % 60).padStart(2, '0');
        this.timerElem.textContent = `${mm}:${ss}`;
      }, 1000);
    }
  
    /**
     * Load a new grid size (rows × cols). This method resets the game data,
     * generates new cards, and re-renders the grid.
     * @param {number} rows 
     * @param {number} cols 
     */
    loadGridSize(rows, cols) {
      // Update grid dimensions
      this.rows = rows;
      this.cols = cols;
      this.totalPairs = (rows * cols) / 2;
  
      // Reset state (stop timer, clear cards, reset counters)
      this.resetGameData();
  
      // Generate new shuffled cards and render
      this.generateCards();
      this.renderGrid();
    }
  
    /**
     * Reset all game data (stop timer, clear card array, counters, and DOM),
     * but do NOT start the timer immediately. Wait for user to click "Start Game" again.
     */
    resetGameData() {
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
      this.gridContainer.innerHTML = ''; // Clear all card elements in DOM
    }
  
    /**
     * Generate an array of card objects for the current grid size.
     * Each faceValue corresponds to iconX.svg in assets/svg/.
     */
    generateCards() {
      const faceValues = [];
      // Create an array [1, 2, ..., totalPairs]
      for (let i = 1; i <= this.totalPairs; i++) {
        faceValues.push(i);
      }
      // Duplicate values to form pairs: [1,2,...,totalPairs,1,2,...,totalPairs]
      const pairs = faceValues.concat(faceValues);
  
      // Shuffle the pairs array
      for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
      }
  
      // Build the card objects
      this.cards = pairs.map((value, index) => ({
        id: index,
        faceValue: value,   // Integer in [1..totalPairs]
        isFlipped: false,
        isMatched: false,
        element: null       // Will hold the DOM <div class="card"> later
      }));
    }
  
    /**
     * Render the HTML structure for all cards in the DOM.
     * Applies CSS classes to set grid columns and creates each card element.
     * Initially, all cards are face‐down since none have .flipped or .matched yet.
     */
    renderGrid() {
      // 1) Clear any existing cards in the container
      this.gridContainer.innerHTML = '';
  
      // 2) Remove old grid-size classes, then add the correct one
      this.gridContainer.classList.remove('size-4x4', 'size-4x6', 'size-6x6');
      const sizeClass = `size-${this.rows}x${this.cols}`;
      this.gridContainer.classList.add(sizeClass);
  
      // 3) For each card object, create its <div> markup and append
      this.cards.forEach((cardObj) => {
        // Outer wrapper for card
        const cardElem = document.createElement('div');
        cardElem.classList.add('card');
        cardElem.dataset.id = cardObj.id; // So we can identify which card was clicked
  
        // Inner container (used for 3D flip animation)
        const inner = document.createElement('div');
        inner.classList.add('card__inner');
  
        // Front face (backside of card)
        const faceFront = document.createElement('div');
        faceFront.classList.add('card__face', 'card__face--front');
  
        // Back face (revealed SVG icon)
        const faceBack = document.createElement('div');
        faceBack.classList.add('card__face', 'card__face--back');
        const img = document.createElement('img');
        img.src = `assets/svg/icon${cardObj.faceValue}.svg`;
        img.alt = `Icon ${cardObj.faceValue}`;
        faceBack.appendChild(img);
  
        // Build the DOM structure: <div.card> → <div.card__inner> → [front, back]
        inner.appendChild(faceFront);
        inner.appendChild(faceBack);
        cardElem.appendChild(inner);
  
        // Save reference to this element in the card object
        cardObj.element = cardElem;
  
        // Append card to grid container
        this.gridContainer.appendChild(cardElem);
      });
    }
  
    /**
     * Handle click events delegated from gridContainer.
     * - If the game hasn't started (gameStarted===false), do nothing.
     * - If a card is clicked, flip it and check for matches.
     * @param {Event} e 
     */
    handleClick(e) {
      // Do nothing if the game hasn't officially started
      if (!this.gameStarted) return;
  
      // Do nothing if game is already over
      if (this.gameOver) return;
  
      // 1) On first user click (after the 5‐second face-up period), attempt to play background music
      if (!this.bgMusicStarted) {
        this.bgMusicStarted = true;
        this.bgMusic.play().catch((err) => {
          console.warn('Failed to play background music:', err);
        });
      }
  
      // 2) Find the nearest ancestor with class "card"
      const clickedCardElem = e.target.closest('.card');
      if (!clickedCardElem) {
        // If click was outside any card, do nothing
        return;
      }
  
      // 3) If the clicked card is already flipped or matched, ignore
      if (
        clickedCardElem.classList.contains('flipped') ||
        clickedCardElem.classList.contains('matched')
      ) {
        return;
      }
  
      // 4) Identify the card object by its data-id
      const cardId = parseInt(clickedCardElem.dataset.id, 10);
      const cardObj = this.cards.find((c) => c.id === cardId);
      if (!cardObj) return;
  
      // 5) Flip the card and check for match
      this.flipCard(cardObj);
    }
  
    /**
     * Flip a card object: update its state, play flip sound, and check for matches.
     * @param {{ id, faceValue, isFlipped, isMatched, element }} cardObj 
     */
    flipCard(cardObj) {
      // If two cards are already flipped and being checked, wait until they're resolved
      if (this.firstCard && this.secondCard) {
        return;
      }
  
      // Mark this card as flipped and add the CSS class 'flipped'
      cardObj.isFlipped = true;
      cardObj.element.classList.add('flipped');
      this.audioFlip.currentTime = 0;
      this.audioFlip.play();
  
      // If this is the first card in the pair
      if (!this.firstCard) {
        this.firstCard = cardObj;
        return;
      }
  
      // If this is the second card in the pair and it's not the same as the first
      if (cardObj !== this.firstCard) {
        this.secondCard = cardObj;
        this.moves++;
        this.moveCountElem.textContent = this.moves;
  
        // Check if face values match
        if (this.firstCard.faceValue === this.secondCard.faceValue) {
          // Match found
          this.audioMatch.currentTime = 0;
          this.audioMatch.play();
          this.firstCard.isMatched = true;
          this.secondCard.isMatched = true;
          this.firstCard.element.classList.add('matched');
          this.secondCard.element.classList.add('matched');
  
          // Reset references for next pair
          this.firstCard = null;
          this.secondCard = null;
  
          // If all cards are matched, end the game
          const allMatched = this.cards.every((c) => c.isMatched === true);
          if (allMatched) {
            this.endGame();
          }
        } else {
          // No match: flip both cards back after 1 second
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
     * Called when all pairs have been matched.
     * Stops the timer, shows the modal with stats, and triggers a notification.
     */
    endGame() {
      clearInterval(this.timer);
      this.gameOver = true;
  
      // Show final time and moves in the modal
      $('#final-time').text(this.timerElem.textContent);
      $('#final-moves').text(this.moves);
      $('#game-over-modal').removeClass('hidden');
  
      // If notifications are allowed, send a push notification
      if (Notification.permission === 'granted') {
        const notification = new Notification('Memory Game Completed!', {
          body: `You finished in ${this.moves} moves and ${this.timerElem.textContent}.`,
          icon: 'assets/svg/icon1.svg',
        });
        // Close notification after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    }
  
    /**
     * Manually flip all cards face-up for 5 seconds, then flip them back,
     * start the timer, and allow normal clicking thereafter.
     */
    performStartSequence() {
      // 1) Mark game as “started” so handleClick will begin to work
      this.gameStarted = true;
  
      // 2) Disable the difficulty dropdown so it cannot be changed mid‐game
      $('#difficulty-select').prop('disabled', true);
  
      // 3) Play background music (if not already playing)
      if (!this.bgMusicStarted) {
        this.bgMusicStarted = true;
        this.bgMusic.play().catch((err) => {
          console.warn('Failed to play background music:', err);
        });
      }
  
      // 4) Flip all cards face-up immediately
      this.cards.forEach((cardObj) => {
        cardObj.isFlipped = true;
        cardObj.element.classList.add('flipped');
      });
  
      // 5) After 5 seconds, flip them all back to face-down, then start the timer
      setTimeout(() => {
        this.cards.forEach((cardObj) => {
          // Only flip back those that aren’t already matched
          if (!cardObj.isMatched) {
            cardObj.isFlipped = false;
            cardObj.element.classList.remove('flipped');
          }
        });
        // 6) Start the actual countdown timer
        this.startTimer();
      }, 5000);
    }
  }
  
  $(function () {
    // Ensure the modal is hidden on load
    $('#game-over-modal').addClass('hidden');
  
    // Populate player name
    const username = localStorage.getItem('memoryGameUser');
    $('#player-name').text(username);
  
    // Create a new MemoryGame instance
    const game = new MemoryGame('game-grid', 'move-count', 'timer');
  
    // ─────────────────────────────────────────────────────────────────────────
    // 1) “Start Game” button logic
    // ─────────────────────────────────────────────────────────────────────────
    $('#start-game-btn').on('click', function () {
      // If game has already started, do nothing
      if (game.gameStarted) return;
  
      // Perform the “show face-up → face-down → start timer” sequence
      game.performStartSequence();
  
      // Disable the “Start Game” button so it cannot be clicked again
      $(this).prop('disabled', true);
    });
  
    // ─────────────────────────────────────────────────────────────────────────
    // 2) Music toggle button logic (mute / unmute background music)
    // ─────────────────────────────────────────────────────────────────────────
    $('#toggle-music-btn').on('click', function () {
      if (game.bgMusic.paused) {
        // If currently paused, play it and update button text/icon
        game.bgMusic.play().catch((err) => console.warn(err));
        $(this).text('🔈 Music On');
      } else {
        // If currently playing, pause it and update button text/icon
        game.bgMusic.pause();
        $(this).text('🔇 Music Off');
      }
    });
  
    // ─────────────────────────────────────────────────────────────────────────
    // 3) “Save Result” button (same as before)
    // ─────────────────────────────────────────────────────────────────────────
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
  
    // ─────────────────────────────────────────────────────────────────────────
    // 4) “Play Again” button logic (reloads page)
    // ─────────────────────────────────────────────────────────────────────────
    $('#play-again-btn').on('click', function () {
      window.location.reload();
    });
  
    // ─────────────────────────────────────────────────────────────────────────
    // 5) Difficulty change logic
    //
    //    Only works if game has NOT started yet. Once the user clicks “Start Game”,
    //    the <select> is disabled and cannot change mid-game.
    // ─────────────────────────────────────────────────────────────────────────
    $('#difficulty-select').on('change', function () {
      if (game.gameStarted) {
        // If the game is already in progress, revert the dropdown to the previous value

        $(this).prop('disabled', true);
        return;
      }
  
      const val = $(this).val(); // e.g. "4x4", "4x6", "6x6"
      let rows = 4, cols = 4;
      if (val === '4x4') {
        rows = 4; cols = 4;
      } else if (val === '4x6') {
        rows = 4; cols = 6;
      } else if (val === '6x6') {
        rows = 6; cols = 6;
      }
      game.loadGridSize(rows, cols);
  
      // Reset move counter display
      $('#move-count').text('0');
    });
  });
  