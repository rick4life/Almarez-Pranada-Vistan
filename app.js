import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase Config
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

document.addEventListener("DOMContentLoaded", () => {

  const sidebar = document.getElementById("sidebar");
  const logoutBtn = document.getElementById("logoutBtn");
  const reportForm = document.getElementById("reportForm");
  const imageInput = document.getElementById("imageUpload");
  const imagePreview = document.getElementById("imagePreview");

  const lostList = document.getElementById("lostList");
  const foundList = document.getElementById("foundList");

  const profileName = document.getElementById("profileName");
  const profileStudentID = document.getElementById("profileStudentID");
  const profilePhone = document.getElementById("profilePhone");
  const profileEmail = document.getElementById("profileEmail");

  const myClaimsList = document.getElementById("myClaimsList");
  const othersClaimsList = document.getElementById("othersClaimsList");
  const pendingClaimsList = document.getElementById("pendingClaimsList");

  // Sidebar toggle
  sidebar?.addEventListener("click", () => sidebar.classList.toggle("expanded"));
  sidebar?.addEventListener("mouseover", () => sidebar.classList.add("expanded"));
  sidebar?.addEventListener("mouseout", () => sidebar.classList.remove("expanded"));

  onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "login.html";
    currentUser = user;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      currentUserData = userDoc.exists() ? userDoc.data() : {};
    } catch (err) {
      console.error(err);
      currentUserData = {};
    }

    if(profileName) profileName.textContent = "Name: " + (currentUserData.name ?? "Unknown");
    if(profileStudentID) profileStudentID.textContent = "Student ID: " + (currentUserData.studentID ?? "N/A");
    if(profilePhone) profilePhone.textContent = "Phone: " + (currentUserData.phone ?? "N/A");
    if(profileEmail) profileEmail.textContent = "Email: " + (currentUserData.email ?? "N/A");

    if(lostList) loadItems("lost", "lostList");
    if(foundList) loadItems("found", "foundList");

    if(myClaimsList || othersClaimsList || pendingClaimsList) {
      loadDashboard();
    }
  });

  logoutBtn?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "login.html"));

  if(imageInput) imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if(file && imagePreview) {
      const reader = new FileReader();
      reader.onload = e => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else if(imagePreview) imagePreview.style.display = "none";
  });

  if(reportForm) {
    reportForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if(!currentUserData || !currentUserData.name) return alert("Please wait. User data not loaded.");

      const type = document.getElementById("type").value;
      const name = document.getElementById("item").value;
      const desc = document.getElementById("desc").value;
      const location = document.getElementById("location").value;
      const date = document.getElementById("date").value;
      const contact = document.getElementById("contact").value;

      let imageURL = "";
      const file = imageInput?.files[0];
      if(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
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
            contact: contact || "",
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
          if(imagePreview) imagePreview.style.display = "none";

          if(type === "lost" && lostList) loadItems("lost", "lostList");
          if(type === "found" && foundList) loadItems("found", "foundList");
        } catch(err) {
          console.error(err);
          alert("Error reporting: " + err.message);
        }
      }
    });
  }

  // --- Load Lost / Found as table ---
  async function loadItems(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    try {
      const q = query(collection(db, "items"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);

      // Header row
      const header = document.createElement("div");
      header.className = "dashboard-table-header";
      header.innerHTML = `
        <div>Item Name</div>
        <div>Description</div>
        <div>Location</div>
        <div>Date</div>
        <div>Reporter</div>
        <div>Image</div>
      `;
      container.appendChild(header);

      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        if(!item.type || String(item.type).toLowerCase() !== type) return;
        if(item.status && item.status === "claimed") return;

        const row = document.createElement("div");
        row.className = "dashboard-table";
        row.innerHTML = `
          <div>${item.name ?? ""}</div>
          <div>${item.desc ?? ""}</div>
          <div>${item.location ?? ""}</div>
          <div>${item.date ?? ""}</div>
          <div>${item.reporterName ?? "Unknown"}</div>
          <div>${item.imageURL ? `<img src="${item.imageURL}" style="max-width:100px; max-height:80px; border-radius:6px;">` : ""}</div>
        `;

        row.addEventListener("click", () => showModal(item));
        container.appendChild(row);
        setTimeout(() => row.classList.add("show"), 100);
      });
    } catch (err) {
      console.error("Error loading items:", err);
    }
  }

  async function loadDashboard() {
    try {
      const snapshot = await getDocs(collection(db, "items"));
      let myClaims = [];
      let othersClaims = [];
      let pendingClaims = [];

      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        if(item.status === "claimed") {
          if(item.claimedBy === currentUser.uid) myClaims.push(item);
          else othersClaims.push(item);
        } else if(item.status === "pending") {
          pendingClaims.push(item);
        }
      });

      renderItems(myClaims, "myClaimsList");
      renderItems(othersClaims, "othersClaimsList");
      renderItems(pendingClaims, "pendingClaimsList");

    } catch(err) {
      console.error("Error loading dashboard:", err);
    }
  }

  function renderItems(items, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = "";

    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <h3>${item.name}</h3>
        <p><b>Type:</b> ${item.type}</p>
        <p><b>Description:</b> ${item.desc}</p>
        <p><b>Location:</b> ${item.location}</p>
        <p><b>Date:</b> ${item.date}</p>
        <p><b>Reporter:</b> ${item.reporterName}</p>
      `;

      div.addEventListener("click", () => showModal(item));

      container.appendChild(div);
      setTimeout(() => div.classList.add("show"), 100);
    });
  }

  function showModal(item) {
    const existing = document.getElementById("itemModal");
    if(existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "itemModal";
    modal.style.position = "fixed";
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0,0,0,0.6)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = 9999;

    const content = document.createElement("div");
    content.style.background = "#fff";
    content.style.borderRadius = "12px";
    content.style.padding = "20px";
    content.style.maxWidth = "500px";
    content.style.width = "90%";
    content.style.maxHeight = "80%";
    content.style.overflowY = "auto";

    content.innerHTML = `
      <h2>${item.name}</h2>
      <p><b>Type:</b> ${item.type}</p>
      <p><b>Description:</b> ${item.desc}</p>
      <p><b>Location:</b> ${item.location}</p>
      <p><b>Date:</b> ${item.date}</p>
      <p><b>Reporter:</b> ${item.reporterName}</p>
      <p><b>Student ID:</b> ${item.reporterStudentID ?? "N/A"}</p>
      <p><b>Phone:</b> ${item.reporterPhone ?? "N/A"}</p>
      <p><b>Email:</b> ${item.userEmail ?? "N/A"}</p>
      ${item.imageURL ? `<img src="${item.imageURL}" style="width:100%;margin-top:10px;border-radius:8px;">` : ""}
      <button id="closeModal" style="margin-top:15px;padding:10px 20px;background:#2980b9;color:white;border:none;border-radius:8px;cursor:pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById("closeModal").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => { if(e.target === modal) modal.remove(); });
  }

});
