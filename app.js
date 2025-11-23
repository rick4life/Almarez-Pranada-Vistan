import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const reportBtn = document.getElementById("reportBtn");
const lostBtn = document.getElementById("lostBtn");
const foundBtn = document.getElementById("foundBtn");
const reportFormContainer = document.getElementById("reportFormContainer");
const lostList = document.getElementById("lostList");
const foundList = document.getElementById("foundList");
const reportForm = document.getElementById("reportForm");
const submitBtn = reportForm.querySelector("button[type='submit']");

let currentUser = null;

onAuthStateChanged(auth, user => {
  if(user) {
    currentUser = user;
    submitBtn.disabled = false;
  } else {
    window.location.href = "login.html";
  }
});

const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn) logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = "login.html");

function showSection(section) {
  reportFormContainer.style.display = "none";
  lostList.style.display = "none";
  foundList.style.display = "none";

  reportBtn.classList.remove("active");
  lostBtn.classList.remove("active");
  foundBtn.classList.remove("active");

  if(section === "report") {
    reportFormContainer.style.display = "block";
    reportBtn.classList.add("active");
  } else if(section === "lost") {
    lostList.style.display = "block";
    lostBtn.classList.add("active");
    loadItems("lost", "lostList");
  } else if(section === "found") {
    foundList.style.display = "block";
    foundBtn.classList.add("active");
    loadItems("found", "foundList");
  }
}

reportBtn.addEventListener("click", () => showSection("report"));
lostBtn.addEventListener("click", () => showSection("lost"));
foundBtn.addEventListener("click", () => showSection("found"));

showSection("report");

// Load items
async function loadItems(type, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const q = query(collection(db, "items"), orderBy("timestamp", "desc"));
  try {
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      if(item.type !== type || item.status === "claimed") return;

      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <h3>${item.name}</h3>
        <p><b>Description:</b> ${item.desc}</p>
        <p><b>Location:</b> ${item.location}</p>
        <p><b>Date:</b> ${item.date}</p>
        <p><b>Reported By:</b> ${item.contact}</p>
      `;
      container.appendChild(div);
      setTimeout(() => div.style.opacity = "1", 100);
    });
  } catch(error) {
    console.error("Error loading items:", error);
  }
}

// Submit report
reportForm.addEventListener("submit", async e => {
  e.preventDefault();
  if(!currentUser) {
    alert("User not loaded yet. Please wait.");
    return;
  }

  const type = document.getElementById("type").value;
  const name = document.getElementById("item").value;
  const desc = document.getElementById("desc").value;
  const location = document.getElementById("location").value;
  const date = document.getElementById("date").value;
  const contact = document.getElementById("contact").value;

  try {
    await addDoc(collection(db, "items"), {
      type,
      name,
      desc,
      location,
      date,
      contact,
      status: "active",
      userEmail: currentUser.email,
      userId: currentUser.uid,
      timestamp: Timestamp.now()
    });

    alert("Item reported successfully!");
    reportForm.reset();
    document.getElementById("imagePreview").style.display = "none";

    // Refresh Lost or Found list if currently visible
    if(lostList.style.display === "block" && type === "lost") loadItems("lost", "lostList");
    if(foundList.style.display === "block" && type === "found") loadItems("found", "foundList");

  } catch(error) {
    console.error("Error reporting item:", error);
    alert("Error reporting item: " + error.message);
  }
});

// Image preview
const imageInput = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = e => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    imagePreview.style.display = "none";
  }
});
