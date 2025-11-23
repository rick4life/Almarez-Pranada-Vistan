import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

let currentUser = null;

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    console.log("Auth: signed in as", user.email);
  } else {
    console.log("Auth: no user, redirecting to login.html");
    window.location.href = "login.html";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = "login.html");

  const reportBtn = document.getElementById("reportBtn");
  const lostBtn = document.getElementById("lostBtn");
  const foundBtn = document.getElementById("foundBtn");
  const reportFormContainer = document.getElementById("reportFormContainer");
  const lostList = document.getElementById("lostList");
  const foundList = document.getElementById("foundList");
  const reportForm = document.getElementById("reportForm");
  const imageInput = document.getElementById("imageUpload");
  const imagePreview = document.getElementById("imagePreview");

  function showSection(section) {
    if (reportFormContainer) reportFormContainer.style.display = "none";
    if (lostList) lostList.style.display = "none";
    if (foundList) foundList.style.display = "none";

    reportBtn?.classList.remove("active");
    lostBtn?.classList.remove("active");
    foundBtn?.classList.remove("active");

    if (section === "report" && reportFormContainer) {
      reportFormContainer.style.display = "block";
      reportBtn?.classList.add("active");
    } else if (section === "lost" && lostList) {
      lostList.style.display = "block";
      lostBtn?.classList.add("active");
      loadItems("lost", "lostList");
    } else if (section === "found" && foundList) {
      foundList.style.display = "block";
      foundBtn?.classList.add("active");
      loadItems("found", "foundList");
    }
  }

  reportBtn?.addEventListener("click", () => showSection("report"));
  lostBtn?.addEventListener("click", () => showSection("lost"));
  foundBtn?.addEventListener("click", () => showSection("found"));

  if (reportFormContainer) showSection("report");
  if (document.body.id === "lost") showSection("lost");
  if (document.body.id === "found") showSection("found");

  async function loadItems(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn("loadItems: container not found:", containerId);
      return;
    }
    container.innerHTML = "";
    console.log("Loading items for", type);

    try {
      const q = query(collection(db, "items"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      console.log("Firestore returned docs:", snapshot.size);

      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        console.log("doc:", docSnap.id, item);

        if (!item.type) return;
        if (String(item.type).toLowerCase() !== type) return;
        if (item.status && item.status === "claimed") return;

        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <h3>${item.name ?? ""}</h3>
          <p><b>Description:</b> ${item.desc ?? ""}</p>
          <p><b>Location:</b> ${item.location ?? ""}</p>
          <p><b>Date:</b> ${item.date ?? ""}</p>
          <p><b>Reported By:</b> ${item.contact ?? ""}</p>
        `;
        container.appendChild(div);
        setTimeout(() => div.style.opacity = "1", 100);
      });
    } catch (err) {
      console.error("Error loading items:", err);
    }
  }

  reportForm?.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser) {
      alert("User not loaded yet. Please wait.");
      console.log("Submit blocked: currentUser is null");
      return;
    }

    const type = (document.getElementById("type")?.value ?? "").toLowerCase();
    const name = document.getElementById("item")?.value ?? "";
    const desc = document.getElementById("desc")?.value ?? "";
    const location = document.getElementById("location")?.value ?? "";
    const date = document.getElementById("date")?.value ?? "";
    const contact = document.getElementById("contact")?.value ?? "";

    console.log("Submitting item:", { type, name, desc, location, date, contact });

    try {
      await addDoc(collection(db, "items"), {
        type, name, desc, location, date, contact,
        status: "active",
        userEmail: currentUser.email,
        userId: currentUser.uid,
        timestamp: Timestamp.now()
      });
      alert("Item reported successfully!");
      reportForm.reset();
      if (imagePreview) imagePreview.style.display = "none";

      if (document.body.id === "lost" && type === "lost") loadItems("lost", "lostList");
      if (document.body.id === "found" && type === "found") loadItems("found", "foundList");
      if (document.body.id === "" || document.body.id === undefined) {
        if (type === "lost" && lostList) loadItems("lost", "lostList");
        if (type === "found" && foundList) loadItems("found", "foundList");
      }
    } catch (err) {
      console.error("Error reporting item:", err);
      alert("Error reporting item: " + (err.message || err));
    }
  });

  imageInput?.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (file && imagePreview) {
      const reader = new FileReader();
      reader.onload = e => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else if (imagePreview) {
      imagePreview.style.display = "none";
    }
  });
});
