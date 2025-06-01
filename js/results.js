/* js/results.js: Displaying and managing game results */

$(function () {
  const username = localStorage.getItem('memoryGameUser');
  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  /**
   * Load results array from LocalStorage
   */
  function loadResults() {
    return JSON.parse(localStorage.getItem('memoryGameResults') || '[]');
  }

  /**
   * Render results table, optionally filtering by username substring.
   * @param {string} filter
   */
  function renderResults(filter = '') {
    const allResults = loadResults();
    let filtered = allResults;
    if (filter) {
      filtered = allResults.filter((r) =>
        r.username.toLowerCase().includes(filter.toLowerCase())
      );
    }
    const tbody = $('#results-body');
    tbody.empty();

    if (filtered.length === 0) {
      $('#no-results-msg').removeClass('hidden');
      return;
    } else {
      $('#no-results-msg').addClass('hidden');
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach((r) => {
      const date = new Date(r.date).toLocaleString();
      const row = `<tr>
        <td>${date}</td>
        <td>${r.username}</td>
        <td>${r.moves}</td>
        <td>${r.time}</td>
      </tr>`;
      tbody.append(row);
    });
  }

  // Initial render
  renderResults();

  // Live filtering
  $('#filter-username').on('input', function () {
    renderResults($(this).val());
  });

  // Clear history
  $('#clear-history-btn').on('click', function () {
    if (confirm('Are you sure you want to delete all results?')) {
      localStorage.removeItem('memoryGameResults');
      renderResults();
    }
  });

  // Export to CSV using File API
  $('#export-csv-btn').on('click', function () {
    const results = loadResults();
    if (results.length === 0) {
      alert('No data to export.');
      return;
    }
    let csvContent = 'Date,Username,Moves,Time\n';
    results.forEach((r) => {
      const date = new Date(r.date).toLocaleString();
      csvContent += `${date},${r.username},${r.moves},${r.time}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'memory_game_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Back to game
  $('#back-to-game-btn').on('click', function () {
    window.location.href = 'game.html';
  });
});
