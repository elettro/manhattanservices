document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");

  if (!header || !toggle || !nav) {
    return;
  }

  const mobileMedia = window.matchMedia("(max-width: 900px)");

  const closeMenu = () => {
    header.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const syncMobileState = () => {
    closeMenu();

    if (mobileMedia.matches) {
      header.classList.add("mobile-nav-collapsed");
      return;
    }

    header.classList.remove("mobile-nav-collapsed");
  };

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", syncMobileState);

  syncMobileState();
});
