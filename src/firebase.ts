// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBek8ugqDYdNEjRQKCw5mfqP9vRrBS8TZE",
  authDomain: "fixit-lanka.firebaseapp.com",
  projectId: "fixit-lanka",
  storageBucket: "fixit-lanka.firebasestorage.app",
  messagingSenderId: "580162992218",
  appId: "1:580162992218:web:f83096f1663ff16a498063",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
