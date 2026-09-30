export function initSearch() {
  const citySearchInput = document.querySelector("#city-search");
  const btnCitySearch = document.querySelector("#city-search-button");
  const finalCityInput = document.querySelector("#final-city-search");
  const btnFinalSearch = document.querySelector("#final-search-button");
  const exploreButton = document.querySelector("#explore-button");

  const goToCity = (cityName) => {
    if (!cityName || !cityName.trim()) return;
    window.location.href = `/cities/?q=${encodeURIComponent(cityName.trim())}`;
  };

  if (citySearchInput && btnCitySearch) {
    btnCitySearch.onclick = () => goToCity(citySearchInput.value);
    citySearchInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goToCity(citySearchInput.value);
      }
    };
  }

  if (finalCityInput && btnFinalSearch) {
    btnFinalSearch.onclick = () => goToCity(finalCityInput.value);
    finalCityInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goToCity(finalCityInput.value);
      }
    };
  }

  if (exploreButton) {
    exploreButton.onclick = () => {
      window.location.href = "/cities/?q=تهران";
    };
  }

  // Also bind any destination cards on index.html so clicking them navigates to the city page!
  const destinationCards = document.querySelectorAll(".sh-city-card");
  destinationCards.forEach((card) => {
    const title = card.querySelector("h3")?.textContent?.trim();
    if (title) {
      card.style.cursor = "pointer";
      card.onclick = () => goToCity(title);
    }
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSearch);
  } else {
    initSearch();
  }
}
