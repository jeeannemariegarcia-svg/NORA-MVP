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
  // Existing records only tracked total units. Preserve their total and mark the
  // initial category allocation as an estimate until an admin verifies the split.
  const validSplit = Number.isInteger(basket.pads) && basket.pads >= 0 &&
    Number.isInteger(basket.tampons) && basket.tampons >= 0 &&
    basket.pads + basket.tampons === basket.stock;
  if (!validSplit) {
    basket.pads = Math.floor(Math.max(0, Number(basket.stock) || 0) / 2);
    basket.tampons = Math.max(0, Number(basket.stock) || 0) - basket.pads;
    basket.categorySplitEstimated = true;
  }
});
const activeBaskets = () => baskets.filter(basket => basket.active !== false);
const restockHistory = readStoredArray("noraRestockHistory", []);
const inventoryContainer = document.getElementById("admin-inventory");
const historyContainer = document.getElementById("restock-history");
const placementMap = L.map("admin-location-map").setView([51.064, -114.089], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
}).addTo(placementMap);
let selectedCoordinates = null;
let selectionMarker = null;
let movingBasket = null;
const basketList = document.getElementById("basket-location-list");
const editorTitle = document.getElementById("basket-editor-title");
const editorHint = document.getElementById("basket-editor-hint");
const addFormToggle = document.getElementById("toggle-add-basket");
const addFormCancel = document.getElementById("cancel-add-basket");
let selectedBasketId = activeBaskets()[0]?.id ?? null;
const basketPins = new Map();
const defaultCoordinates = {
  1: [51.064, -114.089],
  2: [51.0645, -114.0875]
};
function coordinatesFor(basket) {
  const coords = basket.coordinates ?? defaultCoordinates[basket.id];
  return Array.isArray(coords) && coords.length === 2 &&
    coords.every(n => typeof n === "number" && Number.isFinite(n)) ? coords : null;
}
function selectBasket(basket, pan = true) {
  selectedBasketId = basket.id;
  displayInventory();
  renderBasketList();
  updateBasketPins();
  const coords = coordinatesFor(basket);
  if (pan && coords) placementMap.setView(coords, Math.max(placementMap.getZoom(), 17));
}
function updateBasketPins() {
  basketPins.forEach(pin => placementMap.removeLayer(pin));
  basketPins.clear();
  activeBaskets().forEach(basket => {
    const coords = coordinatesFor(basket);
    if (!coords) return;
    const pin = L.circleMarker(coords, {
      radius: basket.id === selectedBasketId ? 12 : 9,
      color: basket.id === selectedBasketId ? "#302046" : "#fff",
      weight: basket.id === selectedBasketId ? 3 : 2,
      fillColor: basket.stock === 0 ? "#cf4356" : basket.stock <= basket.threshold ? "#e3a238" : "#7651aa",
      fillOpacity: 1
    }).addTo(placementMap);
    pin.bindTooltip(basket.name);
    pin.on("click", e => {
      L.DomEvent.stopPropagation(e);
      selectBasket(basket);
    });
    basketPins.set(basket.id, pin);
  });
}
function renderBasketList() {
  basketList.replaceChildren();
  document.getElementById("basket-active-count").textContent = activeBaskets().length + " active";
  activeBaskets().forEach(basket => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "bm-list-item" + (basket.id === selectedBasketId ? " is-selected" : "");
    item.setAttribute("aria-pressed", String(basket.id === selectedBasketId));
    const name = document.createElement("strong");
    name.textContent = basket.name;
    const summary = document.createElement("span");
    summary.textContent = basket.stock + " / " + basket.capacity + " units · " + getStatus(basket);
    item.append(name, summary);
    item.addEventListener("click", () => selectBasket(basket));
    basketList.append(item);
  });
  if (!activeBaskets().length) basketList.textContent = "No active baskets.";
}
function setAddFormVisible(visible) {
  addBasketForm.hidden = !visible;
  addFormToggle.setAttribute("aria-expanded", String(visible));
  addFormToggle.textContent = visible ? "Close Add Basket" : "+ Add Proposed Basket";
  if (visible) {
    endMove();
    addBasketForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else {
    addBasketForm.reset();
    if (selectionMarker) placementMap.removeLayer(selectionMarker);
    selectionMarker = null;
    selectedCoordinates = null;
    selectionLabel.textContent = "Select a basket or open Add Proposed Basket to choose a map position.";
  }
}
addFormToggle.addEventListener("click", () => setAddFormVisible(addBasketForm.hidden));
addFormCancel.addEventListener("click", () => setAddFormVisible(false));
const cancelMoveButton = document.getElementById("cancel-map-move");
const selectionLabel = document.getElementById("selected-map-location");
placementMap.on("click", event => {
  if (!movingBasket && addBasketForm.hidden) return;
  selectedCoordinates = [event.latlng.lat, event.latlng.lng];
  if (selectionMarker) placementMap.removeLayer(selectionMarker);
  selectionMarker = L.marker(selectedCoordinates).addTo(placementMap);
  selectionLabel.textContent = (movingBasket ? "New position for " + movingBasket.name : "Selected proposed position") + ": " + selectedCoordinates.map(n => n.toFixed(6)).join(", ");
});
setTimeout(() => placementMap.invalidateSize(), 300);
document.addEventListener("nora-map-visible", () => {
  setTimeout(() => placementMap.invalidateSize(), 0);
});


function saveInventory() {
  localStorage.setItem("noraBaskets", JSON.stringify(baskets));
  document.dispatchEvent(new Event("nora-inventory-updated"));
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

function changeProducts(basket, pads, tampons, action) {
  if (!Number.isInteger(pads) || !Number.isInteger(tampons) ||
      pads < 0 || tampons < 0 || pads + tampons > basket.capacity) {
    alert("Pads and tampons must be non-negative whole numbers within basket capacity (" + basket.capacity + ").");
    return;
  }
  const nextStock = pads + tampons;
  if (basket.pads === pads && basket.tampons === tampons && !basket.categorySplitEstimated) return;
  const change = nextStock - basket.stock;
  basket.pads = pads;
  basket.tampons = tampons;
  basket.stock = nextStock;
  basket.categorySplitEstimated = false;
  saveInventory();
  logChange(basket, change, action);
  renderDashboard();
}

// Simulated transfer from category-specific central reserve; no products created.
function simulateReserveRestock(basket) {
  const needed=Math.max(0,basket.capacity-basket.stock);
  if(!needed){alert("This basket is already full.");return;}
  const reserve=window.NoraReserve.read();
  const available=reserve.reservePads+reserve.reserveTampons;
  if(!available){alert("Central reserve is empty. No products were transferred.");return;}
  const transferred=Math.min(needed,available);
  // Illustrative balanced mix, constrained by actual per-category reserve counts.
  let addPads=Math.min(reserve.reservePads,Math.ceil(transferred/2));
  let addTampons=Math.min(reserve.reserveTampons,transferred-addPads);
  let remaining=transferred-addPads-addTampons;
  if(remaining){const extraPads=Math.min(remaining,reserve.reservePads-addPads);addPads+=extraPads;remaining-=extraPads;}
  if(remaining){addTampons+=Math.min(remaining,reserve.reserveTampons-addTampons);}
  const moved=addPads+addTampons;
  if(moved!==transferred){alert("Unable to allocate simulated reserve by product type.");return;}
  const nextBaskets=baskets.map(b=>b.id===basket.id?
    {...b,pads:b.pads+addPads,tampons:b.tampons+addTampons,
      stock:b.stock+moved,categorySplitEstimated:Boolean(b.categorySplitEstimated||reserve.reserveMixEstimated)}:b);
  const settingsBefore=localStorage.getItem("noraSupplySettings");
  const basketsBefore=localStorage.getItem("noraBaskets");
  try {
    // Both values are stored in the same browser, but localStorage is not transactional.
    localStorage.setItem("noraBaskets",JSON.stringify(nextBaskets));
    window.NoraReserve.write(reserve.reservePads-addPads,reserve.reserveTampons-addTampons,reserve.reserveMixEstimated);
  }catch(error){
    try {
      if(basketsBefore===null)localStorage.removeItem("noraBaskets");
      else localStorage.setItem("noraBaskets",basketsBefore);
      if(settingsBefore===null)localStorage.removeItem("noraSupplySettings");
      else localStorage.setItem("noraSupplySettings",settingsBefore);
    }catch{}
    alert("Could not save simulated transfer. Please check stored inventory.");
    return;
  }
  basket.pads+=addPads;
  basket.tampons+=addTampons;
  basket.stock+=moved;
  basket.categorySplitEstimated=Boolean(basket.categorySplitEstimated||reserve.reserveMixEstimated);
  logChange(basket,moved,
    "Simulated reserve transfer: "+addPads+" pads + "+addTampons+" tampons; "+
    "reserve "+available+" → "+(available-moved)+" units"+
    (reserve.reserveMixEstimated?" (reserve category split estimated)":""));
  document.dispatchEvent(new Event("nora-inventory-updated"));
  renderDashboard();
  if(moved<needed)alert("Partial restock: "+moved+" of "+needed+
    " units transferred. Central reserve is empty.");
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
    if (basket.id !== selectedBasketId) return;
    card.className = "card nora-basket-card";

    const heading = document.createElement("h3");
    heading.textContent = basket.name;

    const cardTop = document.createElement("div");
    cardTop.className = "basket-top";
    const headingWrap = document.createElement("div");
    headingWrap.append(heading);

    const quantity = document.createElement("p");
    quantity.textContent = `Estimated Stock: ${basket.stock} / ${basket.capacity} (Pads: ${basket.pads}, Tampons: ${basket.tampons})`; 
    quantity.className = "basket-quantity";
    headingWrap.append(quantity);
    if (basket.categorySplitEstimated) {
      const note = document.createElement("p");
      note.textContent = "Category breakdown is estimated from older total-only data. Verify pads and tampons before relying on these values.";
      note.className = "status-low";
      card.append(note);
    }

    const status = document.createElement("p");
    status.textContent = getStatus(basket);
    status.className = "basket-status " + (basket.stock === 0 ? "basket-empty" : basket.stock <= basket.threshold ? "basket-low" : "basket-ok");
    cardTop.append(headingWrap, status);

    const reserveInfo = document.createElement("p");
    const reserveNow = window.NoraReserve.read();
    reserveInfo.className = "basket-quantity";
    reserveInfo.textContent = "Central reserve available: " +
      reserveNow.reservePads + " pads · " + reserveNow.reserveTampons +
      " tampons (" + reserveNow.reserve + " total)" +
      (reserveNow.reserveMixEstimated ? " — estimated category split" : "");
    const restockButton = makeButton("Restock from Reserve", () => {
      simulateReserveRestock(basket);
    });

    const lowStockButton = makeButton("Simulate Low Stock", () => {
      const low = Math.min(8, basket.capacity);
      changeProducts(basket, Math.ceil(low / 2), Math.floor(low / 2), "Simulated low stock");
    });

    const controls = document.createElement("div");
    controls.className = "basket-simulation-actions";
    restockButton.className = "button basket-btn basket-btn-neutral";
    lowStockButton.className = "button basket-btn basket-btn-neutral";
    controls.append(restockButton, lowStockButton);

    const adjustmentLabel = document.createElement("p");
    adjustmentLabel.textContent = "Set estimated inventory by product type:";
    adjustmentLabel.className = "basket-section-heading";
    const padsLabel = document.createElement("label");
    padsLabel.textContent = "Pads ";
    const padsInput = document.createElement("input");
    padsInput.type = "number";
    padsInput.min = "0";
    padsInput.step = "1";
    padsInput.value = String(basket.pads);
    padsInput.className = "basket-number-input";
    padsInput.setAttribute("aria-label", "Pads for " + basket.name);
    padsLabel.append(padsInput);
    const tamponsLabel = document.createElement("label");
    tamponsLabel.textContent = " Tampons ";
    const tamponsInput = document.createElement("input");
    tamponsInput.type = "number";
    tamponsInput.min = "0";
    tamponsInput.step = "1";
    tamponsInput.value = String(basket.tampons);
    tamponsInput.className = "basket-number-input";
    tamponsInput.setAttribute("aria-label", "Tampons for " + basket.name);
    tamponsLabel.append(tamponsInput);
    const saveButton = makeButton("Save Product Quantities", () => {
      if (!padsInput.value.trim() || !tamponsInput.value.trim()) {
        alert("Please enter both product quantities.");
        return;
      }
      changeProducts(basket, Number(padsInput.value), Number(tamponsInput.value), "Product quantities updated");
    });
    const adjustmentRow = document.createElement("div");
    adjustmentRow.className = "basket-input-row";
    saveButton.className = "button basket-btn basket-btn-primary";
    adjustmentRow.append(padsLabel, tamponsLabel, saveButton);

    const settings = document.createElement("div");
    settings.className = "basket-settings";
    const settingsHeading = document.createElement("h4");
    settingsHeading.textContent = "Basket settings";
    const capacityLabel = document.createElement("label");
    capacityLabel.textContent = "Capacity ";
    const capacityInput = document.createElement("input");
    capacityInput.type = "number";
    capacityInput.min = "1";
    capacityInput.step = "1";
    capacityInput.value = basket.capacity;
    capacityInput.className = "basket-number-input";
    capacityInput.setAttribute("aria-label", "Capacity for " + basket.name);
    capacityLabel.append(capacityInput);
    const thresholdLabel = document.createElement("label");
    thresholdLabel.textContent = " Low-stock alert at ";
    const thresholdInput = document.createElement("input");
    thresholdInput.type = "number";
    thresholdInput.min = "0";
    thresholdInput.step = "1";
    thresholdInput.value = basket.threshold;
    thresholdInput.className = "basket-number-input";
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
      if (selectedBasketId === basket.id) selectedBasketId = activeBaskets()[0]?.id ?? null;
      saveInventory();
      logChange(basket, 0, "Basket deactivated");
      renderDashboard();
    });
    const moveButton = makeButton("Move Map Pin", () => {
      if (window.NoraAdminTabs) window.NoraAdminTabs.show("basket-management");
      setAddFormVisible(false);
      movingBasket = basket;
      selectedCoordinates = null;
      if (selectionMarker) placementMap.removeLayer(selectionMarker);
      selectionMarker = null;
      const current = Array.isArray(basket.coordinates) ? basket.coordinates : null;
      if (current) placementMap.setView(current, 18);
      selectionLabel.textContent = "Moving " + basket.name + ": click a new position on the map, then Save Pin Position.";
      document.getElementById("save-map-move").hidden = false;
      document.getElementById("cancel-map-move").hidden = false;
      placementMap.invalidateSize();
      placementMap.getContainer().scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const settingsInputs = document.createElement("div");
    settingsInputs.className = "basket-settings-inputs";
    settingsInputs.append(capacityLabel, thresholdLabel);

    const actionRow = document.createElement("div");
    actionRow.className = "basket-footer-actions";
    saveSettings.className = "button basket-btn basket-btn-neutral";
    moveButton.className = "button basket-btn basket-btn-outline";
    deactivateButton.className = "button basket-btn basket-btn-danger";
    actionRow.append(saveSettings, moveButton, deactivateButton);
    settings.append(settingsHeading, settingsInputs, actionRow);
    card.append(cardTop, reserveInfo, controls, adjustmentLabel, adjustmentRow, settings);
    inventoryContainer.appendChild(card);
  });
  const selected = activeBaskets().find(b => b.id === selectedBasketId);
  editorTitle.textContent = selected ? "Editing: " + selected.name : "Selected Basket";
  editorHint.hidden = Boolean(selected);
  if (!selected) editorHint.textContent = "Select a basket from the map or list to edit it.";
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

function endMove() {
  movingBasket = null;
  selectedCoordinates = null;
  if (selectionMarker) placementMap.removeLayer(selectionMarker);
  selectionMarker = null;
  document.getElementById("save-map-move").hidden = true;
  document.getElementById("cancel-map-move").hidden = true;
  selectionLabel.textContent = "Select a basket or open Add Proposed Basket to choose a map position.";
}
document.getElementById("cancel-map-move").addEventListener("click", endMove);
document.getElementById("save-map-move").addEventListener("click", () => {
  if (!movingBasket || !selectedCoordinates) {
    alert("Click a new map position before saving.");
    return;
  }
  movingBasket.coordinates = [...selectedCoordinates];
  saveInventory();
  logChange(movingBasket, 0, "Map pin moved");
  endMove();
  renderDashboard();
});
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
  if (movingBasket) {
    alert("Finish or cancel moving the existing pin before adding a basket.");
    return;
  }
  if (!selectedCoordinates) {
    alert("Click the campus map to choose a proposed position first.");
    return;
  }
  const nextId = Math.max(0, ...baskets.map(b => Number(b.id) || 0)) + 1;
  const basket = { id: nextId, name, stock: 0, pads: 0, tampons: 0, categorySplitEstimated: false, capacity, threshold, active: true, products: "Pads and tampons", coordinates: [...selectedCoordinates] };
  baskets.push(basket);
  selectedBasketId = basket.id;
  saveInventory();
  logChange(basket, 0, "Proposed basket added");
  setAddFormVisible(false);
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
      selectedBasketId = basket.id;
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
  renderBasketList();
  updateBasketPins();
  displayHistory();
  displayInactiveBaskets();
}

document.addEventListener("nora-planning-updated", () => {
  // Reflect reserve edits made in Supply Chain on the selected basket card.
  displayInventory();
});
saveInventory();
renderDashboard();
