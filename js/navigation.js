import { initializeTheme } from "./theme.js";

export async function Components() {
  try {
    const navbar = document.querySelector("#navbar");
    if (navbar) {
      const navbarRes = await fetch("/components/navbar.html");
      if (navbarRes.ok) {
        const navbarHTML = await navbarRes.text();
        navbar.innerHTML = navbarHTML;

        // Highlight active navigation links
        const currentPath = window.location.pathname.replace(/\/index\.html$/, "/") || "/";
        const navLinks = navbar.querySelectorAll("a[data-nav-link]");
        navLinks.forEach((link) => {
          const href = link.getAttribute("href");
          if (href === currentPath || (href !== "/" && currentPath.startsWith(href))) {
            link.classList.add("text-[var(--primary)]");
            const indicator = link.querySelector(".nav-indicator");
            if (indicator) {
              indicator.classList.remove("scale-x-0");
              indicator.classList.add("scale-x-100");
            }
          }
        });

        // Initialize theme and menu interactions
        initializeTheme();
      }
    }

    const footer = document.querySelector("#footer");
    if (footer) {
      const footerRes = await fetch("/components/footer.html");
      if (footerRes.ok) {
        footer.innerHTML = await footerRes.text();
      }
    }
  } catch (error) {
    console.error("Components Error:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", Components);
} else {
  Components();
}
