// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZM01XMOx7CvSM16u6rknPfHwo5DopQ58",
  authDomain: "cmmclens.firebaseapp.com",
  projectId: "cmmclens",
  storageBucket: "cmmclens.firebasestorage.app",
  messagingSenderId: "660829746450",
  appId: "1:660829746450:web:13e223403e52996cd42fcb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
