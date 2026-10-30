// Inicialização do Firebase (somente navegador). Importar apenas dentro de efeitos/handlers,
// nunca em tempo de módulo no servidor (SSR).
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}
export const auth = (): Auth => getAuth(getFirebaseApp());
let _db: Firestore | undefined;
export const db = (): Firestore => {
  if (_db) return _db;
  const app = getFirebaseApp();
  try {
    _db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    _db = getFirestore(app);
  }
  return _db;
};

/** Firestore do app secundário (autenticado como a conta recém-criada). */
export function getSecondaryDb(): Firestore {
  const existing = getApps().find((a) => a.name === "secondary");
  return getFirestore(existing ?? initializeApp(config, "secondary"));
}

/** App secundário: permite ao admin criar contas sem encerrar a própria sessão. */
export function getSecondaryAuth(): Auth {
  const existing = getApps().find((a) => a.name === "secondary");
  return getAuth(existing ?? initializeApp(config, "secondary"));
}
