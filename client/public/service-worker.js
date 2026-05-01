// Service Worker for Offline Test Taking
const CACHE_NAME = 'student-skill-test-cache-v1';
const OFFLINE_URL = '/offline.html';
const TEST_CACHE_PREFIX = 'test-cache-';

const urlsToCache = [
  '/',
  '/offline.html',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && !cache.startsWith(TEST_CACHE_PREFIX)) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - handle offline requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip browser-extension requests and non-http requests
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // API Requests - different strategy for API calls
  if (event.request.url.includes('/api/')) {
    // For test data API requests, check IndexedDB first
    if (event.request.url.includes('/api/tests/') || 
        event.request.url.includes('/api/test-attempts')) {
      event.respondWith(handleApiRequest(event.request));
    } else {
      // For other API requests, try network first then fallback to cached response
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            return caches.match(event.request);
          })
      );
    }
  } else {
    // Regular page navigation - Network first with cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy of the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              // Return cached response or the offline page
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
  }
});

// Handle API requests for test data
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const data = await responseClone.json();
      
      // Store the test data in IndexedDB for offline use
      if (request.url.includes('/api/tests/') && data) {
        await saveTestDataToIDB(data);
      }
      
      return networkResponse;
    }
  } catch (error) {
    console.log('Network error when fetching API data:', error);
  }

  // If network fails, try IndexedDB for test data
  if (request.url.includes('/api/tests/')) {
    const testId = extractTestIdFromUrl(request.url);
    if (testId) {
      const cachedTest = await getTestFromIDB(testId);
      if (cachedTest) {
        return new Response(JSON.stringify(cachedTest), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Return a default offline response for API
  return new Response(JSON.stringify({ 
    offline: true, 
    message: 'You are offline. Please connect to the internet and try again.' 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Extract test ID from URL
function extractTestIdFromUrl(url) {
  const matches = url.match(/\/tests\/(\d+)/);
  return matches ? matches[1] : null;
}

// IndexedDB operations for tests
async function saveTestDataToIDB(testData) {
  if (!('indexedDB' in self)) return;

  try {
    const db = await openDatabase();
    const transaction = db.transaction(['tests'], 'readwrite');
    const store = transaction.objectStore('tests');
    store.put(testData);
    await transaction.complete;
    db.close();
  } catch (error) {
    console.error('Error saving test data to IndexedDB:', error);
  }
}

async function getTestFromIDB(testId) {
  if (!('indexedDB' in self)) return null;

  try {
    const db = await openDatabase();
    const transaction = db.transaction(['tests'], 'readonly');
    const store = transaction.objectStore('tests');
    const test = await store.get(parseInt(testId));
    await transaction.complete;
    db.close();
    return test;
  } catch (error) {
    console.error('Error getting test from IndexedDB:', error);
    return null;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StudentSkillTestDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('tests')) {
        db.createObjectStore('tests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('testAttempts')) {
        const store = db.createObjectStore('testAttempts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('testId', 'testId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Listen for background sync requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-test-attempts') {
    event.waitUntil(syncTestAttempts());
  }
});

// Sync test attempts with server when online
async function syncTestAttempts() {
  if (!('indexedDB' in self)) return;

  try {
    const db = await openDatabase();
    const transaction = db.transaction(['testAttempts'], 'readwrite');
    const store = transaction.objectStore('testAttempts');
    const index = store.index('status');
    const pendingAttempts = await index.getAll('pending');
    
    for (const attempt of pendingAttempts) {
      try {
        const response = await fetch('/api/test-attempts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt)
        });
        
        if (response.ok) {
          // Update status to synced
          attempt.status = 'synced';
          store.put(attempt);
        }
      } catch (error) {
        console.error('Error syncing test attempt:', error);
      }
    }
    
    await transaction.complete;
    db.close();
  } catch (error) {
    console.error('Error during sync operation:', error);
  }
}