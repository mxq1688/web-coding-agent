// IndexedDB utilities for storing FileSystemDirectoryHandle

const DB_NAME = 'code-editor-db';
const STORE_NAME = 'directory-handles';
const HANDLE_KEY = 'last-directory';

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Save directory handle to IndexedDB
export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put(handle, HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save directory handle:', error);
    throw error;
  }
};

// Load directory handle from IndexedDB
export const loadDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load directory handle:', error);
    return null;
  }
};

// Verify if we still have permission to access the directory
// Note: Only queries permission, does not request it (to avoid user activation requirement)
export const verifyPermission = async (
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> => {
  const options: FileSystemHandlePermissionDescriptor = { mode };
  
  // Check if we already have permission
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  
  // Don't automatically request permission - requires user gesture
  // User will need to click 'Select Folder' button if permission is lost
  return false;
};

// Clear saved directory handle
export const clearDirectoryHandle = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear directory handle:', error);
    throw error;
  }
};
