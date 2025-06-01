/* js/sw.js: Service Worker for offline caching */

const CACHE_NAME = 'memory-game-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/game.html',
  '/results.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/game.js',
  '/js/results.js',
  '/assets/audio/flip.mp3',
  '/assets/audio/match.mp3',
  '/assets/audio/background.mp3',
  '/manifest.json',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  // Cache all SVG icons
  '/assets/svg/icon1.svg',
  '/assets/svg/icon2.svg',
  '/assets/svg/icon3.svg',
  '/assets/svg/icon4.svg',
  '/assets/svg/icon5.svg',
  '/assets/svg/icon6.svg',
  '/assets/svg/icon7.svg',
  '/assets/svg/icon8.svg',
  '/assets/svg/icon9.svg',
  '/assets/svg/icon10.svg',
  '/assets/svg/icon11.svg',
  '/assets/svg/icon12.svg',
  '/assets/svg/icon13.svg',
  '/assets/svg/icon14.svg',
  '/assets/svg/icon15.svg',
  '/assets/svg/icon16.svg',
  '/assets/svg/icon17.svg',
  '/assets/svg/icon18.svg',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', function (event) {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
