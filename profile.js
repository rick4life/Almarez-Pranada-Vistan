import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

const profileName = document.getElementById("profileName");
const profileStudentID = document.getElementById("profileStudentID");
const profilePhone = document.getElementById("profilePhone");
const profileEmail = document.getElementById("profileEmail");

onAuthStateChanged(auth, async user => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        profileName.textContent = `Name: ${data.name ?? "N/A"}`;
        profileStudentID.textContent = `Student ID: ${data.studentID ?? "N/A"}`;
        profilePhone.textContent = `Phone: ${data.phone ?? "N/A"}`;
        profileEmail.textContent = `Email: ${data.email ?? "N/A"}`;
      } else {
        alert("User data not found.");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  } else {
    window.location.href = "login.html";
  }
});

// Logout button
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => window.location.href = "login.html");
});
