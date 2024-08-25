//firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: "telegram-clone-132c9.firebaseapp.com",
  projectId: "telegram-clone-132c9",
  storageBucket: "telegram-clone-132c9.appspot.com",
  messagingSenderId: "257818834645",
  appId: "1:257818834645:web:0898aacc0b55a9c65b145c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };