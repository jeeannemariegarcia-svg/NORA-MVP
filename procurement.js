/* NORA simulated procurement model — local scenario values only.
   No orders, payments or real inventory movements take place. */
(function () {
  const root = document.getElementById("procurement-dashboard");
  if (!root) return;
  const money = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(n);
  const defaultSuppliers = [
    {id:"scenario-a",name:"Supplier Scenario A",unitCost:0.25,leadDays:3,moq:25,deliveryFee:8},
    {id:"scenario-b",name:"Supplier Scenario B",unitCost:0.20,leadDays:7,moq:100,deliveryFee:15}
  ];
  function read(key, fallback) {
    try { const parsed=JSON.parse(localStorage.getItem(key)); return parsed ?? fallback; }
    catch { return fallback; }
  }
  function validSupplier(s) {
    return s && typeof s.name==="string" && s.name.trim().length>0 &&
      [s.unitCost,s.deliveryFee].every(n=>typeof n==="number" && Number.isFinite(n) && n>=0) &&
      Number.isInteger(s.leadDays) && s.leadDays>=0 &&
      Number.isInteger(s.moq) && s.moq>=1;
  }
  const savedSuppliers=read("noraProcurementSuppliers",null);
  const suppliers=defaultSuppliers.map(defaultValue=>{
    const stored=Array.isArray(savedSuppliers)?savedSuppliers.find(s=>s.id===defaultValue.id):null;
    return stored && validSupplier(stored) ? {...defaultValue,...stored} : {...defaultValue};
  });
  const inputShare=document.getElementById("pr-pad-share");
  const savedShare=read("noraProcurementPadShare",50);
  let padShare=Number.isInteger(savedShare) && savedShare>=0 && savedShare<=100 ? savedShare : 50;
  inputShare.value=String(padShare);
  const select=document.getElementById("pr-selected-supplier");
  const savedSelection=read("noraProcurementSelectedSupplier","scenario-a");
  let selectedSupplier=suppliers.some(s=>s.id===savedSelection)?savedSelection:"scenario-a";
  const table=document.getElementById("pr-suppliers");
  const plan=document.getElementById("pr-recommendations");
  const element=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  const td=(tr,child)=>{
    const cell=document.createElement("td");
    if(child instanceof Node) cell.append(child); else cell.textContent=String(child);
    tr.append(cell);
    return cell;
  };
  const numberField=(value,step,aria)=>{
    const input=document.createElement("input");
    input.type="number"; input.min="0"; input.step=String(step); input.value=String(value);
    input.className="pr-table-input";input.setAttribute("aria-label",aria);
    return input;
  };
  function renderSuppliers() {
    select.replaceChildren();
    table.replaceChildren();
    suppliers.forEach(supplier=>{
      const opt=document.createElement("option");
      opt.value=supplier.id;opt.textContent=supplier.name;select.append(opt);
      const row=document.createElement("tr");
      const name=document.createElement("input");
      name.type="text";name.maxLength=80;name.className="pr-name-input";
      name.value=supplier.name;name.setAttribute("aria-label","Supplier scenario name for "+supplier.id);
      const cost=numberField(supplier.unitCost,"0.01","Unit cost for "+supplier.name);
      const lead=numberField(supplier.leadDays,1,"Lead time days for "+supplier.name);
      const moq=numberField(supplier.moq,1,"Minimum order units for "+supplier.name);
      moq.min="1";
      const shipping=numberField(supplier.deliveryFee,"0.01","Delivery fee for "+supplier.name);
      td(row,name);td(row,cost);td(row,lead);td(row,moq);td(row,shipping);
      const button=element("button","Save Quote");
      button.type="button";button.className="button pr-small-btn";
      button.addEventListener("click",()=>{
        const n=Number(cost.value),l=Number(lead.value),m=Number(moq.value),d=Number(shipping.value);
        if(!name.value.trim() || !cost.value.trim() || !lead.value.trim() || !moq.value.trim() || !shipping.value.trim() ||
           ![n,d].every(x=>Number.isFinite(x)&&x>=0) ||
           !Number.isInteger(l) || l<0 || !Number.isInteger(m) || m<1) {
          alert("Enter a supplier name, non-negative costs, a whole-number lead time, and a minimum order of at least one.");
          return;
        }
        Object.assign(supplier,{name:name.value.trim(),unitCost:n,leadDays:l,moq:m,deliveryFee:d});
        localStorage.setItem("noraProcurementSuppliers",JSON.stringify(suppliers));
        renderSuppliers();render();
      });
      td(row,button);table.append(row);
    });
    select.value=selectedSupplier;
  }
  function readActiveBaskets() {
    const arr=read("noraBaskets",[]);
    return Array.isArray(arr)?arr.filter(b=>b.active!==false):[];
  }
  function readDemand() {
    const obj=read("noraBasketDemandRates",{});
    return obj && typeof obj==="object" && !Array.isArray(obj)?obj:{};
  }
  function readSupply() {
    const obj=read("noraSupplySettings",{});
    const clean=(n,f)=>typeof n==="number"&&Number.isFinite(n)&&n>=0?n:f;
    return {reserve:Math.floor(clean(obj?.reserve,250)),dailyUsage:Math.floor(clean(obj?.dailyUsage,5)),
      safetyDays:Math.floor(clean(obj?.safetyDays,2))};
  }
  let lastPlan="";
  function render() {
    const supplier=suppliers.find(s=>s.id===selectedSupplier) || suppliers[0];
    const supply=readSupply();
    const rates=readDemand();
    const baskets=readActiveBaskets();
    const horizon=supplier.leadDays+supply.safetyDays;
    let refillNeed=0, dailyTotal=0;
    baskets.forEach(b=>{
      const stock=Math.max(0,Number(b.stock)||0);
      const capacity=Math.max(0,Number(b.capacity)||0);
      const threshold=Math.max(0,Number(b.threshold ?? 10)||0);
      const storedRate=rates[String(b.id)];
      const demand=Number.isInteger(storedRate)&&storedRate>=0?storedRate:supply.dailyUsage;
      dailyTotal+=demand;
      const coverage=Math.ceil(demand*horizon);
      const target=Math.min(capacity,Math.max(threshold+1,coverage));
      const triggered=stock<=threshold || (demand>0 && stock<coverage);
      if(triggered) refillNeed+=Math.max(0,target-stock);
    });
    // Planning approximation: cover the currently indicated refill need and
    // an additional supplier-lead-time + safety-days reserve at the warehouse.
    // This may double count near-term use; it is not a forecast of actual orders.
    const targetReserve=dailyTotal*horizon;
    const suggested=Math.max(0,refillNeed+targetReserve-supply.reserve);
    const pads=Math.round(suggested*padShare/100);
    const tampons=suggested-pads;
    const roundMOQ=n=>n===0?0:Math.ceil(n/supplier.moq)*supplier.moq;
    const orderPads=roundMOQ(pads),orderTampons=roundMOQ(tampons);
    const subtotal=(orderPads+orderTampons)*supplier.unitCost;
    const delivery=orderPads+orderTampons>0?supplier.deliveryFee:0;
    plan.replaceChildren();
    [["Pads",pads,orderPads],["Tampons",tampons,orderTampons]].forEach(([name,required,ordered])=>{
      const row=document.createElement("tr");
      td(row,name);td(row,required);td(row,ordered);
      td(row,money(supplier.unitCost));td(row,money(ordered*supplier.unitCost));
      plan.append(row);
    });
    document.getElementById("pr-purchase-total").textContent=(orderPads+orderTampons)+" units";
    document.getElementById("pr-subtotal").textContent=money(subtotal);
    document.getElementById("pr-delivery").textContent=money(delivery);
    document.getElementById("pr-grand-total").textContent=money(subtotal+delivery);
    document.getElementById("pr-rationale").textContent=
      "Scenario: "+baskets.length+" active baskets · "+dailyTotal+" estimated units/day · "+
      horizon+" days supplier lead + safety coverage · "+
      refillNeed+" units flagged for basket refill · "+supply.reserve+
      " central reserve units assumed. Suggested net requirement: "+suggested+
      " units before minimum order rounding. This planning approximation may double-count near-term demand.";
    lastPlan=[
      "NORA — Simulated Procurement Plan",
      "Supplier scenario: "+supplier.name,
      "Lead time: "+supplier.leadDays+" days; MOQ: "+supplier.moq+" per product type",
      "Estimated demand: "+dailyTotal+" units/day",
      "Current combined reserve (assumed): "+supply.reserve+" units",
      "Target refill requirement: "+refillNeed+" units",
      "Suggested net purchase: "+suggested+" units",
      "Pads: "+orderPads+" units; Tampons: "+orderTampons+" units",
      "Product subtotal: "+money(subtotal),
      "Delivery fee: "+money(delivery),
      "Estimated total: "+money(subtotal+delivery),
      "Prototype only; no order placed. Verify demand, actual stock and supplier quotes."
    ].join("\n");
  }
  select.addEventListener("change",()=>{
    selectedSupplier=select.value;
    localStorage.setItem("noraProcurementSelectedSupplier",JSON.stringify(selectedSupplier));
    render();
  });
  inputShare.addEventListener("change",()=>{
    const raw=inputShare.value.trim(),value=Number(raw);
    if(raw===""||!Number.isInteger(value)||value<0||value>100){
      alert("Enter a whole-number pad share from 0 to 100.");
      inputShare.value=String(padShare);return;
    }
    padShare=value;
    localStorage.setItem("noraProcurementPadShare",JSON.stringify(value));
    render();
  });
  document.getElementById("pr-copy-plan").addEventListener("click",async()=>{
    try { await navigator.clipboard.writeText(lastPlan); }
    catch { window.prompt("Copy this simulated plan:",lastPlan); }
  });
  document.addEventListener("nora-inventory-updated",render);
  document.addEventListener("nora-planning-updated",render);
  document.addEventListener("nora-procurement-refresh",render);
  window.addEventListener("storage",event=>{
    if(["noraBaskets","noraBasketDemandRates","noraSupplySettings"].includes(event.key))render();
  });
  renderSuppliers();render();
})();
