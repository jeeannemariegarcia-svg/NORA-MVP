
/* NORA Admin Dashboard — Simulated Data */

const baskets = [
  {
    id: 1,
    name: "Stan Grad Centre",
    stock: 32,
    capacity: 50
  },
  {
    id: 2,
    name: "Senator Burns Building",
    stock: 8,
    capacity: 50
  }
];

const inventoryContainer =
  document.getElementById("admin-inventory");

const historyContainer =
  document.getElementById("restock-history");

const restockHistory = [];

function getStatus(basket) {
  if (basket.stock === 0) return "Out of stock";
  if (basket.stock <= 10) return "Low stock";
  return "Available";
}

function updateDashboard() {
  document.getElementById("total-baskets").textContent =
    baskets.length;

  document.getElementById("total-products").textContent =
    baskets.reduce((total, basket) => total + basket.stock, 0);

  document.getElementById("low-stock-count").textContent =
    baskets.filter(basket => basket.stock <= 10).length;
}

function displayInventory() {
  inventoryContainer.innerHTML = "";

  baskets.forEach(basket => {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = basket.name;

    const quantity = document.createElement("p");
    quantity.textContent =
      `Estimated Stock: ${basket.stock} / ${basket.capacity}`;

    const status = document.createElement("p");
    status.textContent = `Status: ${getStatus(basket)}`;
    status.className =
      basket.stock <= 10 ? "status-low" : "status-available";

    const button = document.createElement("button");
    button.className = "button";
    button.textContent = "Simulate Restock";

    button.addEventListener("click", () => {
      const added = basket.capacity - basket.stock;

      if (added === 0) return;

      basket.stock = basket.capacity;

      restockHistory.unshift({
        location: basket.name,
        quantity: added,
        time: new Date().toLocaleString()
      });

      renderDashboard();
    });

    card.append(heading, quantity, status, button);
    inventoryContainer.appendChild(card);
  });
}

function displayHistory() {
  historyContainer.innerHTML = "";

  if (restockHistory.length === 0) {
    historyContainer.textContent =
      "No restocking activities recorded yet.";
    return;
  }

  restockHistory.forEach(record => {
    const entry = document.createElement("p");
    entry.textContent =
      `${record.time} — ${record.location}: +${record.quantity} products`;

    historyContainer.appendChild(entry);
  });
}

function renderDashboard() {
  updateDashboard();
  displayInventory();
  displayHistory();
}

renderDashboard();

