$(document).ready(function () {
  // Set current year in footers
  const year = new Date().getFullYear();
  $('#current-year').text(year);
  $('#current-year-game').text(year);
  $('#current-year-results').text(year);

  // Online/Offline status handling
  function updateOnlineStatus() {
    if (navigator.onLine) {
      $('#offline-status, #offline-status-game').addClass('hidden');
    } else {
      $('#offline-status, #offline-status-game').removeClass('hidden');
    }
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Register service worker (may fail on file:// or if not https)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('js/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch((err) => console.error('SW registration error:', err));
  }

  // Determine which “page” we are on
  let path = window.location.pathname;            // e.g. "/your-repo/" or "/your-repo/index.html"
  let page = path.substring(path.lastIndexOf('/') + 1);
  // Handle GH Pages default of serving index when path ends in "/your-repo/"
  if (page === '' || page === 'your-repo') {
    page = 'index.html';
  }

  // If not index.html, check if logged in; otherwise redirect to index.html
  const loggedInUser = localStorage.getItem('memoryGameUser');
  if (page !== 'index.html' && !loggedInUser) {
    window.location.href = 'index.html';
  }

  // Geolocation on index (or default) page
  if (page === 'index.html' && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        $('#user-location').text(
          `Your coordinates: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
        );
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
      }
    );
  }

  // Logout buttons logic
  $('#logout-btn, #logout-btn-results').click(function () {
    localStorage.removeItem('memoryGameUser');
    window.location.href = 'index.html';
  });

  // Optional: popstate handling for History (if you need back/forward)
  window.addEventListener('popstate', (event) => {
    if (page === 'game.html' && location.pathname.endsWith('game.html')) {
      if (!loggedInUser) location.href = 'index.html';
    }
  });
});
