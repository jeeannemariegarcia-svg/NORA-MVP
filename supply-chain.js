/* NORA supply chain planning prototype. All figures are simulated and browser-local.
   Plans never change actual basket inventory or deduct the central reserve. */
(function () {
  const root = document.getElementById("supply-chain-dashboard");
  if (!root) return;
  const money = n => new Intl.NumberFormat("en-CA", {style:"currency",currency:"CAD"}).format(n);
  const defaults = {unitCost:0.25,reserve:250,dailyUsage:5,leadDays:3,safetyDays:2};
  const nonNegative = n => typeof n === "number" && Number.isFinite(n) && n >= 0;
  function loadSettings() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem("noraSupplySettings") || "{}") || {}; } catch {}
    const clean = {};
    Object.keys(defaults).forEach(k => {
      const n = stored[k];
      clean[k] = nonNegative(n) && (k === "unitCost" || Number.isInteger(n)) ? n : defaults[k];
    });
    return clean;
  }
  let settings = loadSettings();
  let rates = {};
  try {
    const saved = JSON.parse(localStorage.getItem("noraBasketDemandRates") || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) rates = saved;
  } catch {}
  const els = {
    count: document.getElementById("sc-baskets"),
    remaining: document.getElementById("sc-stock"),
    alerts: document.getElementById("sc-alerts"),
    refill: document.getElementById("sc-refill"),
    list: document.getElementById("sc-list"),
    plan: document.getElementById("sc-plan"),
    reserve: document.getElementById("sc-reserve-display"),
    cost: document.getElementById("sc-cost"),
    warning: document.getElementById("sc-warning"),
    allocated: document.getElementById("sc-allocated"),
    shortage: document.getElementById("sc-shortage")
  };
  function readBaskets() {
    try {
      const arr = JSON.parse(localStorage.getItem("noraBaskets") || "[]");
      return Array.isArray(arr) ? arr.filter(b => b.active !== false) : [];
    } catch { return []; }
  }
  function stockOf(b) { return Math.max(0, Number(b.stock) || 0); }
  function usageOf(b) {
    const v = rates[String(b.id)];
    return Number.isInteger(v) && v >= 0 ? v : settings.dailyUsage;
  }
  function saveRates() {
    localStorage.setItem("noraBasketDemandRates", JSON.stringify(rates));
    document.dispatchEvent(new Event("nora-planning-updated"));
  }
  ["unitCost","reserve","dailyUsage","leadDays","safetyDays"].forEach(key => {
    const input = document.getElementById("sc-" + key);
    input.value = settings[key];
    input.addEventListener("change", () => {
      const raw = input.value.trim();
      const n = Number(raw);
      if (raw === "" || !nonNegative(n) || (key !== "unitCost" && !Number.isInteger(n))) {
        input.value = settings[key];
        alert("Enter a valid non-negative " + (key === "unitCost" ? "cost" : "whole number") + ".");
        return;
      }
      settings[key] = n;
      localStorage.setItem("noraSupplySettings", JSON.stringify(settings));
      document.dispatchEvent(new Event("nora-planning-updated"));
      render();
    });
  });
  function element(tag, value, cls) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (cls) node.className = cls;
    return node;
  }
  function render() {
    const baskets = readBaskets();
    const total = baskets.reduce((sum,b) => sum + stockOf(b),0);
    const pads = baskets.reduce((sum,b) => sum + (Number(b.pads) || 0),0);
    const tampons = baskets.reduce((sum,b) => sum + (Number(b.tampons) || 0),0);
    const rows = baskets.map(b => {
      const stock = stockOf(b);
      const capacity = Math.max(0,Number(b.capacity)||0);
      const threshold = Math.max(0,Number(b.threshold ?? 10)||0);
      const usage = usageOf(b);
      // Cover supplier lead time plus safety days, respecting the basket threshold
      // and physical capacity. With zero demand, only a threshold alert can trigger.
      const target = Math.min(capacity,Math.max(threshold+1,Math.ceil(usage*(settings.leadDays+settings.safetyDays))));
      const trigger = stock <= threshold || (usage > 0 && stock < Math.ceil(usage*(settings.leadDays+settings.safetyDays)));
      const requested = trigger ? Math.max(0,target-stock) : 0;
      const days = usage > 0 ? stock/usage : Infinity;
      return {b,stock,capacity,threshold,usage,target,requested,trigger,days,allocated:0};
    });
    // Prioritize stockouts first; then fewest days of estimated supply remaining.
    // No single basket can receive more than its proposed target or capacity.
    const ranked = [...rows].sort((a,b) => {
      if (a.stock === 0 && b.stock !== 0) return -1;
      if (b.stock === 0 && a.stock !== 0) return 1;
      return a.days - b.days || a.stock - b.stock || String(a.b.name).localeCompare(String(b.b.name));
    });
    let reserveRemaining = settings.reserve;
    ranked.forEach(row => {
      row.allocated = Math.min(row.requested,reserveRemaining);
      reserveRemaining -= row.allocated;
    });
    const requestedTotal = rows.reduce((n,r) => n+r.requested,0);
    const allocatedTotal = rows.reduce((n,r) => n+r.allocated,0);
    const shortage = requestedTotal - allocatedTotal;
    const alerts = rows.filter(r=>r.stock<=r.threshold);
    const reserveReorderPoint = rows.reduce((sum,row) => sum + row.usage,0) * (settings.leadDays+settings.safetyDays);
    els.count.textContent = String(rows.length);
    els.remaining.textContent = total+" (Pads: "+pads+" · Tampons: "+tampons+")";
    els.alerts.textContent = String(alerts.length);
    els.refill.textContent = money(allocatedTotal*settings.unitCost);
    els.reserve.textContent = settings.reserve+" units (simulated planning input)";
    els.cost.textContent = money(allocatedTotal*settings.unitCost);
    els.allocated.textContent = allocatedTotal+" / "+requestedTotal+" units";
    els.shortage.textContent = shortage+" units";
    const reorderAlert = settings.reserve <= reserveReorderPoint
      ? "Reserve reorder alert: stock is at or below the estimated reorder point ("+reserveReorderPoint+" units). "
      : "Reserve reorder point: "+reserveReorderPoint+" units. ";
    els.warning.textContent = reorderAlert+(shortage>0?"Current reserve cannot cover the full recommended refill plan.":"Current reserve covers the proposed refill plan.");
    els.list.replaceChildren();
    els.plan.replaceChildren();
    if (!rows.length) {
      const emptyInventory = document.createElement("tr");
      const emptyInventoryCell = document.createElement("td");
      emptyInventoryCell.colSpan = 8;
      emptyInventoryCell.textContent = "No active baskets. Add a proposed basket in Basket Management.";
      emptyInventory.append(emptyInventoryCell);
      els.list.append(emptyInventory);
      const emptyPlan = document.createElement("tr");
      const emptyPlanCell = document.createElement("td");
      emptyPlanCell.colSpan = 8;
      emptyPlanCell.textContent = "No refill plan available.";
      emptyPlan.append(emptyPlanCell);
      els.plan.append(emptyPlan);
      return;
    }
    const cell = (tr, value, className) => {
      const td = document.createElement("td");
      if (className) td.className = className;
      if (value instanceof Node) td.append(value);
      else td.textContent = value;
      tr.append(td);
      return td;
    };
    rows.forEach(row => {
      const {b,stock,capacity,threshold,usage,days} = row;
      const tr = document.createElement("tr");
      cell(tr,b.name,"sc-location");
      const qty = document.createElement("span");
      qty.textContent = stock+" / "+capacity;
      const qtyCell = cell(tr,qty,"sc-number");
      if (b.categorySplitEstimated) {
        const note = document.createElement("small");
        note.className = "sc-note";
        note.textContent = "Category split estimated";
        qtyCell.append(note);
      }
      cell(tr,String(b.pads ?? 0),"sc-number");
      cell(tr,String(b.tampons ?? 0),"sc-number");
      cell(tr,String(threshold),"sc-number");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0"; input.step = "1";
      input.value = String(usage);
      input.className = "sc-demand-input";
      input.setAttribute("aria-label","Estimated daily demand for "+b.name);
      input.addEventListener("change", () => {
        const raw = input.value.trim(), n = Number(raw);
        if(raw === "" || !Number.isInteger(n) || n < 0) {
          alert("Enter a non-negative whole number for daily demand.");
          input.value = String(usage); return;
        }
        rates[String(b.id)] = n;
        saveRates();
        render();
      });
      cell(tr,input,"sc-number");
      cell(tr,usage > 0 ? days.toFixed(1) : "—","sc-number");
      const indicator = document.createElement("span");
      indicator.className = stock === 0 ? "sc-pill sc-empty" : stock <= threshold ? "sc-pill sc-low" : "sc-pill sc-ok";
      indicator.textContent = stock === 0 ? "Empty" : stock <= threshold ? "Low" : "Available";
      cell(tr,indicator);
      els.list.append(tr);
    });
    ranked.forEach((row,index) => {
      const {b,stock,requested,allocated,target} = row;
      const tr = document.createElement("tr");
      cell(tr,String(index+1),"sc-number");
      cell(tr,b.name,"sc-location");
      cell(tr,String(stock),"sc-number");
      cell(tr,String(target),"sc-number");
      cell(tr,String(requested),"sc-number");
      cell(tr,String(allocated),"sc-number");
      const status = allocated < requested ? "Shortage" : requested === 0 ? "No refill" : "Planned";
      const indicator = document.createElement("span");
      indicator.className = allocated < requested ? "sc-pill sc-empty" : requested === 0 ? "sc-pill sc-neutral" : "sc-pill sc-ok";
      indicator.textContent = status;
      cell(tr,indicator);
      cell(tr,money(allocated * settings.unitCost),"sc-number");
      els.plan.append(tr);
    });
  }
  document.getElementById("sc-refresh").addEventListener("click",render);
  window.addEventListener("storage",e => {if(["noraBaskets","noraSupplySettings","noraBasketDemandRates"].includes(e.key)){settings=loadSettings();render();}});
  document.addEventListener("nora-inventory-updated",render);
  // A basket restock updates central reserve in another module in this tab.
  // Reload the shared setting instead of displaying a stale cached quantity.
  document.addEventListener("nora-planning-updated", () => {
    settings = loadSettings();
    ["unitCost","reserve","dailyUsage","leadDays","safetyDays"].forEach(key => {
      const field = document.getElementById("sc-" + key);
      if (field && document.activeElement !== field) field.value = settings[key];
    });
    render();
  });
  render();
})();
