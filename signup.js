import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRaaBNfbHWYb63RH2c2SHAtu5vS7o6_vw",
  authDomain: "slsu-lost-found.firebaseapp.com",
  projectId: "slsu-lost-found",
  storageBucket: "slsu-lost-found.firebasestorage.app",
  messagingSenderId: "265246771102",
  appId: "1:265246771102:web:6ad824c419d66ea5c1b88f",
  measurementId: "G-KD93HXQEHM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const signupForm = document.getElementById("signupForm");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const studentID = document.getElementById("studentID").value;
  const phone = document.getElementById("phone").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save extra user info to Firestore
    await setDoc(doc(db, "users", user.uid), {
      name,
      studentID,
      phone,
      email
    });

    alert("Account created successfully!");
    window.location.href = "home.html";
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
});
