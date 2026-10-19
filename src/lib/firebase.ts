/**
 * Firebase v10 modular SDK bootstrap.
 *
 * The app runs in one of two modes:
 *  - DEMO_MODE (default): no Firebase project needed. All reads/writes hit an
 *    in-browser Firestore-shaped store (see `src/services`). Great for local
 *    development, screenshots and evaluation.
 *  - LIVE_MODE: set VITE_DEMO_MODE=false and provide the VITE_FIREBASE_* keys.
 *    `auth`, `db` and `storage` are then initialised against your project.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when we should use the in-browser demo data-layer. */
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' || !firebaseConfig.apiKey;

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

if (!DEMO_MODE) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

export const firebaseApp = app;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
