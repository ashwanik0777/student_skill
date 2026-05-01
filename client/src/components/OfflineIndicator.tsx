import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { subscribeToNetworkChanges, isOnline, syncPendingTestAttempts } from '@/lib/offlineStorage';
import { useToast } from '@/hooks/use-toast';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const { toast } = useToast();

  // Check for pending sync items
  useEffect(() => {
    const checkPendingSyncs = async () => {
      try {
        const db = await window.indexedDB.open('StudentSkillTestDB');
        db.onsuccess = () => {
          const tx = db.result.transaction('testAttempts', 'readonly');
          const store = tx.objectStore('testAttempts');
          const index = store.index('status');
          const countRequest = index.count('pending');
          
          countRequest.onsuccess = () => {
            setPendingSyncs(countRequest.result);
          };
        };
      } catch (error) {
        console.error('Error checking pending syncs:', error);
      }
    };

    checkPendingSyncs();
    
    // Set up an interval to check periodically
    const interval = setInterval(checkPendingSyncs, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      toast({
        title: 'You are online',
        description: 'Your connection has been restored.',
        duration: 3000,
      });
      
      // Try to sync pending data
      if (pendingSyncs > 0) {
        await handleSync();
      }
    };
    
    const handleOffline = () => {
      setOnline(false);
      toast({
        title: 'You are offline',
        description: 'App is now in offline mode. Some features may be limited.',
        variant: 'destructive',
        duration: 5000,
      });
    };
    
    const unsubscribe = subscribeToNetworkChanges(handleOnline, handleOffline);
    
    return unsubscribe;
  }, [pendingSyncs, toast]);

  // Handle manual sync attempt
  const handleSync = async () => {
    if (!online) {
      toast({
        title: 'Cannot sync',
        description: 'You are currently offline.',
        variant: 'destructive',
      });
      return;
    }
    
    if (pendingSyncs === 0) {
      toast({
        title: 'No pending data',
        description: 'There is no data to synchronize.',
      });
      return;
    }
    
    try {
      setSyncing(true);
      
      const success = await syncPendingTestAttempts();
      
      if (success) {
        toast({
          title: 'Sync complete',
          description: 'Your test attempts have been synchronized.',
        });
        
        // Refresh pending count
        const db = await window.indexedDB.open('StudentSkillTestDB');
        db.onsuccess = () => {
          const tx = db.result.transaction('testAttempts', 'readonly');
          const store = tx.objectStore('testAttempts');
          const index = store.index('status');
          const countRequest = index.count('pending');
          
          countRequest.onsuccess = () => {
            setPendingSyncs(countRequest.result);
          };
        };
      } else {
        toast({
          title: 'Sync failed',
          description: 'Failed to synchronize some items. Try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: 'Sync error',
        description: 'An error occurred while synchronizing data.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {online ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      
      <span className={`text-sm font-medium ${online ? 'text-green-600' : 'text-red-600'}`}>
        {online ? 'Online' : 'Offline'}
      </span>
      
      {pendingSyncs > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing || !online}
          className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Syncing...' : `Sync (${pendingSyncs})`}
        </button>
      )}
    </div>
  );
}

export default OfflineIndicator;