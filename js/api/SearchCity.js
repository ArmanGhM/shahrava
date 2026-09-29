const citySearchHeader = document.querySelector("#city-search");
const btnCitySearch = document.querySelector("#city-search-button");
async function searchCity(cityName) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(cityName)}` +
    `&format=jsonv2` +
    `&accept-language=fa` +
    `&addressdetails=1` +
    `&limit=5`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("City search failed");
  }

  const data = await response.json();
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${data.lat}` +
    `&longitude=${data.lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&timezone=auto`;

  console.log(url);

  return data;
}

searchCity("تهران");
console.log(btnCitySearch);
btnCitySearch.addEventListener("click", () => {
  searchCity(citySearchHeader.value);
});
