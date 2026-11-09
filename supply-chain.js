/* NORA supply chain planning prototype — local simulated values only. */
(function () {
  const root = document.getElementById("supply-chain-dashboard");
  if (!root) return;
  const money = amount => new Intl.NumberFormat("en-CA", {style:"currency",currency:"CAD"}).format(amount);
  const defaults = {unitCost:0.25, reserve:250, dailyUsage:5, leadDays:3, safetyDays:2};
  let settings;
  try { settings = {...defaults, ...JSON.parse(localStorage.getItem("noraSupplySettings") || "{}")}; }
  catch { settings = {...defaults}; }
  const readBaskets = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem("noraBaskets") || "[]");
      return Array.isArray(parsed) ? parsed.filter(b => b.active !== false) : [];
    } catch { return []; }
  };
  const els = {
    count: document.getElementById("sc-baskets"),
    remaining: document.getElementById("sc-stock"),
    alerts: document.getElementById("sc-alerts"),
    refill: document.getElementById("sc-refill"),
    list: document.getElementById("sc-list"),
    plan: document.getElementById("sc-plan"),
    reserve: document.getElementById("sc-reserve-display"),
    cost: document.getElementById("sc-cost"),
    warning: document.getElementById("sc-warning")
  };
  const settingKeys = ["unitCost","reserve","dailyUsage","leadDays","safetyDays"];
  settingKeys.forEach(key => {
    const field = document.getElementById("sc-" + key);
    field.value = settings[key];
    field.addEventListener("change", () => {
      const n = Number(field.value);
      if (!Number.isFinite(n) || n < 0 || (key !== "unitCost" && !Number.isInteger(n))) {
        field.value = settings[key];
        alert("Enter a valid non-negative " + (key === "unitCost" ? "cost" : "whole number") + ".");
        return;
      }
      settings[key] = n;
      localStorage.setItem("noraSupplySettings", JSON.stringify(settings));
      render();
    });
  });
  function line(container, title, description, quantity, urgent) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "10px";
    const h = document.createElement("h4");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = description;
    const tag = document.createElement("strong");
    tag.textContent = quantity;
    tag.className = urgent ? "status-low" : "status-available";
    card.append(h,p,tag);
    container.append(card);
  }
  function render() {
    const baskets = readBaskets();
    const total = baskets.reduce((sum,b) => sum + Math.max(0,Number(b.stock)||0),0);
    const alerts = baskets.filter(b => Number(b.stock)<=Number(b.threshold ?? 10));
    const refill = baskets.reduce((sum,b) => sum + Math.max(0,(Number(b.capacity)||0)-(Number(b.stock)||0)),0);
    const reorderPoint = settings.dailyUsage * (settings.leadDays + settings.safetyDays);
    const reorder = settings.reserve <= reorderPoint;
    els.count.textContent = String(baskets.length);
    els.remaining.textContent = String(total);
    els.alerts.textContent = String(alerts.length);
    els.refill.textContent = money(refill*settings.unitCost);
    els.reserve.textContent = settings.reserve + " units";
    els.cost.textContent = money(refill * settings.unitCost);
    els.warning.textContent = reorder
      ? "Reserve reorder alert: available stock is at or below the planning reorder point (" + reorderPoint + " units)."
      : "Reserve reorder point: " + reorderPoint + " units. Current reserve is above this estimate.";
    els.list.replaceChildren();
    els.plan.replaceChildren();
    if (!baskets.length) {
      els.list.textContent = "No active baskets. Add a proposed basket in Basket Management.";
      els.plan.textContent = "No refill plan available.";
      return;
    }
    baskets.forEach(b => {
      const stock = Math.max(0,Number(b.stock)||0);
      const capacity = Math.max(0,Number(b.capacity)||0);
      const threshold = Math.max(0,Number(b.threshold ?? 10)||0);
      const needed = Math.max(0,capacity-stock);
      const priority = stock===0?"Out of stock":stock<=threshold?"Low stock":"Routine";
      line(els.list,b.name,stock+" / "+capacity+" products · Alert threshold "+threshold,priority,priority!=="Routine");
      line(els.plan,b.name,"Refill to full capacity: "+needed+" units · estimated product cost "+money(needed*settings.unitCost),needed>0?"Plan "+needed+" units":"Already full",priority!=="Routine");
    });
  }
  document.getElementById("sc-refresh").addEventListener("click",render);
  window.addEventListener("storage", e => {
    if (e.key === "noraBaskets") render();
  });
  document.addEventListener("nora-inventory-updated",render);
  render();
})();
