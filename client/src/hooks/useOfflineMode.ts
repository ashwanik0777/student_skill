import { useState, useEffect, useCallback } from 'react';
import { 
  isOnline, 
  subscribeToNetworkChanges, 
  getOfflineTest, 
  saveOfflineTestAttempt, 
  PendingTestAttempt 
} from '@/lib/offlineStorage';

interface UseOfflineModeOptions {
  onNetworkChange?: (online: boolean) => void;
}

export function useOfflineMode(options?: UseOfflineModeOptions) {
  const [online, setOnline] = useState(isOnline);
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if offline data exists in IndexedDB
  const checkOfflineData = useCallback(async () => {
    try {
      setIsChecking(true);
      
      if ('indexedDB' in window) {
        const request = window.indexedDB.open('StudentSkillTestDB');
        
        request.onsuccess = () => {
          const db = request.result;
          
          if (db.objectStoreNames.contains('tests')) {
            const tx = db.transaction('tests', 'readonly');
            const store = tx.objectStore('tests');
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
              setHasOfflineData(countRequest.result > 0);
              setIsChecking(false);
            };
            
            countRequest.onerror = () => {
              setHasOfflineData(false);
              setIsChecking(false);
            };
          } else {
            setHasOfflineData(false);
            setIsChecking(false);
          }
          
          db.close();
        };
        
        request.onerror = () => {
          setHasOfflineData(false);
          setIsChecking(false);
        };
      } else {
        setHasOfflineData(false);
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Error checking offline data:', error);
      setHasOfflineData(false);
      setIsChecking(false);
    }
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (options?.onNetworkChange) {
        options.onNetworkChange(true);
      }
    };
    
    const handleOffline = () => {
      setOnline(false);
      if (options?.onNetworkChange) {
        options.onNetworkChange(false);
      }
    };
    
    const unsubscribe = subscribeToNetworkChanges(handleOnline, handleOffline);
    
    // Initial check
    checkOfflineData();
    
    return unsubscribe;
  }, [checkOfflineData, options]);

  // Fetch a test from offline storage
  const getOfflineTestData = useCallback(async (testId: number) => {
    try {
      return await getOfflineTest(testId);
    } catch (error) {
      console.error('Error fetching offline test data:', error);
      return null;
    }
  }, []);

  // Save a test attempt to offline storage
  const saveTestAttemptOffline = useCallback(async (attempt: PendingTestAttempt) => {
    try {
      const attemptId = await saveOfflineTestAttempt(attempt);
      
      // Update offline data status
      setHasOfflineData(true);
      
      return attemptId;
    } catch (error) {
      console.error('Error saving test attempt offline:', error);
      throw error;
    }
  }, []);

  return {
    isOnline: online,
    hasOfflineData,
    isChecking,
    checkOfflineData,
    getOfflineTestData,
    saveTestAttemptOffline
  };
}