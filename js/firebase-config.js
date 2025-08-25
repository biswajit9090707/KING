// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBc-5NLJYaBgQtPjo0k2JlRFGcN-FyI6CE",
    authDomain: "chat-60cdc.firebaseapp.com",
    projectId: "chat-60cdc",
    storageBucket: "chat-60cdc.firebasestorage.app",
    messagingSenderId: "249978804593",
    appId: "1:249978804593:web:3af8312c20125597d5fed0",
    measurementId: "G-J3M2KERP7T"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
console.log("Firebase app initialized:", app.name);

// Initialize Firestore
db = firebase.firestore();
// Initialize Auth
auth = firebase.auth();

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser doesn't support all of the features required to enable persistence.");
    }
  })
  .then(() => {
    console.log("Firestore persistence enabled");
  })
  .catch((error) => {
    console.error("Error enabling Firestore persistence:", error);
  });
