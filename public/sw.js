const CACHE_NAME = 'pop-game-v1.0.0';
const STATIC_CACHE = 'pop-static-v1.0.0';
const RUNTIME_CACHE = 'pop-runtime-v1.0.0';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  // Card images
  '/cards/SVG-cards/card_back3.svg',
  '/cards/SVG-cards/2_of_clubs.svg',
  '/cards/SVG-cards/2_of_diamonds.svg',
  '/cards/SVG-cards/2_of_hearts.svg',
  '/cards/SVG-cards/2_of_spades.svg',
  '/cards/SVG-cards/3_of_clubs.svg',
  '/cards/SVG-cards/3_of_diamonds.svg',
  '/cards/SVG-cards/3_of_hearts.svg',
  '/cards/SVG-cards/3_of_spades.svg',
  '/cards/SVG-cards/4_of_clubs.svg',
  '/cards/SVG-cards/4_of_diamonds.svg',
  '/cards/SVG-cards/4_of_hearts.svg',
  '/cards/SVG-cards/4_of_spades.svg',
  '/cards/SVG-cards/5_of_clubs.svg',
  '/cards/SVG-cards/5_of_diamonds.svg',
  '/cards/SVG-cards/5_of_hearts.svg',
  '/cards/SVG-cards/5_of_spades.svg',
  '/cards/SVG-cards/6_of_clubs.svg',
  '/cards/SVG-cards/6_of_diamonds.svg',
  '/cards/SVG-cards/6_of_hearts.svg',
  '/cards/SVG-cards/6_of_spades.svg',
  '/cards/SVG-cards/7_of_clubs.svg',
  '/cards/SVG-cards/7_of_diamonds.svg',
  '/cards/SVG-cards/7_of_hearts.svg',
  '/cards/SVG-cards/7_of_spades.svg',
  '/cards/SVG-cards/8_of_clubs.svg',
  '/cards/SVG-cards/8_of_diamonds.svg',
  '/cards/SVG-cards/8_of_hearts.svg',
  '/cards/SVG-cards/8_of_spades.svg',
  '/cards/SVG-cards/9_of_clubs.svg',
  '/cards/SVG-cards/9_of_diamonds.svg',
  '/cards/SVG-cards/9_of_hearts.svg',
  '/cards/SVG-cards/9_of_spades.svg',
  '/cards/SVG-cards/10_of_clubs.svg',
  '/cards/SVG-cards/10_of_diamonds.svg',
  '/cards/SVG-cards/10_of_hearts.svg',
  '/cards/SVG-cards/10_of_spades.svg',
  '/cards/SVG-cards/jack_of_clubs.svg',
  '/cards/SVG-cards/jack_of_diamonds.svg',
  '/cards/SVG-cards/jack_of_hearts.svg',
  '/cards/SVG-cards/jack_of_spades.svg',
  '/cards/SVG-cards/queen_of_clubs.svg',
  '/cards/SVG-cards/queen_of_diamonds.svg',
  '/cards/SVG-cards/queen_of_hearts.svg',
  '/cards/SVG-cards/queen_of_spades.svg',
  '/cards/SVG-cards/king_of_clubs.svg',
  '/cards/SVG-cards/king_of_diamonds.svg',
  '/cards/SVG-cards/king_of_hearts.svg',
  '/cards/SVG-cards/king_of_spades.svg',
  '/cards/SVG-cards/ace_of_clubs.svg',
  '/cards/SVG-cards/ace_of_diamonds.svg',
  '/cards/SVG-cards/ace_of_hearts.svg',
  '/cards/SVG-cards/ace_of_spades.svg',
  // Sound files
  '/sounds/button-click.mp3',
  '/sounds/card-flip.mp3',
  '/sounds/correct-guess.mp3',
  '/sounds/game-start.mp3',
  '/sounds/incorrect-guess.mp3',
  // Icons
  '/icons/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Old caches cleaned up');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Cache-first strategy for static assets
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Network-first strategy for pages and API calls
  event.respondWith(networkFirstStrategy(request));
});

// Check if request is for a static asset
function isStaticAsset(url) {
  return url.includes('/cards/') || 
         url.includes('/sounds/') || 
         url.includes('/icons/') ||
         url.includes('/_next/static/') ||
         url.endsWith('.css') ||
         url.endsWith('.js') ||
         url.endsWith('.svg') ||
         url.endsWith('.png') ||
         url.endsWith('.jpg') ||
         url.endsWith('.jpeg') ||
         url.endsWith('.mp3') ||
         url.endsWith('.wav');
}

// Cache-first strategy - check cache first, fallback to network
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Cache hit:', request.url);
      return cachedResponse;
    }

    console.log('Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    throw error;
  }
}

// Network-first strategy - try network first, fallback to cache
async function networkFirstStrategy(request) {
  try {
    console.log('Network-first for:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>POP - Offline</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1f2937; color: white; }
            h1 { color: #facc15; }
          </style>
        </head>
        <body>
          <h1>POP Game - Offline</h1>
          <p>You're currently offline. Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
} 