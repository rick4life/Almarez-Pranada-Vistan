import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp, getDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

  const notificationBtn = document.getElementById("notificationBtn");
  const notifDropdown = document.getElementById("notifDropdown");
  const notifCount = document.getElementById("notifCount");

  // Sidebar toggle
  sidebar?.addEventListener("click", () => sidebar.classList.toggle("expanded"));
  sidebar?.addEventListener("mouseover", () => sidebar.classList.add("expanded"));
  sidebar?.addEventListener("mouseout", () => sidebar.classList.remove("expanded"));

  // Auth state
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

    loadNotifications();
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

  // --- Report Form ---
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
            timestamp: Timestamp.now(),
            claimedBy: null,
            claimedByName: "",
            claimedAt: null
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

  // --- Load Items ---
  async function loadItems(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    try {
      const q = query(collection(db, "items"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);

      // Header
      const header = document.createElement("div");
      header.className = "dashboard-table-header";
      header.innerHTML = `
        <div>Item Name</div>
        <div>Description</div>
        <div>Location</div>
        <div>Date</div>
        <div>Reporter</div>
        <div>Image</div>
        <div>Action</div>
      `;
      container.appendChild(header);

      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        item.id = docSnap.id;
        if(!item.type || String(item.type).toLowerCase() !== type) return;

        const row = document.createElement("div");
        row.className = "dashboard-table";

        const isClaimable = !item.status || item.status === "active";
        let actionHTML = "";

        if(isClaimable) actionHTML = `<button class="claimBtnUser">Claim</button>`;
        else if(item.status === "pending") {
          if(currentUserData.role === "admin") {
            actionHTML = `<button class="approveBtn">Approve</button> <button class="rejectBtn">Reject</button>`;
          } else actionHTML = "Pending approval";
        }
        else if(item.status === "approved") actionHTML = "Claimed";

        row.innerHTML = `
          <div>${item.name ?? ""}</div>
          <div>${item.desc ?? ""}</div>
          <div>${item.location ?? ""}</div>
          <div>${item.date ?? ""}</div>
          <div>${item.reporterName ?? "Unknown"}</div>
          <div>${item.imageURL ? `<img src="${item.imageURL}" style="max-width:100px; max-height:80px; border-radius:6px;">` : ""}</div>
          <div>${actionHTML}</div>
        `;

        container.appendChild(row);

        if(isClaimable) {
          row.querySelector(".claimBtnUser")?.addEventListener("click", async () => {
            await updateDoc(doc(db, "items", docSnap.id), {
              status: "pending",
              claimedBy: currentUser.uid,
              claimedByName: currentUserData.name ?? "User",
              claimedAt: Timestamp.now()
            });
            alert("Claim submitted! Waiting for admin approval.");
            loadItems(type, containerId);
            loadDashboard();
            loadNotifications();
          });
        }

        if(currentUserData.role === "admin" && item.status === "pending") {
          row.querySelector(".approveBtn")?.addEventListener("click", async () => {
            await updateDoc(doc(db, "items", docSnap.id), { status: "approved" });
            alert("Claim approved!");
            loadItems(type, containerId);
            loadDashboard();
            loadNotifications();
          });
          row.querySelector(".rejectBtn")?.addEventListener("click", async () => {
            await updateDoc(doc(db, "items", docSnap.id), {
              status: "active",
              claimedBy: null,
              claimedByName: "",
              claimedAt: null
            });
            alert("Claim rejected!");
            loadItems(type, containerId);
            loadDashboard();
            loadNotifications();
          });
        }

        row.addEventListener("click", () => showModal(item));
        setTimeout(() => row.classList.add("show"), 100);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // --- Dashboard ---
  async function loadDashboard() {
    try {
      const snapshot = await getDocs(collection(db, "items"));
      let myClaims = [], othersClaims = [], pendingClaims = [];

      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        item.id = docSnap.id;

        if(item.claimedBy === currentUser.uid && item.status === "pending") {
          pendingClaims.push(item);
        } else if(item.claimedBy === currentUser.uid && item.status === "approved") {
          myClaims.push(item);
        } else if(item.status === "approved" && item.claimedBy !== currentUser.uid) {
          othersClaims.push(item);
        }
      });

      renderItems(myClaims, "myClaimsList");
      renderItems(othersClaims, "othersClaimsList");
      renderItems(pendingClaims, "pendingClaimsList");
    } catch(err) {
      console.error(err);
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
        <p><b>Status:</b> ${item.status}</p>
      `;
      div.addEventListener("click", () => showModal(item));
      container.appendChild(div);
      setTimeout(() => div.classList.add("show"), 100);
    });
  }

  // --- Modal ---
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

    let actionHTML = "";
    if(!item.status || item.status === "active") {
      actionHTML = `<button id="claimBtnModal" style="margin-top:10px;padding:10px 20px;background:#2980b9;color:white;border:none;border-radius:8px;cursor:pointer;">Claim</button>`;
    } else if(currentUserData.role === "admin" && item.status === "pending") {
      actionHTML = `
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button id="approveBtnModal" style="padding:10px 20px;background:#27ae60;color:white;border:none;border-radius:8px;cursor:pointer;">Approve</button>
          <button id="rejectBtnModal" style="padding:10px 20px;background:#c0392b;color:white;border:none;border-radius:8px;cursor:pointer;">Reject</button>
        </div>
      `;
    }

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
      <p><b>Status:</b> ${item.status}</p>
      ${item.imageURL ? `<img src="${item.imageURL}" style="width:100%;margin-top:10px;border-radius:8px;">` : ""}
      ${actionHTML}
      <button id="closeModal" style="margin-top:15px;padding:10px 20px;background:#2980b9;color:white;border:none;border-radius:8px;cursor:pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById("closeModal").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => { if(e.target === modal) modal.remove(); });

    // Modal claim/admin buttons
    document.getElementById("claimBtnModal")?.addEventListener("click", async () => {
      await updateDoc(doc(db, "items", item.id), {
        status: "pending",
        claimedBy: currentUser.uid,
        claimedByName: currentUserData.name ?? "User",
        claimedAt: Timestamp.now()
      });
      alert("Claim submitted! Waiting for admin approval.");
      modal.remove();
      loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
      loadDashboard();
      loadNotifications();
    });

    document.getElementById("approveBtnModal")?.addEventListener("click", async () => {
      await updateDoc(doc(db, "items", item.id), { status: "approved" });
      alert("Claim approved!");
      modal.remove();
      loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
      loadDashboard();
      loadNotifications();
    });

    document.getElementById("rejectBtnModal")?.addEventListener("click", async () => {
      await updateDoc(doc(db, "items", item.id), {
        status: "active",
        claimedBy: null,
        claimedByName: "",
        claimedAt: null
      });
      alert("Claim rejected!");
      modal.remove();
      loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
      loadDashboard();
      loadNotifications();
    });
  }

  // --- Notifications ---
  notificationBtn?.addEventListener("click", () => {
    notifDropdown.style.display = notifDropdown.style.display === "block" ? "none" : "block";
  });

  async function loadNotifications() {
    if(!currentUser) return;
    const snapshot = await getDocs(collection(db, "items"));
    const notifications = [];

    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      item.id = docSnap.id;
      if(currentUserData.role === "admin" && item.status === "pending") notifications.push({ ...item, type: "adminPending" });
      else if(item.claimedBy === currentUser.uid && item.status !== "active") notifications.push({ ...item, type: "userClaim" });
    });

    notifCount.textContent = notifications.length;
    notifDropdown.innerHTML = "";

    notifications.forEach(item => {
      const notif = document.createElement("div");
      notif.style.padding = "10px";
      notif.style.borderBottom = "1px solid #eee";

      if(item.type === "adminPending") {
        notif.innerHTML = `
          <p><b>${item.reporterName}</b> claimed <b>${item.name}</b></p>
          <div style="display:flex;gap:5px;margin-top:5px;">
            <button class="approveBtnNotif" style="padding:5px 10px;background:#27ae60;color:white;border:none;border-radius:6px;cursor:pointer;">Approve</button>
            <button class="rejectBtnNotif" style="padding:5px 10px;background:#c0392b;color:white;border:none;border-radius:6px;cursor:pointer;">Reject</button>
          </div>
        `;

        notif.querySelector(".approveBtnNotif")?.addEventListener("click", async () => {
          await updateDoc(doc(db, "items", item.id), { status: "approved" });
          alert("Claim approved!");
          loadNotifications();
          loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
          loadDashboard();
        });

        notif.querySelector(".rejectBtnNotif")?.addEventListener("click", async () => {
          await updateDoc(doc(db, "items", item.id), {
            status: "active",
            claimedBy: null,
            claimedByName: "",
            claimedAt: null
          });
          alert("Claim rejected!");
          loadNotifications();
          loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
          loadDashboard();
        });

      } else if(item.type === "userClaim") {
        notif.innerHTML = `<p>Your claim on <b>${item.name}</b> is <b>${item.status}</b></p>`;
      }

      notifDropdown.appendChild(notif);
    });
  }

  setInterval(loadNotifications, 10000);
});
