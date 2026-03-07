document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");

  if (!header || !toggle || !nav) {
    return;
  }

  const mobileMedia = window.matchMedia("(max-width: 900px)");
  let lastScrollY = window.scrollY;
  let collapsedByScroll = false;

  const closeMenu = () => {
    header.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const collapseMobileNav = () => {
    if (!mobileMedia.matches) {
      return;
    }

    collapsedByScroll = true;
    closeMenu();
    header.classList.add("mobile-nav-collapsed");
  };

  const expandMobileNav = () => {
    collapsedByScroll = false;
    header.classList.remove("mobile-nav-collapsed");
  };

  const syncMobileState = () => {
    if (!mobileMedia.matches) {
      expandMobileNav();
      closeMenu();
      return;
    }

    if (window.scrollY <= 8) {
      expandMobileNav();
    }
  };

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("scroll", () => {
    if (!mobileMedia.matches) {
      return;
    }

    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;

    if (currentScrollY <= 8) {
      expandMobileNav();
    } else if (scrollingDown && !collapsedByScroll) {
      collapseMobileNav();
    }

    lastScrollY = currentScrollY;
  }, { passive: true });

  window.addEventListener("resize", syncMobileState);

  syncMobileState();
});
