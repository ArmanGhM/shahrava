export function initializeTheme() {
  const btnTheme = document.querySelector("#theme-toggle");
  const themeWeb = localStorage.getItem("themeWeb");
  const imgHedaerHome = document.querySelector("#imgHedaerHome");
  const iconThemeNavbar = document.querySelector("#iconThemeNavbar");

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      if (iconThemeNavbar) {
        iconThemeNavbar.src = "/assets/icon/Sun 1.svg";
      }
      if (imgHedaerHome) {
        imgHedaerHome.src = "/assets/img/smart-people-dark.svg";
      }
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      if (iconThemeNavbar) {
        iconThemeNavbar.src = "/assets/icon/Moon.svg";
      }
      if (imgHedaerHome) {
        imgHedaerHome.src = "/assets/img/smart-people.svg";
      }
    }
  }

  const initialTheme = themeWeb || "light";
  applyTheme(initialTheme);

  if (btnTheme) {
    btnTheme.onclick = () => {
      const active = localStorage.getItem("themeWeb") || "light";
      const next = active === "dark" ? "light" : "dark";
      localStorage.setItem("themeWeb", next);
      applyTheme(next);
    };
  }

  const mobileMenu = document.querySelector("#mobile-menu");
  const mobileMenuToggle = document.querySelector("#mobile-menu-toggle");
  if (mobileMenuToggle && mobileMenu) {
    let isOpenMenu = false;
    mobileMenuToggle.onclick = () => {
      isOpenMenu = !isOpenMenu;
      if (isOpenMenu) {
        mobileMenu.style.gridTemplateRows = "1fr";
        mobileMenu.style.opacity = "1";
        mobileMenuToggle.setAttribute("aria-expanded", "true");
      } else {
        mobileMenu.style.gridTemplateRows = "0fr";
        mobileMenu.style.opacity = "0";
        mobileMenuToggle.setAttribute("aria-expanded", "false");
      }
    };
  }
}
