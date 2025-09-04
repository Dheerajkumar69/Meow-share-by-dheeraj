const CACHE_NAME = 'meow-share-v1'
const urlsToCache = [
  '/',
  '/send',
  '/receive',
  '/test',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Handle background sync for offline uploads
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // Get pending uploads from IndexedDB
  const pendingUploads = await getPendingUploads()
  
  // Try to upload each pending file
  for (const upload of pendingUploads) {
    try {
      await retryUpload(upload)
      await removePendingUpload(upload.id)
    } catch (error) {
      console.error('Background sync failed for upload:', upload.id, error)
    }
  }
}

// Helper functions for IndexedDB operations
async function getPendingUploads() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MeowShareOffline', 1)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pendingUploads')) {
        db.createObjectStore('pendingUploads', { keyPath: 'id' })
      }
    }
    
    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction('pendingUploads', 'readonly')
      const store = transaction.objectStore('pendingUploads')
      const getAll = store.getAll()
      
      getAll.onsuccess = () => resolve(getAll.result)
      getAll.onerror = () => reject(getAll.error)
    }
    
    request.onerror = () => reject(request.error)
  })
}

async function removePendingUpload(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MeowShareOffline', 1)
    
    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction('pendingUploads', 'readwrite')
      const store = transaction.objectStore('pendingUploads')
      const deleteRequest = store.delete(id)
      
      deleteRequest.onsuccess = () => resolve(deleteRequest.result)
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
    
    request.onerror = () => reject(request.error)
  })
}

async function retryUpload(upload) {
  // Retry the upload with the stored data
  const formData = new FormData()
  formData.append('fileShareId', upload.fileShareId)
  formData.append('chunkIndex', upload.chunkIndex.toString())
  formData.append('chunk', upload.chunk)
  
  const response = await fetch('/api/upload/chunk', {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }
  
  return response.json()
}