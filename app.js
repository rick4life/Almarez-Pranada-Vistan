import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, Timestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

let currentUser = null;
onAuthStateChanged(auth, user => {
  if (user) currentUser = user;
  else window.location.href = "login.html";
});

// Logout button
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.onclick = () => { signOut(auth); window.location.href = "login.html"; };

// Load items
async function loadItems(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const q = query(collection(db, "items"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const item = docSnap.data();
    if (item.type !== type || item.status === "claimed") return;
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${item.name}</h3>
      <p><b>Description:</b> ${item.desc}</p>
      <p><b>Location:</b> ${item.location}</p>
      <p><b>Reported By:</b> ${item.userEmail}</p>
      <p><b>Date:</b> ${item.timestamp.toDate().toLocaleString()}</p>
      <button onclick="markClaimed('${docSnap.id}')">Mark as Claimed</button>
    `;
    container.appendChild(div);
    setTimeout(() => { div.style.opacity = "1"; }, 100);
  });
}

// Claim item
window.markClaimed = async docId => {
  const docRef = doc(db, "items", docId);
  const inputUid = prompt("Enter your UID to claim this item:");
  const snap = await docRef.get?.() || await getDocs(doc(db, "items", docId));
  const data = snap.data();
  if (inputUid === data.userId) {
    await updateDoc(docRef, { status: "claimed" });
    alert("Item claimed!");
    location.reload();
  } else {
    alert("Wrong UID!");
  }
};

// Report form
const reportForm = document.getElementById("reportForm");
if (reportForm) {
  reportForm.addEventListener("submit", async e => {
    e.preventDefault();
    const type = document.getElementById("type").value;
    const name = document.getElementById("item").value;
    const desc = document.getElementById("desc").value;
    const location = document.getElementById("location").value;
    await addDoc(collection(db, "items"), {
      type,
      name,
      desc,
      location,
      status: "active",
      userEmail: currentUser.email,
      userId: currentUser.uid,
      timestamp: Timestamp.now()
    });
    alert("Item reported!");
    reportForm.reset();
  });
}

// Load lost/found items if lists exist
loadItems("lost", "lostList");
loadItems("found", "foundList");

// Scroll animation
const sections = document.querySelectorAll("section");
window.addEventListener("scroll", () => {
  sections.forEach(sec => {
    const rect = sec.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      sec.style.opacity = "1";
      sec.style.transform = "translateY(0)";
    }
  });
});
