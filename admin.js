/* NORA Admin Dashboard — browser-local simulated inventory.
   This is a capstone demonstration, NOT a shared or secure inventory database. */

const defaultBaskets = [
  { id: 1, name: "Stan Grad Centre", stock: 32, capacity: 50 },
  { id: 2, name: "Senator Burns Building", stock: 8, capacity: 50 }
];

function readStoredArray(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.warn("Unable to read saved NORA data:", key, error);
    return fallback;
  }
}

const baskets = readStoredArray("noraBaskets", defaultBaskets);
const restockHistory = readStoredArray("noraRestockHistory", []);
const inventoryContainer = document.getElementById("admin-inventory");
const historyContainer = document.getElementById("restock-history");

function saveInventory() {
  localStorage.setItem("noraBaskets", JSON.stringify(baskets));
}

function saveHistory() {
  localStorage.setItem("noraRestockHistory", JSON.stringify(restockHistory));
}

function getStatus(basket) {
  if (basket.stock === 0) return "Out of stock";
  if (basket.stock <= 10) return "Low stock";
  return "Available";
}

function logChange(basket, change, action) {
  restockHistory.unshift({
    location: basket.name,
    quantity: change,
    action,
    time: new Date().toLocaleString()
  });
  saveHistory();
}

function changeStock(basket, nextStock, action) {
  const validStock = Number(nextStock);
  if (!Number.isInteger(validStock) || validStock < 0 || validStock > basket.capacity) {
    alert("Enter a whole number between 0 and " + basket.capacity + ".");
    return;
  }
  const change = validStock - basket.stock;
  if (change === 0) return;
  basket.stock = validStock;
  saveInventory();
  logChange(basket, change, action);
  renderDashboard();
}

function updateDashboard() {
  document.getElementById("total-baskets").textContent = baskets.length;
  document.getElementById("total-products").textContent =
    baskets.reduce((total, basket) => total + basket.stock, 0);
  document.getElementById("low-stock-count").textContent =
    baskets.filter(basket => basket.stock <= 10).length;
}

function makeButton(text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function displayInventory() {
  inventoryContainer.replaceChildren();

  baskets.forEach(basket => {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = basket.name;

    const quantity = document.createElement("p");
    quantity.textContent = `Estimated Stock: ${basket.stock} / ${basket.capacity}`;

    const status = document.createElement("p");
    status.textContent = `Status: ${getStatus(basket)}`;
    status.className = basket.stock <= 10 ? "status-low" : "status-available";

    const restockButton = makeButton("Simulate Restock", () => {
      changeStock(basket, basket.capacity, "Simulated restock");
    });

    const lowStockButton = makeButton("Simulate Low Stock", () => {
      changeStock(basket, Math.min(8, basket.capacity), "Simulated low stock");
    });

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "10px";
    controls.append(restockButton, lowStockButton);

    const adjustmentLabel = document.createElement("label");
    adjustmentLabel.textContent = "Set estimated stock quantity";
    adjustmentLabel.style.display = "block";
    adjustmentLabel.style.marginTop = "16px";

    const adjustmentInput = document.createElement("input");
    adjustmentInput.type = "number";
    adjustmentInput.min = "0";
    adjustmentInput.max = String(basket.capacity);
    adjustmentInput.step = "1";
    adjustmentInput.value = String(basket.stock);
    adjustmentInput.setAttribute("aria-label", "Estimated stock for " + basket.name);
    adjustmentInput.style.maxWidth = "100px";
    adjustmentInput.style.marginRight = "10px";

    const saveButton = makeButton("Save Quantity", () => {
      if (adjustmentInput.value.trim() === "") {
        alert("Please enter a quantity.");
        return;
      }
      changeStock(basket, Number(adjustmentInput.value), "Manual adjustment");
    });

    const adjustmentRow = document.createElement("div");
    adjustmentRow.style.marginTop = "8px";
    adjustmentRow.append(adjustmentInput, saveButton);

    card.append(heading, quantity, status, controls, adjustmentLabel, adjustmentRow);
    inventoryContainer.appendChild(card);
  });
}

function displayHistory() {
  historyContainer.replaceChildren();
  if (restockHistory.length === 0) {
    historyContainer.textContent = "No inventory activities recorded yet.";
    return;
  }

  restockHistory.forEach(record => {
    const entry = document.createElement("p");
    const quantity = Number(record.quantity);
    const sign = quantity > 0 ? "+" : "";
    entry.textContent = `${record.time} — ${record.location}: ${sign}${quantity} products (${record.action || "Restock"})`;
    historyContainer.appendChild(entry);
  });
}

function renderDashboard() {
  updateDashboard();
  displayInventory();
  displayHistory();
}

saveInventory();
renderDashboard();
