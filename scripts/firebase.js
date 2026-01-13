const firebaseConfig = {
  apiKey: "AIzaSyC_QPmomjx6YmP55SiorvkODVHf7-z8mTA",
  authDomain: "digilayn-core-app.firebaseapp.com",
  projectId: "digilayn-core-app",
  storageBucket: "digilayn-core-app.appspot.com",
  messagingSenderId: "362012916883",
  appId: "1:362012916883:web:577fa096e6701656912166",
  measurementId: "G-5JZ99E9GFB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence with multi-tab support
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can still happen if multiple tabs are open with different persistence settings.
      console.warn('Firebase persistence failed: multiple tabs open with different settings.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence.
      console.warn('Firebase persistence failed: browser does not support it.');
    }
  });
