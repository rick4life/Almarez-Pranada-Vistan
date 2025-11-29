import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDRaaBNfbHWYb63RH2c2SHAtu5vS7o6_vw",
  authDomain: "slsu-lost-found.firebaseapp.com",
  projectId: "slsu-lost-found",
  storageBucket: "slsu-lost-found.firebasestorage.app",
  messagingSenderId: "265246771102",
  appId: "1:265246771102:web:6ad824c419d66ea5c1b88f",
  measurementId: "G-KD93HXQEHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Your new admin UID
const ADMIN_UID = "iATEE0C68df2bMp1M4UVPf1EWX2";

// Redirect logged-in users
onAuthStateChanged(auth, async user => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    let userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: user.email === "admin@gmail.com" ? "Admin" : "User",
        email: user.email,
        admin: user.uid === ADMIN_UID
      });
      userDoc = await getDoc(userRef);
    }

    const data = userDoc.data();
    if (data.admin === true) {
      window.location.href = "admin.html";
    } else if (window.location.href.includes("login.html") || window.location.href.includes("signup.html")) {
      window.location.href = "home.html";
    }
  }
});

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      let userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: email === "admin@gmail.com" ? "Admin" : "User",
          email: email,
          admin: user.uid === ADMIN_UID
        });
        userDoc = await getDoc(userRef);
      }

      const data = userDoc.data();
      if (data.admin === true) {
        window.location.href = "admin.html";
      } else {
        window.location.href = "home.html";
      }
    } catch (err) {
      alert(err.message);
    }
  });
}

// SIGNUP
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name: "User",
        email: email,
        admin: false
      });

      alert("Account created! Please log in.");
      window.location.href = "login.html";
    } catch (err) {
      alert(err.message);
    }
  });
}
