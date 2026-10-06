import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  memoryLruGarbageCollector,
  setLogLevel,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Silence Firestore logs to avoid 10s backend timeout warnings in preview / offline mode
try {
  setLogLevel('silent');
} catch {}

const sanitize = (val?: string) => (val || '').replace(/^["']|["']$/g, '').trim();

const rawApiKey = sanitize(import.meta.env.VITE_FIREBASE_API_KEY) || firebaseConfigJson.apiKey;
const rawAuthDomain = sanitize(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfigJson.authDomain;
const rawProjectId = sanitize(import.meta.env.VITE_FIREBASE_PROJECT_ID) || firebaseConfigJson.projectId;
const rawStorageBucket = sanitize(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfigJson.storageBucket;
const rawMessagingSenderId = sanitize(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfigJson.messagingSenderId;
const rawAppId = sanitize(import.meta.env.VITE_FIREBASE_APP_ID) || firebaseConfigJson.appId;

const firebaseConfig = {
  apiKey: rawApiKey,
  authDomain: rawAuthDomain,
  projectId: rawProjectId,
  storageBucket: rawStorageBucket,
  messagingSenderId: rawMessagingSenderId,
  appId: rawAppId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const databaseId =
  firebaseConfig.projectId === firebaseConfigJson.projectId
    ? (firebaseConfigJson as { firestoreDatabaseId?: string }).firestoreDatabaseId
    : undefined;

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache({ garbageCollector: memoryLruGarbageCollector() }),
  }, databaseId || '(default)');
} catch {
  firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const storage = getStorage(app);

// Test connection gracefully as required by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.info('Firestore operating in offline mode.');
    }
  }
}
testConnection();

export default app;
