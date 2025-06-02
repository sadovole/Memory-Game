$(function () {
  const username = localStorage.getItem('memoryGameUser');
  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  function loadResults() {
    return JSON.parse(localStorage.getItem('memoryGameResults') || '[]');
  }

  function renderResults(filter = '') {
    let allResults = loadResults();
    let filtered = allResults;

    if (filter) {
      const lower = filter.toLowerCase();
      filtered = allResults.filter((r) =>
        r.username.toLowerCase().includes(lower)
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

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach((r) => {
      const dateStr = new Date(r.date).toLocaleString();
      
      const rowHtml = `
        <tr>
          <td>${dateStr}</td>
          <td>${r.username}</td>
          <td>${r.difficulty || '—'}</td> <!-- Сложность -->
          <td>${r.moves ?? '—'}</td>     <!-- Ходы -->
          <td>${r.time || '—'}</td>      <!-- Время -->
        </tr>`;
      tbody.append(rowHtml);
    });
  }

  // Initial display
  renderResults();

  // Filter as the user types
  $('#filter-username').on('input', function () {
    renderResults($(this).val());
  });

  // Clear history
  $('#clear-history-btn').on('click', function () {
    if (confirm('Are you sure you want to delete all results?')) {
      localStorage.removeItem('memoryGameResults');
      renderResults($('#filter-username').val());
    }
  });

  // Export to CSV, now including “Difficulty” in the header
  $('#export-csv-btn').on('click', function () {
    const results = loadResults();
    if (results.length === 0) {
      alert('No data to export.');
      return;
    }
    let csvContent = 'Date,Username,Difficulty,Moves,Time\n';
    results.forEach((r) => {
      const dateStr = new Date(r.date).toLocaleString();
      const diff = r.difficulty || '';
      csvContent += `${dateStr},${r.username},${diff},${r.moves},${r.time}\n`;
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

  // Logout
  $('#logout-btn-results').on('click', function () {
    localStorage.removeItem('memoryGameUser');
    window.location.href = 'index.html';
  });
});