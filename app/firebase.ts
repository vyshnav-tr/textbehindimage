// Import the functions you need from the SDKs you need
import { initializeApp, getApp, FirebaseApp } from "firebase/app";
import { Analytics, getAnalytics } from "firebase/analytics";
import { Auth, getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only on client side
let app: FirebaseApp;
let analytics: Analytics | undefined;
let auth: Auth;

if (typeof window !== 'undefined') {
  try {
    app = getApp();
  } catch {
    app = initializeApp(firebaseConfig);
  }

  analytics = getAnalytics(app);
  auth = getAuth(app);
} else {
  // Server-side: create a mock app object
  app = {} as FirebaseApp;
  auth = {} as Auth;
}

export { app, analytics, auth };