/* NORA supplier directory and procurement scenarios.
   Browser-local teaching prototype. No real supplier quotes or orders. */
(function () {
  const root=document.getElementById("procurement-dashboard");
  if (!root) return;
  const money=n=>new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(n);
  const initial=[
    {id:"scenario-a",name:"Supplier Scenario A",padCost:0.25,tamponCost:0.25,leadDays:3,moq:25,deliveryFee:8,status:"Active"},
    {id:"scenario-b",name:"Supplier Scenario B",padCost:0.20,tamponCost:0.20,leadDays:7,moq:100,deliveryFee:15,status:"Active"}
  ];
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}};
  const goodNumber=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0;
  function normalize(s,i) {
    if(!s || typeof s!=="object")return null;
    const padCost=goodNumber(s.padCost)?s.padCost:s.unitCost;
    const tamponCost=goodNumber(s.tamponCost)?s.tamponCost:s.unitCost;
    const supplier={
      id:typeof s.id==="string"&&s.id.trim()?s.id:"scenario-"+i,
      name:typeof s.name==="string"?s.name.trim():"",
      padCost,tamponCost,leadDays:s.leadDays,moq:s.moq,
      deliveryFee:s.deliveryFee,
      status:s.status==="Under review"||s.status==="Inactive"?s.status:"Active"
    };
    return supplier.name && goodNumber(supplier.padCost) && goodNumber(supplier.tamponCost) &&
      Number.isInteger(supplier.leadDays) && supplier.leadDays>=0 &&
      Number.isInteger(supplier.moq) && supplier.moq>=1 && goodNumber(supplier.deliveryFee) ? supplier:null;
  }
  const saved=read("noraProcurementSuppliers",null);
  let suppliers=Array.isArray(saved)?saved.map(normalize).filter(Boolean):initial.map((s,i)=>normalize(s,i));
  if(!suppliers.length && !Array.isArray(saved))suppliers=initial.map((s,i)=>normalize(s,i));
  const persist=()=>localStorage.setItem("noraProcurementSuppliers",JSON.stringify(suppliers));
  const shareField=document.getElementById("pr-pad-share");
  let padShare=read("noraProcurementPadShare",50);
  if(!Number.isInteger(padShare)||padShare<0||padShare>100)padShare=50;
  shareField.value=String(padShare);
  const select=document.getElementById("pr-selected-supplier");
  let selectedId=read("noraProcurementSelectedSupplier","scenario-a");
  const directory=document.getElementById("pr-suppliers");
  const comparison=document.getElementById("pr-comparison");
  const recommendations=document.getElementById("pr-recommendations");
  const make=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
  const cell=(row,value)=>{
    const td=document.createElement("td");
    if(value instanceof Node)td.append(value);else td.textContent=String(value);
    row.append(td);return td;
  };
  const field=(value,step,label,min="0")=>{
    const input=document.createElement("input");
    input.type="number";input.min=min;input.step=step;input.value=String(value);
    input.className="pr-table-input";input.setAttribute("aria-label",label);
    return input;
  };
  function renderDirectory() {
    directory.replaceChildren();
    suppliers.forEach(s=>{
      const row=document.createElement("tr");
      const name=document.createElement("input");
      name.type="text";name.maxLength=80;name.className="pr-name-input";
      name.value=s.name;name.setAttribute("aria-label","Supplier name");
      const pad=field(s.padCost,"0.01","Pad unit price for "+s.name);
      const tampon=field(s.tamponCost,"0.01","Tampon unit price for "+s.name);
      const lead=field(s.leadDays,"1","Lead days for "+s.name);
      const moq=field(s.moq,"1","Minimum order per product for "+s.name,"1");
      const fee=field(s.deliveryFee,"0.01","Delivery cost for "+s.name);
      const status=document.createElement("select");
      status.className="pr-status-select";
      ["Active","Under review","Inactive"].forEach(value=>{
        const option=make("option",value);option.value=value;status.append(option);
      });
      status.value=s.status;
      const save=make("button","Save");
      save.className="button pr-small-btn";save.type="button";
      save.addEventListener("click",()=>{
        const raw=[pad,tampon,lead,moq,fee];
        const values=raw.map(el=>Number(el.value));
        if(!name.value.trim() || raw.some(el=>!el.value.trim()) ||
          !values.every(goodNumber) || !Number.isInteger(values[2]) ||
          !Number.isInteger(values[3]) || values[3]<1) {
          alert("Provide a supplier name, non-negative prices and fees, whole-number lead time, and MOQ of at least one.");
          return;
        }
        Object.assign(s,{name:name.value.trim(),padCost:values[0],tamponCost:values[1],
          leadDays:values[2],moq:values[3],deliveryFee:values[4],status:status.value});
        persist();renderDirectory();render();
        document.dispatchEvent(new CustomEvent("nora-demo-saved",{detail:{message:"Supplier scenario saved"}}));
      });
      [name,pad,tampon,lead,moq,fee,status,save].forEach(value=>cell(row,value));
      directory.append(row);
    });
    if(!suppliers.length) {
      const tr=document.createElement("tr");
      const td=cell(tr,"No supplier scenarios yet. Add a scenario to begin.");
      td.colSpan=8;directory.append(tr);
    }
  }
  function readActiveBaskets() {
    const result=read("noraBaskets",[]);
    return Array.isArray(result)?result.filter(b=>b.active!==false):[];
  }
  function supplyInputs() {
    const s=read("noraSupplySettings",{});
    const safe=(value,defaultValue)=>goodNumber(value)?Math.floor(value):defaultValue;
    return {reserve:safe(s?.reserve,250),dailyUsage:safe(s?.dailyUsage,5),safetyDays:safe(s?.safetyDays,2)};
  }
  function demandRates(){
    const rates=read("noraBasketDemandRates",{});
    return rates&&typeof rates==="object"&&!Array.isArray(rates)?rates:{};
  }
  function calculate(supplier) {
    const baskets=readActiveBaskets();
    const supply=supplyInputs();
    const rates=demandRates();
    const horizon=supplier.leadDays+supply.safetyDays;
    let refillNeed=0,dailyTotal=0;
    baskets.forEach(b=>{
      const stock=Math.max(0,Number(b.stock)||0);
      const cap=Math.max(0,Number(b.capacity)||0);
      const threshold=Math.max(0,Number(b.threshold ?? 10)||0);
      const specified=rates[String(b.id)];
      const demand=Number.isInteger(specified)&&specified>=0?specified:supply.dailyUsage;
      dailyTotal+=demand;
      const coverage=Math.ceil(demand*horizon);
      const target=Math.min(cap,Math.max(threshold+1,coverage));
      if(stock<=threshold || (demand>0 && stock<coverage))refillNeed+=Math.max(0,target-stock);
    });
    // Basket refill targets already cover lead time plus safety days.
    // Add ONLY a separate central safety buffer, not those same lead-time
    // units again. This is a snapshot estimate without in-transit orders.
    const safetyReserveTarget=dailyTotal*supply.safetyDays;
    const grossRequirement=refillNeed+safetyReserveTarget;
    // A surplus of tampons cannot cover a shortage of pads (or vice versa).
    // Use per-category central reserve counts rather than subtracting one pool.
    const central=window.NoraReserve.read();
    const grossPads=Math.round(grossRequirement*padShare/100);
    const grossTampons=grossRequirement-grossPads;
    const pads=Math.max(0,grossPads-central.reservePads);
    const tampons=Math.max(0,grossTampons-central.reserveTampons);
    const suggested=pads+tampons;
    const round=n=>n===0?0:Math.ceil(n/supplier.moq)*supplier.moq;
    const padOrder=round(pads),tamponOrder=round(tampons);
    const subtotal=padOrder*supplier.padCost+tamponOrder*supplier.tamponCost;
    const delivery=padOrder+tamponOrder>0?supplier.deliveryFee:0;
    return {supplier,horizon,baskets:baskets.length,dailyTotal,reserve:supply.reserve,reservePads:central.reservePads,reserveTampons:central.reserveTampons,refillNeed,safetyReserveTarget,grossRequirement,suggested,pads,tampons,padOrder,tamponOrder,subtotal,delivery,total:subtotal+delivery};
  }
  let lastPlan="";
  function render() {
    const active=suppliers.filter(s=>s.status==="Active");
    if(!active.some(s=>s.id===selectedId))selectedId=active[0]?.id ?? "";
    select.replaceChildren();
    active.forEach(s=>{const opt=make("option",s.name);opt.value=s.id;select.append(opt);});
    select.value=selectedId;
    select.disabled=active.length===0;
    localStorage.setItem("noraProcurementSelectedSupplier",JSON.stringify(selectedId));
    comparison.replaceChildren();
    const calculations=active.map(calculate);
    const cheapest=calculations.filter(c=>c.padOrder+c.tamponOrder>0).reduce((best,c)=>
      !best || c.total<best.total?c:best,null);
    calculations.forEach(c=>{
      const tr=document.createElement("tr");
      const recommended=c===cheapest?" · Lowest estimated total":"";
      cell(tr,c.supplier.name+recommended);
      cell(tr,c.supplier.leadDays+" days");
      cell(tr,String(c.padOrder));cell(tr,String(c.tamponOrder));
      cell(tr,money(c.subtotal));cell(tr,money(c.delivery));cell(tr,money(c.total));
      const choose=make("button",c.supplier.id===selectedId?"Selected":"Use scenario");
      choose.type="button";choose.className="button pr-small-btn";
      choose.disabled=c.supplier.id===selectedId;
      choose.addEventListener("click",()=>{
        selectedId=c.supplier.id;render();
      });
      cell(tr,choose);comparison.append(tr);
    });
    if(!active.length){
      const tr=document.createElement("tr");cell(tr,"No active suppliers. Set a scenario to Active to compare costs.").colSpan=8;comparison.append(tr);
    }
    const chosen=calculations.find(c=>c.supplier.id===selectedId);
    recommendations.replaceChildren();
    if(!chosen){
      const tr=document.createElement("tr");cell(tr,"No active supplier scenario selected.").colSpan=5;recommendations.append(tr);
    } else {
      [["Pads",chosen.pads,chosen.padOrder,chosen.supplier.padCost],
       ["Tampons",chosen.tampons,chosen.tamponOrder,chosen.supplier.tamponCost]].forEach(([name,suggested,ordered,unitCost])=>{
        const tr=document.createElement("tr");
        [name,suggested,ordered,money(unitCost),money(ordered*unitCost)].forEach(v=>cell(tr,v));
        recommendations.append(tr);
      });
    }
    document.getElementById("pr-refill-need").textContent=(chosen?.refillNeed ?? 0)+" units";
    document.getElementById("pr-safety-buffer").textContent=(chosen?.safetyReserveTarget ?? 0)+" units";
    document.getElementById("pr-reserve-offset").textContent=chosen?(chosen.reservePads+" pads · "+chosen.reserveTampons+" tampons"):"0 units";
    document.getElementById("pr-net-requirement").textContent=(chosen?.suggested ?? 0)+" units";
    document.getElementById("pr-purchase-total").textContent=chosen?(chosen.padOrder+chosen.tamponOrder)+" units":"0 units";
    document.getElementById("pr-subtotal").textContent=money(chosen?.subtotal||0);
    document.getElementById("pr-delivery").textContent=money(chosen?.delivery||0);
    document.getElementById("pr-grand-total").textContent=money(chosen?.total||0);
    document.getElementById("pr-rationale").textContent=chosen?
      "Scenario: "+chosen.baskets+" active baskets · "+chosen.dailyTotal+" units/day estimated demand · "+
      chosen.horizon+" days lead + safety coverage in basket targets · "+chosen.refillNeed+
      " units for indicated basket refills + "+chosen.safetyReserveTarget+
      " units central safety buffer. Reserve has "+chosen.reservePads+
      " pads and "+chosen.reserveTampons+" tampons. Category-specific gaps total "+
      chosen.suggested+
      " units before MOQ rounding. A surplus of one category cannot cover another. This is a simulated planning snapshot.":
      "No active supplier selected. All quotes and purchasing quantities are simulated.";
    lastPlan=chosen?[
      "NORA — Simulated Procurement Plan","Supplier: "+chosen.supplier.name,
      "Lead time: "+chosen.supplier.leadDays+" days; MOQ: "+chosen.supplier.moq+" per product",
      "Estimated demand: "+chosen.dailyTotal+" units/day; central reserve: "+chosen.reserve+" units",
      "Required basket refills: "+chosen.refillNeed+" units",
      "Central safety buffer: "+chosen.safetyReserveTarget+" units",
      "Gross requirement: "+chosen.grossRequirement+" units",
      "Reserve: "+chosen.reservePads+" pads and "+chosen.reserveTampons+" tampons",
      "Suggested requirement before MOQ: "+chosen.suggested+" units",
      "Pads: "+chosen.padOrder+" units at "+money(chosen.supplier.padCost),
      "Tampons: "+chosen.tamponOrder+" units at "+money(chosen.supplier.tamponCost),
      "Subtotal: "+money(chosen.subtotal)+"; Delivery: "+money(chosen.delivery),
      "Total: "+money(chosen.total),
      "Scenario only — not a purchase order. Verify supplier quotation and demand."
    ].join("\n"):"NORA — No active supplier scenario.";
  }
  document.getElementById("pr-add-supplier").addEventListener("click",()=>{
    const id="scenario-"+Date.now()+"-"+Math.floor(Math.random()*10000);
    suppliers.push({id,name:"New Supplier Scenario",padCost:0.25,tamponCost:0.30,
      leadDays:5,moq:50,deliveryFee:10,status:"Under review"});
    persist();renderDirectory();render();
    document.dispatchEvent(new CustomEvent("nora-demo-saved",{detail:{message:"New supplier scenario added"}}));
    directory.lastElementChild?.querySelector("input")?.focus();
  });
  select.addEventListener("change",()=>{selectedId=select.value;render();document.dispatchEvent(new CustomEvent("nora-demo-saved",{detail:{message:"Selected supplier updated"}}));});
  shareField.addEventListener("change",()=>{
    const raw=shareField.value.trim(),n=Number(raw);
    if(!raw||!Number.isInteger(n)||n<0||n>100){
      alert("Enter a whole-number pad share between 0 and 100.");
      shareField.value=String(padShare);return;
    }
    padShare=n;localStorage.setItem("noraProcurementPadShare",JSON.stringify(n));render();
    document.dispatchEvent(new CustomEvent("nora-demo-saved",{detail:{message:"Product mix assumption saved"}}));
  });
  document.getElementById("pr-copy-plan").addEventListener("click",async()=>{
    try {await navigator.clipboard.writeText(lastPlan);}
    catch {window.prompt("Copy this simulated plan:",lastPlan);}
  });
  document.addEventListener("nora-inventory-updated",render);
  document.addEventListener("nora-planning-updated",render);
  window.addEventListener("storage",event=>{
    if(["noraBaskets","noraBasketDemandRates","noraSupplySettings"].includes(event.key))render();
  });
  renderDirectory();render();
})();
