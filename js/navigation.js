import { initializeTheme } from "./theme.js";

const navbar = document.querySelector("#navbar");

export async function Components() {
  try {
    const navbarRes = await fetch("../components/navbar.html");

    if (!navbarRes.ok) {
      throw new Error("Navbar loading failed");
    }

    const navbarHTML = await navbarRes.text();

    navbar.insertAdjacentHTML("beforebegin", navbarHTML);

    // الان Navbar داخل DOM است
    initializeTheme();
  } catch (error) {
    console.error("Components Error:", error);
  }
}

Components();
