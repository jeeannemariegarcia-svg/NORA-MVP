/* Shared browser-local central inventory; no physical inventory is tracked.
   Legacy combined reserve is shown as an ESTIMATED 50/50 pad/tampon split. */
(function () {
  const key="noraSupplySettings";
  const whole=n=>Number.isSafeInteger(n)&&n>=0;
  const clean=raw=>raw && typeof raw==="object" && !Array.isArray(raw)?raw:{};
  function read() {
    let stored={};
    try {stored=clean(JSON.parse(localStorage.getItem(key)||"{}"));}catch{}
    const total=whole(stored.reserve)?stored.reserve:250;
    const hasSplit=whole(stored.reservePads)&&whole(stored.reserveTampons)&&
      stored.reservePads+stored.reserveTampons===total;
    const wasEstimated=!hasSplit || stored.reserveMixEstimated!==false;
    // Existing explicit splits marked non-estimated remain intact.
    const padsVerified=hasSplit && (stored.reservePadsVerified===true ||
      (stored.reservePadsVerified===undefined && !wasEstimated));
    const tamponsVerified=hasSplit && (stored.reserveTamponsVerified===true ||
      (stored.reserveTamponsVerified===undefined && !wasEstimated));
    return {...stored,reserve:total,
      reservePads:hasSplit?stored.reservePads:Math.ceil(total/2),
      reserveTampons:hasSplit?stored.reserveTampons:Math.floor(total/2),
      reservePadsVerified:padsVerified,reserveTamponsVerified:tamponsVerified,
      reserveMixEstimated:!(padsVerified&&tamponsVerified)};
  }
  // Editing just one category does NOT validate the other migrated estimate.
  function write(pads,tampons,options={}) {
    if(!whole(pads)||!whole(tampons)||!whole(pads+tampons))
      throw new Error("Reserve counts must be non-negative whole numbers.");
    const latest=read();
    const padVerified=options.verifiedField==="reservePads" ? true : latest.reservePadsVerified;
    const tamponVerified=options.verifiedField==="reserveTampons" ? true : latest.reserveTamponsVerified;
    const updated={...latest,reservePads:pads,reserveTampons:tampons,
      reserve:pads+tampons,reservePadsVerified:padVerified,
      reserveTamponsVerified:tamponVerified,
      reserveMixEstimated:!(padVerified&&tamponVerified)};
    localStorage.setItem(key,JSON.stringify(updated));
    document.dispatchEvent(new Event("nora-planning-updated"));
    return updated;
  }
  window.NoraReserve={read,write};
})();
