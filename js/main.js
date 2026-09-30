import { Components } from "./navigation.js";
import { initializeTheme } from "./theme.js";
import { initSearch } from "./api/SearchCity.js";

async function initApp() {
  await Components();
  initializeTheme();
  initSearch();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
