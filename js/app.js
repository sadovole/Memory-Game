/* js/app.js: General initialization, service worker, auth check, online/offline handling */

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

  // Register service worker for offline caching
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('js/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch((err) => console.error('SW registration error:', err));
  }

  // Check if user is logged in (except on index.html)
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);
  const loggedInUser = localStorage.getItem('memoryGameUser');

  if (page !== 'index.html' && !loggedInUser) {
    // Redirect to login if not authorized
    window.location.href = 'index.html';
  }

  // Logout buttons logic
  $('#logout-btn, #logout-btn-results').click(function () {
    localStorage.removeItem('memoryGameUser');
    window.location.href = 'index.html';
  });

  // Geolocation on index.html page
  if (page === 'index.html' && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const { latitude, longitude } = position.coords;
        $('#user-location').text(
          `Your coordinates: ${latitude.toFixed(2)}, ${longitude.toFixed(
            2
          )}`
        );
      },
      function (err) {
        console.warn('Geolocation error:', err.message);
      }
    );
  }

  // Handle back/forward navigation if needed (History API stub)
  window.addEventListener('popstate', function (event) {
    if (page === 'game.html' && location.pathname.endsWith('game.html')) {
      if (!loggedInUser) location.href = 'index.html';
    }
  });
});
