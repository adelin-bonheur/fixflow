
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEdhRVZdej16IDD-WHZ2XbQ6kyVH0iwvA",
  authDomain: "fixflow-d8579.firebaseapp.com",
  projectId: "fixflow-d8579",
  storageBucket: "fixflow-d8579.firebasestorage.app",
  messagingSenderId: "1004962654987",
  appId: "1:1004962654987:web:0c757b29e668cf6d9b100e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
