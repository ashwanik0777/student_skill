// Offline Storage Utility for Test Data

// Database name and version
const DB_NAME = 'StudentSkillTestDB';
const DB_VERSION = 1;

// Types for test data
import type { Test, Question, TestAttempt, UserAnswer } from '@shared/schema';

// Interface for pending test attempt
export interface PendingTestAttempt {
  id?: number; // local ID, may be different from server ID
  testId: number;
  userId: number;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  correctAnswers?: number;
  totalQuestions: number;
  timeTaken?: number;
  status: 'pending' | 'synced';
  userAnswers: PendingUserAnswer[];
}

export interface PendingUserAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect: boolean;
}

// Open IndexedDB connection
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('tests')) {
        const testStore = db.createObjectStore('tests', { keyPath: 'id' });
        testStore.createIndex('subjectId', 'subjectId', { unique: false });
      }

      if (!db.objectStoreNames.contains('questions')) {
        const questionStore = db.createObjectStore('questions', { keyPath: 'id' });
        questionStore.createIndex('subjectId', 'subjectId', { unique: false });
      }

      if (!db.objectStoreNames.contains('testQuestions')) {
        const testQuestionsStore = db.createObjectStore('testQuestions', { keyPath: 'id' });
        testQuestionsStore.createIndex('testId', 'testId', { unique: false });
      }

      if (!db.objectStoreNames.contains('testAttempts')) {
        const testAttemptsStore = db.createObjectStore('testAttempts', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        testAttemptsStore.createIndex('testId', 'testId', { unique: false });
        testAttemptsStore.createIndex('userId', 'userId', { unique: false });
        testAttemptsStore.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains('userAnswers')) {
        const userAnswersStore = db.createObjectStore('userAnswers', { 
          keyPath: 'id',
          autoIncrement: true
        });
        userAnswersStore.createIndex('testAttemptId', 'testAttemptId', { unique: false });
        userAnswersStore.createIndex('questionId', 'questionId', { unique: false });
      }
    };
  });
}

// Save test data (with questions) for offline access
export async function saveTestForOffline(test: Test, questions: (Question & { options: string[] })[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(['tests', 'questions', 'testQuestions'], 'readwrite');

    // Save test
    const testStore = tx.objectStore('tests');
    testStore.put(test);

    // Save questions
    const questionStore = tx.objectStore('questions');
    const testQuestionStore = tx.objectStore('testQuestions');

    questions.forEach((question, index) => {
      questionStore.put(question);
      
      // Save test-question relationship
      testQuestionStore.put({
        id: `${test.id}-${question.id}`,
        testId: test.id,
        questionId: question.id,
        order: index
      });
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log(`Test ${test.id} saved for offline use`);
  } catch (error) {
    console.error('Error saving test for offline use:', error);
    throw error;
  }
}

// Get test data for offline access
export async function getOfflineTest(testId: number): Promise<{ 
  test: Test, 
  questions: (Question & { options: string[] })[] 
} | null> {
  try {
    const db = await openDatabase();
    
    // Get test
    const testTx = db.transaction('tests', 'readonly');
    const testStore = testTx.objectStore('tests');
    const test = await promiseRequest<Test>(testStore.get(testId));
    
    if (!test) {
      return null;
    }
    
    // Get test questions
    const testQuestionsTx = db.transaction('testQuestions', 'readonly');
    const testQuestionsStore = testQuestionsTx.objectStore('testQuestions');
    const testQuestionsIndex = testQuestionsStore.index('testId');
    const testQuestions = await promiseRequest<any[]>(testQuestionsIndex.getAll(testId));
    
    // Get actual questions
    const questionIds = testQuestions.map(tq => tq.questionId);
    const questions: (Question & { options: string[] })[] = [];
    
    if (questionIds.length > 0) {
      const questionsTx = db.transaction('questions', 'readonly');
      const questionsStore = questionsTx.objectStore('questions');
      
      for (const questionId of questionIds) {
        const question = await promiseRequest<Question & { options: string[] }>(questionsStore.get(questionId));
        if (question) {
          questions.push(question);
        }
      }
      
      // Sort questions by their order in the test
      questions.sort((a, b) => {
        const aOrder = testQuestions.find(tq => tq.questionId === a.id)?.order || 0;
        const bOrder = testQuestions.find(tq => tq.questionId === b.id)?.order || 0;
        return aOrder - bOrder;
      });
    }
    
    return { test, questions };
  } catch (error) {
    console.error('Error getting offline test:', error);
    return null;
  }
}

// Save test attempt for offline sync later
export async function saveOfflineTestAttempt(attempt: PendingTestAttempt): Promise<number> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(['testAttempts', 'userAnswers'], 'readwrite');
    
    // Save test attempt
    const testAttemptsStore = tx.objectStore('testAttempts');
    const userAnswersStore = tx.objectStore('userAnswers');
    
    // Mark as pending for sync later
    attempt.status = 'pending';
    
    const attemptRequest = testAttemptsStore.add(attempt);
    
    const attemptId = await new Promise<number>((resolve, reject) => {
      attemptRequest.onsuccess = () => resolve(attemptRequest.result as number);
      attemptRequest.onerror = () => reject(attemptRequest.error);
    });
    
    // Save user answers
    if (attempt.userAnswers && attempt.userAnswers.length > 0) {
      for (const answer of attempt.userAnswers) {
        userAnswersStore.add({
          testAttemptId: attemptId,
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect
        });
      }
    }
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    console.log(`Test attempt saved offline with ID ${attemptId}`);
    
    // Trigger background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      try {
        // @ts-ignore - TypeScript doesn't recognize sync API yet
        await registration.sync.register('sync-test-attempts');
      } catch (error) {
        console.warn('Background sync not supported, will sync on next online event', error);
      }
    }
    
    return attemptId;
  } catch (error) {
    console.error('Error saving offline test attempt:', error);
    throw error;
  }
}

// Get pending test attempts for sync
export async function getPendingTestAttempts(): Promise<PendingTestAttempt[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('testAttempts', 'readonly');
    const store = tx.objectStore('testAttempts');
    const index = store.index('status');
    
    const pendingAttempts = await promiseRequest<PendingTestAttempt[]>(index.getAll('pending'));
    
    return pendingAttempts || [];
  } catch (error) {
    console.error('Error getting pending test attempts:', error);
    return [];
  }
}

// Helper function to promisify IndexedDB requests
function promiseRequest<T>(request: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

// Initialize offline support
export async function initOfflineSupport(): Promise<void> {
  // Register service worker if supported
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered with scope:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  
  // Initialize IndexedDB
  try {
    await openDatabase();
    console.log('IndexedDB initialized for offline support');
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
  }
}

// Check for network connection
export function isOnline(): boolean {
  return navigator.onLine;
}

// Subscribe to online/offline events
export function subscribeToNetworkChanges(
  onOnline: () => void, 
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// Sync pending test attempts with server when online
export async function syncPendingTestAttempts(): Promise<boolean> {
  if (!isOnline()) {
    return false;
  }
  
  try {
    const pendingAttempts = await getPendingTestAttempts();
    
    if (pendingAttempts.length === 0) {
      return true;
    }
    
    const db = await openDatabase();
    const tx = db.transaction('testAttempts', 'readwrite');
    const store = tx.objectStore('testAttempts');
    
    for (const attempt of pendingAttempts) {
      try {
        // Send to server
        const response = await fetch('/api/test-attempts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt)
        });
        
        if (response.ok) {
          // Update status to synced
          attempt.status = 'synced';
          store.put(attempt);
          console.log(`Test attempt ${attempt.id} synced with server`);
        } else {
          console.error(`Failed to sync test attempt ${attempt.id}:`, await response.text());
        }
      } catch (error) {
        console.error(`Error syncing test attempt ${attempt.id}:`, error);
      }
    }
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    return true;
  } catch (error) {
    console.error('Error syncing pending test attempts:', error);
    return false;
  }
}