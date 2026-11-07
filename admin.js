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
baskets.forEach(basket => {
  if (!Number.isInteger(basket.threshold) || basket.threshold < 0) basket.threshold = 10;
  if (typeof basket.active !== "boolean") basket.active = true;
});
const activeBaskets = () => baskets.filter(basket => basket.active !== false);
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
  if (basket.stock <= basket.threshold) return "Low stock";
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
  document.getElementById("total-baskets").textContent = activeBaskets().length;
  document.getElementById("total-products").textContent =
    activeBaskets().reduce((total, basket) => total + basket.stock, 0);
  document.getElementById("low-stock-count").textContent =
    activeBaskets().filter(basket => basket.stock <= basket.threshold).length;
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

  activeBaskets().forEach(basket => {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = basket.name;

    const quantity = document.createElement("p");
    quantity.textContent = `Estimated Stock: ${basket.stock} / ${basket.capacity}`;

    const status = document.createElement("p");
    status.textContent = `Status: ${getStatus(basket)}`;
    status.className = basket.stock <= basket.threshold ? "status-low" : "status-available";

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

    const settings = document.createElement("div");
    settings.style.marginTop = "18px";
    const settingsHeading = document.createElement("h4");
    settingsHeading.textContent = "Basket settings";
    const capacityLabel = document.createElement("label");
    capacityLabel.textContent = "Capacity ";
    const capacityInput = document.createElement("input");
    capacityInput.type = "number";
    capacityInput.min = "1";
    capacityInput.step = "1";
    capacityInput.value = basket.capacity;
    capacityInput.style.width = "85px";
    capacityInput.setAttribute("aria-label", "Capacity for " + basket.name);
    capacityLabel.append(capacityInput);
    const thresholdLabel = document.createElement("label");
    thresholdLabel.textContent = " Low-stock alert at ";
    const thresholdInput = document.createElement("input");
    thresholdInput.type = "number";
    thresholdInput.min = "0";
    thresholdInput.step = "1";
    thresholdInput.value = basket.threshold;
    thresholdInput.style.width = "85px";
    thresholdInput.setAttribute("aria-label", "Low-stock threshold for " + basket.name);
    thresholdLabel.append(thresholdInput);
    const saveSettings = makeButton("Save Basket Settings", () => {
      const capacity = Number(capacityInput.value);
      const threshold = Number(thresholdInput.value);
      if (!capacityInput.value.trim() || !thresholdInput.value.trim() ||
          !Number.isInteger(capacity) || capacity < 1 ||
          !Number.isInteger(threshold) || threshold < 0 || threshold > capacity ||
          capacity < basket.stock) {
        alert("Capacity must be a positive whole number at least as large as current stock. Threshold must be a whole number from 0 to capacity.");
        return;
      }
      basket.capacity = capacity;
      basket.threshold = threshold;
      saveInventory();
      logChange(basket, 0, "Basket settings updated");
      renderDashboard();
    });
    const deactivateButton = makeButton("Deactivate Basket", () => {
      if (!confirm("Deactivate " + basket.name + "? Its inventory and history will be preserved.")) return;
      basket.active = false;
      saveInventory();
      logChange(basket, 0, "Basket deactivated");
      renderDashboard();
    });
    settings.append(settingsHeading, capacityLabel, thresholdLabel, document.createElement("p"), saveSettings, document.createTextNode(" "), deactivateButton);
    card.append(heading, quantity, status, controls, adjustmentLabel, adjustmentRow, settings);
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

const addBasketForm = document.getElementById("add-basket-form");
addBasketForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("new-basket-name").value.trim();
  const capacityValue = document.getElementById("new-basket-capacity").value;
  const thresholdValue = document.getElementById("new-basket-threshold").value;
  const capacity = Number(capacityValue);
  const threshold = Number(thresholdValue);
  if (!name || !capacityValue || !thresholdValue ||
      !Number.isInteger(capacity) || capacity < 1 ||
      !Number.isInteger(threshold) || threshold < 0 || threshold > capacity) {
    alert("Enter a location name, positive whole-number capacity, and threshold between 0 and capacity.");
    return;
  }
  if (baskets.some(b => b.name.toLowerCase() === name.toLowerCase())) {
    alert("This basket location already exists. Reactivate it instead if needed.");
    return;
  }
  const nextId = Math.max(0, ...baskets.map(b => Number(b.id) || 0)) + 1;
  const basket = { id: nextId, name, stock: 0, capacity, threshold, active: true, products: "Pads and tampons" };
  baskets.push(basket);
  saveInventory();
  logChange(basket, 0, "Proposed basket added");
  addBasketForm.reset();
  renderDashboard();
});

function displayInactiveBaskets() {
  const container = document.getElementById("inactive-baskets");
  container.replaceChildren();
  const inactive = baskets.filter(b => b.active === false);
  if (!inactive.length) {
    container.textContent = "No inactive baskets.";
    return;
  }
  inactive.forEach(basket => {
    const line = document.createElement("p");
    line.append(document.createTextNode(basket.name + " — "));
    line.append(makeButton("Reactivate", () => {
      basket.active = true;
      saveInventory();
      logChange(basket, 0, "Basket reactivated");
      renderDashboard();
    }));
    container.append(line);
  });
}

function renderDashboard() {
  updateDashboard();
  displayInventory();
  displayHistory();
  displayInactiveBaskets();
}

saveInventory();
renderDashboard();
