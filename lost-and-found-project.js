let items = JSON.parse(localStorage.getItem("items")) || [];

function displayItems() {
  const lostList = document.getElementById("lostList");
  const foundList = document.getElementById("foundList");
  lostList.innerHTML = "";
  foundList.innerHTML = "";
  
  items.forEach((item, index) => {
    if (item.status === "claimed") return;
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${item.name}</h3>
      <p><b>Description:</b> ${item.desc}</p>
      <p><b>Location:</b> ${item.location}</p>
      <p><b>Contact:</b> ${item.contact}</p>
      <p><b>Date Reported:</b> ${item.date}</p>
      <button onclick="markClaimed(${index})">Mark as Claimed</button>
    `;
    if (item.type === "lost") lostList.appendChild(div);
    else foundList.appendChild(div);
  });
}

document.getElementById("reportForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const type = document.getElementById("type").value;
  const name = document.getElementById("item").value;
  const desc = document.getElementById("desc").value;
  const location = document.getElementById("location").value;
  const contact = document.getElementById("contact").value;
  const date = new Date().toLocaleString();
  
  items.push({ type, name, desc, location, contact, date, status: "active" });
  localStorage.setItem("items", JSON.stringify(items));
  this.reset();
  displayItems();
});

function markClaimed(index) {
  let inputContact = prompt("Enter the contact info used when reporting this item:");
  if (inputContact === items[index].contact) {
    items[index].status = "claimed";
    localStorage.setItem("items", JSON.stringify(items));
    alert("Item successfully marked as claimed!");
    displayItems();
  } else {
    alert("Wrong contact info. You cannot claim this item.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll("nav a");
  links.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      const sectionId = link.getAttribute("href").substring(1);
      document.getElementById(sectionId).scrollIntoView({ behavior: "smooth" });
    });
  });
});

displayItems();