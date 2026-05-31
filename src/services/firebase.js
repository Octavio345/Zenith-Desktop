import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyD3t5Q0Z5m5qxaj21qNDb4he7mIolLlCOA",
  authDomain: "bd-tcc-test.firebaseapp.com",
  projectId: "bd-tcc-test",
  storageBucket: "bd-tcc-test.firebasestorage.app",
  messagingSenderId: "983944576946",
  appId: "1:983944576946:web:8f630082403ee1d92aaeab",
  measurementId: "G-DG1V88WTWE"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)