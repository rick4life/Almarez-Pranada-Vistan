import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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
let currentUserData = null;

const submitBtn = document.querySelector("#reportForm button[type='submit']");
if (submitBtn) submitBtn.disabled = false;

onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      currentUserData = userDoc.exists() ? userDoc.data() : {};
    } catch (err) {
      console.error("Error fetching user data:", err);
      currentUserData = {};
    }
  } else {
    window.location.href = "login.html";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "login.html"));

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

  if (document.body.id === "lost") showSection("lost");
  else if (document.body.id === "found") showSection("found");
  else if (reportFormContainer) showSection("report");

  async function loadItems(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    try {
      const q = query(collection(db, "items"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);

      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        if (!item.type || String(item.type).toLowerCase() !== type) return;
        if (item.status && item.status === "claimed") return;

        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <h3>${item.name ?? ""}</h3>
          <p><b>Description:</b> ${item.desc ?? ""}</p>
          <p><b>Location:</b> ${item.location ?? ""}</p>
          <p><b>Date:</b> ${item.date ?? ""}</p>
          <p><b>Reporter:</b> ${item.reporterName ?? "Unknown"}</p>
          <p><b>Student ID:</b> ${item.reporterStudentID ?? "N/A"}</p>
          <p><b>Phone:</b> ${item.reporterPhone ?? "N/A"}</p>
          <p><b>Email:</b> ${item.userEmail ?? "N/A"}</p>
          ${item.imageURL ? `<img src="${item.imageURL}" class="reported-image">` : ""}
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
    if (!currentUser || !currentUserData || !currentUserData.name || !currentUserData.studentID) {
      alert("Please wait. User data not loaded.");
      return;
    }

    const type = document.getElementById("type").value;
    const name = document.getElementById("item").value;
    const desc = document.getElementById("desc").value;
    const location = document.getElementById("location").value;
    const date = document.getElementById("date").value;
    const contact = document.getElementById("contact").value;

    let imageURL = "";
    const file = imageInput?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async e => {
        imageURL = e.target.result;
        await saveReport();
      };
      reader.readAsDataURL(file);
    } else {
      await saveReport();
    }

    async function saveReport() {
      try {
        await addDoc(collection(db, "items"), {
          type,
          name,
          desc,
          location,
          date,
          contact,
          status: "active",
          userId: currentUser.uid,
          userEmail: currentUserData.email ?? "",
          reporterName: currentUserData.name ?? "Unknown",
          reporterStudentID: currentUserData.studentID ?? "",
          reporterPhone: currentUserData.phone ?? "",
          imageURL,
          timestamp: Timestamp.now()
        });

        alert("Item reported successfully!");
        reportForm.reset();
        if (imagePreview) imagePreview.style.display = "none";

        if (type === "lost" && lostList) loadItems("lost", "lostList");
        if (type === "found" && foundList) loadItems("found", "foundList");

      } catch (err) {
        console.error("Error reporting item:", err);
        alert("Error reporting: " + err.message);
      }
    }
  });

  imageInput?.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      if (imagePreview) imagePreview.style.display = "none";
    }
  });
});
