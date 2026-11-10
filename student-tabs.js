/* Accessible single-page tabs for the public NORA capstone prototype. */
(() => {
  const root = document.querySelector(".student-tab-list");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = new Map(tabs.map(tab => [tab.dataset.tab, document.getElementById(tab.getAttribute("aria-controls"))]));
  const aliases = {equity:"about"};
  const normalize = name => panels.has(name) ? name : aliases[name] || "home";
  let current = "";
  let activeTransition = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const refreshMap = () => requestAnimationFrame(() => {
    // Leaflet can otherwise size itself while its panel is hidden.
    if (typeof campusMap !== "undefined") campusMap.invalidateSize();
  });
  function activate(name, {focus=false, changeHash=false}={}) {
    const next = normalize(name);
    const changed = next !== current;
    if (!changed && current) {
      if (focus) tabs.find(tab => tab.dataset.tab===next)?.focus();
      return;
    }
    const setActiveTab = () => {
      for (const tab of tabs) {
        const selected = tab.dataset.tab === next;
        tab.setAttribute("aria-selected",String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels.get(tab.dataset.tab).hidden = !selected;
      }
      current = next;
      if (focus) tabs.find(tab => tab.dataset.tab===next)?.focus();
      if (changeHash && window.location.hash !== "#"+next) {
        history.pushState(null, "", "#"+next);
      }
    };
    const animate = Boolean(current && changed && document.startViewTransition && !reducedMotion.matches);
    if (activeTransition) activeTransition.skipTransition();
    // Put the destination at its top before taking the old/new transition snapshots.
    if (changed) window.scrollTo({top:0,behavior:"instant"});
    if (animate) {
      document.documentElement.classList.add("nora-tabs-view-transition");
      const transition = document.startViewTransition(setActiveTab);
      activeTransition = transition;
      transition.finished.catch(() => {}).finally(() => {
        if (activeTransition === transition) {
          activeTransition = null;
          document.documentElement.classList.remove("nora-tabs-view-transition");
        }
        if (current === "locations") refreshMap();
      });
    } else {
      setActiveTab();
      if (next === "locations" && changed) refreshMap();
    }
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab,{changeHash:true}));
    tab.addEventListener("keydown", event => {
      let targetIndex;
      if(event.key==="ArrowRight") targetIndex=(index+1)%tabs.length;
      else if(event.key==="ArrowLeft") targetIndex=(index-1+tabs.length)%tabs.length;
      else if(event.key==="Home") targetIndex=0;
      else if(event.key==="End") targetIndex=tabs.length-1;
      else return;
      event.preventDefault();
      activate(tabs[targetIndex].dataset.tab,{focus:true,changeHash:true});
    });
  });
  function showHashTab() {
    activate(window.location.hash.slice(1));
  }
  window.addEventListener("hashchange",showHashTab);
  window.addEventListener("popstate",showHashTab);
  document.querySelectorAll('a[href^="#"]').forEach(link=>{
    link.addEventListener("click",event=>{
      const id=link.getAttribute("href").slice(1);
      if (!id) return;
      if(!panels.has(id) && !Object.prototype.hasOwnProperty.call(aliases,id)) return;
      const tab=normalize(id);
      event.preventDefault();
      activate(tab,{changeHash:true});
    });
  });
  // Preserve map-to-card navigation should a marker be selected programmatically.
  document.addEventListener("nora-map-location-selected",()=>{
    if(current!=="locations")activate("locations",{changeHash:true});
  });
  showHashTab();
})();