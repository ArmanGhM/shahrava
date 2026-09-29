export function initializeTheme() {
  const btnTheme = document.querySelector("#theme-toggle");
  const appAllBody = document.querySelector("#app");
  const themeWeb = localStorage.getItem("themeWeb");
  const imgHedaerHome = document.querySelector("#imgHedaerHome");
  const iconThemeNavbar = document.querySelector("#iconThemeNavbar");
  console.log(iconThemeNavbar);
  let isHomePage =
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("/index.html");
  console.log(themeWeb);
  if (!themeWeb) {
    localStorage.setItem("themeWeb", "light");
  }
  if (themeWeb === "light") {
    document.body.style.background = "black";
    document.querySelector("html").classList.add("dark");
    iconThemeNavbar.src = "../assets/icon/Sun 1.svg";
    if (isHomePage) {
      imgHedaerHome.src = "assets/img/smart-people-dark.svg";
    }
  } else {
    document.body.style.background = "white";
    document.querySelector("html").classList.remove("dark");
    iconThemeNavbar.src = "../assets/icon/Moon.svg";
    imgHedaerHome.src = "assets/img/smart-people.svg";
  }
  btnTheme.addEventListener("click", () => {
    const getThemeWeb = localStorage.getItem("themeWeb");
    if (getThemeWeb === "dark") {
      document.body.style.background = "black";
      localStorage.setItem("themeWeb", "light");
      document.querySelector("html").classList.add("dark");
      if (isHomePage) {
        imgHedaerHome.src = "assets/img/smart-people-dark.svg";
      }
      iconThemeNavbar.src = "../assets/icon/Sun 1.svg";
    } else {
      document.body.style.background = "white";
      localStorage.setItem("themeWeb", "dark");
      imgHedaerHome.src = "assets/img/smart-people.svg";
      document.querySelector("html").classList.remove("dark");

      iconThemeNavbar.src = "../assets/icon/Moon.svg";
    }
  });
  const mobileMenu = document.querySelector("#mobile-menu");
  const mobileMenuToggle = document.querySelector("#mobile-menu-toggle");
  let isOpenMenu = false;
  mobileMenuToggle.addEventListener("click", () => {
    if (!isOpenMenu) {
      isOpenMenu = !isOpenMenu;
      mobileMenu.classList.remove("hidden");
      mobileMenu.classList.remove("opacity-0");
      mobileMenu.querySelector("div").classList.remove("overflow-hidden");
    } else {
      isOpenMenu = !isOpenMenu;
      mobileMenu.classList.add("hidden");
      mobileMenu.classList.add("opacity-0");
      mobileMenu.querySelector("div").classList.add("overflow-hidden");
    }
  });
}
