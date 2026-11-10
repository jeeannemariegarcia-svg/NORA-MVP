/* NORA educational country carousel: manual controls, no autoplay or external dependencies. */
(() => {
  const root = document.querySelector(".student-culture-carousel");
  if (!root) return;
  const slides = [...root.querySelectorAll("[data-culture-slide]")];
  const dots = [...root.querySelectorAll("[data-culture-dot]")];
  const prev = root.querySelector("[data-culture-prev]");
  const next = root.querySelector("[data-culture-next]");
  const status = root.querySelector("[data-culture-status]");
  const labels = ["Philippines", "Iran", "Canada"];
  let current = 0;
  const show = index => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== current;
      slide.setAttribute("aria-hidden", String(i !== current));
    });
    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle("is-active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    if (status) status.textContent = labels[current] + " · Slide " + (current + 1) + " of " + slides.length;
  };
  prev?.addEventListener("click", () => show(current - 1));
  next?.addEventListener("click", () => show(current + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => show(index)));
  root.addEventListener("keydown", event => {
    // Arrow keys only change slides when focus is on a carousel navigation control.
    if (!event.target.closest(".student-culture-controls")) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); show(current - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); show(current + 1); }
  });
  // Source-linked images may be blocked by the image provider. Keep a clear fallback.
  root.querySelectorAll(".student-culture-product-figure img").forEach(img => {
    const fallback = () => {
      img.hidden = true;
      if (!img.parentElement.querySelector(".student-culture-image-unavailable")) {
        const message = document.createElement("span");
        message.className = "student-culture-image-unavailable";
        message.textContent = "Product photo unavailable — view the credited source.";
        img.parentElement.append(message);
      }
    };
    img.addEventListener("error", fallback);
    if (img.complete && img.naturalWidth === 0) fallback();
  });
  show(0);
})();