/**
 * ============================================
 *  Fund Manager — Firebase Initialization
 * ============================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyBPkpZbo3LnRPap77uu0ateQTNPKvIN5yg",
  authDomain: "personal-budget-planner-eee27.firebaseapp.com",
  projectId: "personal-budget-planner-eee27",
  storageBucket: "personal-budget-planner-eee27.firebasestorage.app",
  messagingSenderId: "109963185010",
  appId: "1:109963185010:web:e576aa064fdb2fdb9eebeb",
  measurementId: "G-VQ1D6HCH2C"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

window.FirebaseApp = {
    auth,
    db,
    googleProvider
};
