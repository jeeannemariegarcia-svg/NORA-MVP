/* NORA admin section navigation — no data changes. */
(function () {
  const tabs = [...document.querySelectorAll(".admin-tab-list [role='tab']")];
  if (!tabs.length) return;
  const valid = new Set(tabs.map(tab => tab.dataset.tab));
  const nameFromHash = () => {
    const name = decodeURIComponent(location.hash.replace(/^#/, ""));
    return valid.has(name) ? name : "overview";
  };
  function activate(name, updateUrl = false) {
    if (!valid.has(name)) name = "overview";
    tabs.forEach(tab => {
      const isActive = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !isActive;
    });
    if (updateUrl && location.hash !== "#" + name) {
      history.pushState(null, "", "#" + name);
    }
    // Leaflet maps initialized inside a hidden panel need to measure again.
    if (name === "basket-setup") document.dispatchEvent(new Event("nora-map-visible"));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab, true));
    tab.addEventListener("keydown", event => {
      const key = event.key;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
      event.preventDefault();
      let next = index;
      if (key === "ArrowRight") next = (index + 1) % tabs.length;
      if (key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (key === "Home") next = 0;
      if (key === "End") next = tabs.length - 1;
      tabs[next].focus();
      activate(tabs[next].dataset.tab, true);
    });
  });
  window.addEventListener("hashchange", () => activate(nameFromHash()));
  window.addEventListener("popstate", () => activate(nameFromHash()));
  document.addEventListener("nora-admin-ready", () => activate(nameFromHash()));
  window.NoraAdminTabs = {
    show(name) { activate(name, true); }
  };
  activate(nameFromHash());
})();
