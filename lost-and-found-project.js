const form = document.getElementById("reportForm");
const lostList = document.getElementById("lostList");
const foundList = document.getElementById("foundList");
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");

let items = JSON.parse(localStorage.getItem("items")) || [];

function displayItems() {
  lostList.innerHTML = "";
  foundList.innerHTML = "";

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <h3>${item.name}</h3>
      <p>${item.location}</p>
      ${item.image ? `<img src="${item.image}" class="image-preview">` : ""}
    `;
    card.onclick = () => openModal(index);

    if (item.type === "lost") {
      lostList.appendChild(card);
    } else {
      foundList.appendChild(card);
    }
  });
}

form.addEventListener("submit", function(e) {
  e.preventDefault();

  const type = document.getElementById("type").value;
  const name = document.getElementById("item").value;
  const desc = document.getElementById("desc").value;
  const location = document.getElementById("location").value;
  const date = document.getElementById("date").value;
  const contact = document.getElementById("contact").value;

  let imageData = "";
  if (imageUpload.files[0]) {
    const reader = new FileReader();
    reader.onload = function(event) {
      imageData = event.target.result;
      saveItem();
    };
    reader.readAsDataURL(imageUpload.files[0]);
  } else {
    saveItem();
  }

  function saveItem() {
    items.push({
      type,
      name,
      desc,
      location,
      date,
      contact,
      image: imageData
    });

    localStorage.setItem("items", JSON.stringify(items));
    displayItems();
    form.reset();
    imagePreview.style.display = "none";
  }
});

imageUpload.addEventListener("change", function() {
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
    };
    reader.readAsDataURL(this.files[0]);
  }
});

const modal = document.getElementById("itemModal");
const closeModalBtn = document.getElementById("closeModal");

function openModal(index) {
  const item = items[index];
  document.getElementById("modalTitle").textContent = item.name;
  document.getElementById("modalDesc").textContent = item.desc;
  document.getElementById("modalLocation").textContent = item.location;
  document.getElementById("modalDate").textContent = item.date;
  document.getElementById("modalContact").textContent = item.contact;
  const modalImage = document.getElementById("modalImage");

  if (item.image) {
    modalImage.src = item.image;
    modalImage.style.display = "block";
  } else {
    modalImage.style.display = "none";
  }

  modal.style.display = "flex";
}

closeModalBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

displayItems();
