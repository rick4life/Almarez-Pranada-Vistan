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

  onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "login.html";
    currentUser = user;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      currentUserData = userDoc.exists() ? userDoc.data() : {};
      // ensure email/phone/name fields exist on currentUserData if set on auth
      if (!currentUserData.email && user.email) currentUserData.email = user.email;
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

    if(myClaimsList || othersClaimsList || pendingClaimsList) loadDashboard();

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
      } else await saveReport();

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

  // Helper: safe update with error handling
  async function safeUpdateItem(id, updates) {
    if (!id) {
      alert("Error: missing item id.");
      console.error("safeUpdateItem called with missing id", updates);
      return;
    }
    try {
      await updateDoc(doc(db, "items", id), updates);
    } catch (err) {
      console.error("Failed to update item:", err);
      alert("Failed to update item: " + (err.message || err));
      throw err;
    }
  }

  // --- Load Items ---
  async function loadItems(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    try {
      const q = query(collection(db, "items"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);

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
        const item = docSnap.data() ?? {};
        // Ensure id is always present
        item.id = docSnap.id;

        if(!item.type || String(item.type).toLowerCase() !== type) return;

        const row = document.createElement("div");
        row.className = "dashboard-table";

        let actionHTML = "";
        if(!item.status || item.status === "active") {
          if(currentUserData?.role !== "admin") actionHTML = `<button class="claimBtnUser" data-id="${item.id}">Claim</button>`;
          else actionHTML = "Item active";
        } else if(item.status === "pending") {
          if(item.claimedBy === currentUser.uid) actionHTML = "Claim submitted. Waiting for admin approval";
          else if(currentUserData?.role === "admin") actionHTML = `<button class="approveBtn" data-id="${item.id}">Approve</button> <button class="rejectBtn" data-id="${item.id}">Reject</button>`;
          else actionHTML = "Pending approval";
        } else if(item.status === "approved") {
          actionHTML = item.claimedBy === currentUser.uid ? "Claimed by you" : "Claimed";
        }

        row.innerHTML = `
          <div>${escapeHtml(item.name ?? "")}</div>
          <div>${escapeHtml(item.desc ?? "")}</div>
          <div>${escapeHtml(item.location ?? "")}</div>
          <div>${escapeHtml(item.date ?? "")}</div>
          <div>${escapeHtml(item.reporterName ?? "Unknown")}</div>
          <div>${item.imageURL ? `<img src="${item.imageURL}" style="max-width:100px; max-height:80px; border-radius:6px;">` : ""}</div>
          <div>${actionHTML}</div>
        `;

        container.appendChild(row);

        // Claim button inside table: stop propagation so row click doesn't open modal
        row.querySelector(".claimBtnUser")?.addEventListener("click", async (e) => {
          e.stopPropagation(); // Prevent row click from firing
          const btn = e.currentTarget;
          const id = btn?.dataset?.id;
          if (!id) { alert("Error: missing item id for claim."); return; }

          try {
            await safeUpdateItem(id, {
              status: "pending",
              claimedBy: currentUser.uid,
              claimedByName: currentUserData?.name ?? "User",
              claimedAt: Timestamp.now()
            });
            alert("Claim submitted! Waiting for admin approval.");
            loadItems(type, containerId);
            loadDashboard();
            loadNotifications();
          } catch (err) {
            // error already handled in safeUpdateItem
          }
        });

        row.querySelector(".approveBtn")?.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.dataset.id;
          if (!id) { alert("Error: missing item id for approve."); return; }
          try {
            await safeUpdateItem(id, { status: "approved" });
            alert("Claim approved!");
            loadItems(type, containerId);
            loadDashboard();
            loadNotifications();
          } catch (err) {}
        });

        row.querySelector(".rejectBtn")?.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.dataset.id;
          if (!id) { alert("Error: missing item id for reject."); return; }
          try {
            await safeUpdateItem(id, {
              status: "active",
              claimedBy: null,
              claimedByName: "",
              claimedAt: null
            });
            alert("Claim rejected!");
            loadItems(type, containerId);
            loadDashboard();
            loadNotifications();
          } catch (err) {}
        });

        // Only open modal if click is NOT on a button (stopPropagation above prevents buttons)
        row.addEventListener("click", () => showModal(item));
        setTimeout(() => row.classList.add("show"), 100);
      });
    } catch(err) { console.error(err); }
  }

  // --- Dashboard and Modal and Notifications ---
  async function loadDashboard() {
    try {
      const snapshot = await getDocs(collection(db, "items"));
      let myClaims = [], othersClaims = [], pendingClaims = [];

      snapshot.forEach(docSnap => {
        const item = docSnap.data() ?? {};
        item.id = docSnap.id; // ensure id
        // Normalize status and claimedBy fields if missing
        const status = item.status ?? "active";
        const claimedBy = item.claimedBy ?? null;

        if(claimedBy === currentUser.uid && status === "pending") pendingClaims.push(item);
        else if(claimedBy === currentUser.uid && status === "approved") myClaims.push(item);
        else if(status === "approved" && claimedBy && claimedBy !== currentUser.uid) othersClaims.push(item);
      });

      renderItems(myClaims, "myClaimsList");
      renderItems(othersClaims, "othersClaimsList");
      renderItems(pendingClaims, "pendingClaimsList");
    } catch(err) { console.error(err); }
  }

  function renderItems(items, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = "";

    items.forEach(item => {
      // safety: ensure id present
      if (!item || !item.id) {
        console.warn("renderItems: item missing id, skipping", item);
        return;
      }

      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <h3>${escapeHtml(item.name)}</h3>
        <p><b>Type:</b> ${escapeHtml(item.type)}</p>
        <p><b>Description:</b> ${escapeHtml(item.desc)}</p>
        <p><b>Location:</b> ${escapeHtml(item.location)}</p>
        <p><b>Date:</b> ${escapeHtml(item.date)}</p>
        <p><b>Reporter:</b> ${escapeHtml(item.reporterName)}</p>
        <p><b>Status:</b> ${escapeHtml(item.status)}</p>
      `;
      div.addEventListener("click", () => showModal(item));
      container.appendChild(div);
      setTimeout(() => div.classList.add("show"), 100);
    });
  }

  function showModal(item) {
    // Safety checks: ensure item and id exist
    if (!item || !item.id) {
      console.error("showModal called with invalid item:", item);
      alert("Error: Unable to open item details (missing id).");
      return;
    }

    // Remove existing modal
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
      if(currentUserData?.role !== "admin") actionHTML = `<button id="claimBtnModal" data-id="${item.id}" style="margin-top:10px;padding:10px 20px;background:#2980b9;color:white;border:none;border-radius:8px;cursor:pointer;">Claim</button>`;
      else actionHTML = "Item active";
    } else if(item.status === "pending") {
      if(item.claimedBy === currentUser.uid) actionHTML = "Claim submitted. Waiting for admin approval";
      else if(currentUserData?.role === "admin") actionHTML = `<div style="display:flex;gap:10px;margin-top:10px;">
          <button id="approveBtnModal" data-id="${item.id}" style="padding:10px 20px;background:#27ae60;color:white;border:none;border-radius:8px;cursor:pointer;">Approve</button>
          <button id="rejectBtnModal" data-id="${item.id}" style="padding:10px 20px;background:#c0392b;color:white;border:none;border-radius:8px;cursor:pointer;">Reject</button>
        </div>`;
      else actionHTML = "Pending approval";
    } else if(item.status === "approved") actionHTML = item.claimedBy === currentUser.uid ? "Claimed by you" : "Claimed";

    content.innerHTML = `
      <h2>${escapeHtml(item.name)}</h2>
      <p><b>Type:</b> ${escapeHtml(item.type)}</p>
      <p><b>Description:</b> ${escapeHtml(item.desc)}</p>
      <p><b>Location:</b> ${escapeHtml(item.location)}</p>
      <p><b>Date:</b> ${escapeHtml(item.date)}</p>
      <p><b>Reporter:</b> ${escapeHtml(item.reporterName)}</p>
      <p><b>Student ID:</b> ${escapeHtml(item.reporterStudentID ?? "N/A")}</p>
      <p><b>Phone:</b> ${escapeHtml(item.reporterPhone ?? "N/A")}</p>
      <p><b>Email:</b> ${escapeHtml(item.userEmail ?? "N/A")}</p>
      <p><b>Status:</b> ${escapeHtml(item.status)}</p>
      ${item.imageURL ? `<img src="${item.imageURL}" style="width:100%;margin-top:10px;border-radius:8px;">` : ""}
      ${actionHTML}
      <button id="closeModal" style="margin-top:15px;padding:10px 20px;background:#2980b9;color:white;border:none;border-radius:8px;cursor:pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // close handlers
    document.getElementById("closeModal").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => { if(e.target === modal) modal.remove(); });

    // Modal Claim button handler (use dataset id and stop propagation)
    const claimBtnModal = document.getElementById("claimBtnModal");
    claimBtnModal?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = e.currentTarget?.dataset?.id ?? item.id;
      if (!id) { alert("Error: missing item id."); return; }

      try {
        await safeUpdateItem(id, {
          status: "pending",
          claimedBy: currentUser.uid,
          claimedByName: currentUserData?.name ?? "User",
          claimedAt: Timestamp.now()
        });
        alert("Claim submitted! Waiting for admin approval.");
        modal.remove();
        loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
        loadDashboard();
        loadNotifications();
      } catch (err) {}
    });

    // Modal approve/reject for admins
    const approveBtnModal = document.getElementById("approveBtnModal");
    approveBtnModal?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = e.currentTarget?.dataset?.id ?? item.id;
      if (!id) { alert("Error: missing item id."); return; }
      try {
        await safeUpdateItem(id, { status: "approved" });
        alert("Claim approved!");
        modal.remove();
        loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
        loadDashboard();
        loadNotifications();
      } catch (err) {}
    });

    const rejectBtnModal = document.getElementById("rejectBtnModal");
    rejectBtnModal?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = e.currentTarget?.dataset?.id ?? item.id;
      if (!id) { alert("Error: missing item id."); return; }
      try {
        await safeUpdateItem(id, {
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
      } catch (err) {}
    });
  }

  notificationBtn?.addEventListener("click", () => {
    if (!notifDropdown) return;
    notifDropdown.style.display = notifDropdown.style.display === "block" ? "none" : "block";
  });

  async function loadNotifications() {
    if(!currentUser) return;
    try {
      const snapshot = await getDocs(collection(db, "items"));
      const notifications = [];

      snapshot.forEach(docSnap => {
        const item = docSnap.data() ?? {};
        item.id = docSnap.id;
        if(currentUserData?.role === "admin" && item.status === "pending") notifications.push({ ...item, _notifType: "adminPending" });
        else if(item.claimedBy === currentUser.uid && item.status !== "active") notifications.push({ ...item, _notifType: "userClaim" });
      });

      notifCount.textContent = notifications.length;
      notifDropdown.innerHTML = "";

      notifications.forEach(item => {
        const notif = document.createElement("div");
        notif.style.padding = "10px";
        notif.style.borderBottom = "1px solid #eee";

        if(item._notifType === "adminPending") {
          notif.innerHTML = `
            <p><b>${escapeHtml(item.reporterName)}</b> claimed <b>${escapeHtml(item.name)}</b></p>
            <div style="display:flex;gap:5px;margin-top:5px;">
              <button class="approveBtnNotif" data-id="${item.id}" style="padding:5px 10px;background:#27ae60;color:white;border:none;border-radius:6px;cursor:pointer;">Approve</button>
              <button class="rejectBtnNotif" data-id="${item.id}" style="padding:5px 10px;background:#c0392b;color:white;border:none;border-radius:6px;cursor:pointer;">Reject</button>
            </div>
          `;

          notif.querySelector(".approveBtnNotif")?.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = e.currentTarget?.dataset?.id;
            if (!id) { alert("Error: missing id."); return; }
            try {
              await safeUpdateItem(id, { status: "approved" });
              alert("Claim approved!");
              loadNotifications();
              loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
              loadDashboard();
            } catch (err) {}
          });

          notif.querySelector(".rejectBtnNotif")?.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = e.currentTarget?.dataset?.id;
            if (!id) { alert("Error: missing id."); return; }
            try {
              await safeUpdateItem(id, {
                status: "active",
                claimedBy: null,
                claimedByName: "",
                claimedAt: null
              });
              alert("Claim rejected!");
              loadNotifications();
              loadItems(item.type, item.type === "lost" ? "lostList" : "foundList");
              loadDashboard();
            } catch (err) {}
          });

        } else if(item._notifType === "userClaim") {
          notif.innerHTML = `<p>Your claim on <b>${escapeHtml(item.name)}</b> is <b>${escapeHtml(item.status)}</b></p>`;
        }

        notifDropdown.appendChild(notif);
      });
    } catch (err) {
      console.error("loadNotifications error", err);
    }
  }

  // Use a single interval to refresh notifications; ensure only one interval runs
  let notifInterval = null;
  if (!notifInterval) {
    notifInterval = setInterval(loadNotifications, 10000);
  }

  // Simple helper to prevent XSS when inserting text into innerHTML templates
  function escapeHtml(text) {
    if (text === undefined || text === null) return "";
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
