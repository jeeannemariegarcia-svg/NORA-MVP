/* Shared browser-local central inventory (not a server or physical stock ledger).
   Migrates legacy combined reserve into an explicitly ESTIMATED 50/50 split. */
(function () {
  const key="noraSupplySettings";
  const whole=n=>Number.isInteger(n)&&n>=0;
  const clean=raw=>raw && typeof raw==="object" && !Array.isArray(raw)?raw:{};
  function read() {
    let stored={};
    try {stored=clean(JSON.parse(localStorage.getItem(key)||"{}"));}catch{}
    const total=whole(stored.reserve)?stored.reserve:250;
    const hasSplit=whole(stored.reservePads)&&whole(stored.reserveTampons)&&
      stored.reservePads+stored.reserveTampons===total;
    return {...stored,reserve:total,
      reservePads:hasSplit?stored.reservePads:Math.ceil(total/2),
      reserveTampons:hasSplit?stored.reserveTampons:Math.floor(total/2),
      reserveMixEstimated:hasSplit?stored.reserveMixEstimated!==false:true};
  }
  function write(pads,tampons,estimated) {
    if(!whole(pads)||!whole(tampons)||!Number.isSafeInteger(pads+tampons))
      throw new Error("Reserve counts must be non-negative whole numbers.");
    const latest=read();
    const updated={...latest,reservePads:pads,reserveTampons:tampons,
      reserve:pads+tampons,reserveMixEstimated:Boolean(estimated)};
    localStorage.setItem(key,JSON.stringify(updated));
    document.dispatchEvent(new Event("nora-planning-updated"));
    return updated;
  }
  window.NoraReserve={read,write};
})();
