// =========================================================
// SHAHRAVA — CITY INTELLIGENCE ENGINE
// Real API-Driven Data Layer for City Information
// =========================================================

// Weather Code mapping to Persian description and icon
const WEATHER_CODE_MAP = {
  0: { desc: "آسمان صاف", icon: "☀️" },
  1: { desc: "عمدتاً صاف", icon: "🌤️" },
  2: { desc: "نیمه ابری", icon: "⛅" },
  3: { desc: "ابری", icon: "☁️" },
  45: { desc: "مه‌آلود", icon: "🌫️" },
  48: { desc: "مه یخ‌زده", icon: "🌫️" },
  51: { desc: "نم‌نم باران ملایم", icon: "🌦️" },
  53: { desc: "نم‌نم باران متوسط", icon: "🌦️" },
  55: { desc: "نم‌نم باران شدید", icon: "🌧️" },
  56: { desc: "نم‌نم باران یخی خفیف", icon: "🌧️" },
  57: { desc: "نم‌نم باران یخی شدید", icon: "🌧️" },
  61: { desc: "بارش باران خفیف", icon: "🌧️" },
  63: { desc: "بارش باران متوسط", icon: "🌧️" },
  65: { desc: "بارش باران شدید", icon: "🌧️" },
  66: { desc: "باران منجمد خفیف", icon: "🌨️" },
  67: { desc: "باران منجمد شدید", icon: "🌨️" },
  71: { desc: "بارش برف خفیف", icon: "🌨️" },
  73: { desc: "بارش برف متوسط", icon: "❄️" },
  75: { desc: "بارش برف سنگین", icon: "❄️" },
  77: { desc: "دانه‌های برف", icon: "❄️" },
  80: { desc: "رگبار ملایم", icon: "🌦️" },
  81: { desc: "رگبار متوسط", icon: "🌧️" },
  82: { desc: "رگبار شدید", icon: "⛈️" },
  85: { desc: "رگبار برف خفیف", icon: "🌨️" },
  86: { desc: "رگبار برف شدید", icon: "❄️" },
  95: { desc: "رعد و برق", icon: "⚡" },
  96: { desc: "رعد و برق با تگرگ خفیف", icon: "⛈️" },
  99: { desc: "رعد و برق شدید همراه با تگرگ", icon: "⛈️" },
};

export function getWeatherMeta(code) {
  return WEATHER_CODE_MAP[code] || { desc: "معتدل", icon: "🌤️" };
}

// Persian day names
const PERSIAN_DAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
  "شنبه",
];

// In-memory country cache
let countriesCache = null;

export async function getCountriesData() {
  if (countriesCache) return countriesCache;
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json"
    );
    if (res.ok) {
      countriesCache = await res.json();
      return countriesCache;
    }
  } catch (err) {
    console.warn("Failed to fetch countries database:", err);
  }
  return [];
}

// 1. City Search & Geo Details via Nominatim
export async function searchCityDetails(query) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query.trim())}` +
    `&format=jsonv2` +
    `&accept-language=fa,en` +
    `&addressdetails=1` +
    `&extratags=1` +
    `&limit=5`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("درخواست جستجوی شهر با خطا مواجه شد.");
  }

  const results = await response.json();
  if (!results || results.length === 0) {
    return null;
  }

  // Pick the most relevant result (city, administrative, town)
  const place =
    results.find(
      (r) =>
        r.addresstype === "city" ||
        r.addresstype === "town" ||
        r.addresstype === "administrative"
    ) || results[0];

  const address = place.address || {};
  const extratags = place.extratags || {};

  const cityName =
    address.city ||
    address.town ||
    address.municipality ||
    address.county ||
    place.name ||
    query;

  const cityNameEn =
    extratags["name:en"] ||
    place.namedetails?.["name:en"] ||
    address["city:en"] ||
    cityName;

  const countryName = address.country || "اطلاعات در دسترس نیست";
  const countryNameEn = extratags["country:en"] || address["country:en"] || countryName;
  const countryCode = (address.country_code || "").toUpperCase();

  const state =
    address.state || address.province || address.region || null;

  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon);

  // Timezone and population from extratags or inference
  let population = extratags.population ? parseInt(extratags.population, 10) : null;
  let timezone = extratags.timezone || null;

  return {
    placeId: place.place_id,
    name: cityName,
    nameEn: cityNameEn,
    fullName: place.display_name,
    country: countryName,
    countryEn: countryNameEn,
    countryCode,
    state,
    lat,
    lon,
    population,
    timezone,
    extratags,
  };
}

// 2. Country Info Lookup
export async function getCountryInfo(countryCode, countryName) {
  const countries = await getCountriesData();
  const cData = countries.find(
    (c) =>
      (countryCode && c.cca2 === countryCode) ||
      (c.name?.common && c.name.common.toLowerCase() === countryName?.toLowerCase())
  );

  if (cData) {
    const capital = cData.capital?.[0] || "اطلاعات در دسترس نیست";
    const continent = cData.region || "اطلاعات در دسترس نیست";
    const subregion = cData.subregion || null;
    const flag = cData.flag || "🌐";
    const languages = cData.languages
      ? Object.values(cData.languages).join("، ")
      : "اطلاعات در دسترس نیست";

    let currency = "اطلاعات در دسترس نیست";
    if (cData.currencies) {
      const curKey = Object.keys(cData.currencies)[0];
      const curObj = cData.currencies[curKey];
      currency = `${curObj.name || curKey} (${curObj.symbol || curKey})`;
    }

    let phoneCode = "اطلاعات در دسترس نیست";
    if (cData.idd?.root) {
      const suffix = cData.idd.suffixes?.[0] || "";
      phoneCode = `${cData.idd.root}${suffix}`;
    }

    const timezones = cData.timezones?.join("، ") || "اطلاعات در دسترس نیست";

    return {
      flag,
      name: cData.name?.common || countryName,
      nameNative: cData.name?.native?.fas?.common || cData.name?.common || countryName,
      capital,
      continent,
      subregion,
      code: cData.cca2 || countryCode,
      currency,
      languages,
      phoneCode,
      timezones,
    };
  }

  return {
    flag: "🌐",
    name: countryName,
    nameNative: countryName,
    capital: "اطلاعات در دسترس نیست",
    continent: "اطلاعات در دسترس نیست",
    subregion: null,
    code: countryCode || "اطلاعات در دسترس نیست",
    currency: "اطلاعات در دسترس نیست",
    languages: "اطلاعات در دسترس نیست",
    phoneCode: "اطلاعات در دسترس نیست",
    timezones: "اطلاعات در دسترس نیست",
  };
}

// 3. Open-Meteo 7-Day Forecast & Current Conditions
export async function fetchWeatherForecast(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
    `&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("اطلاعات آب‌وهوا دریافت نشد.");
  }

  const data = await response.json();
  const current = data.current;
  const daily = data.daily;
  const timezone = data.timezone;
  const elevation = data.elevation;

  // Process 7-day forecast
  const forecastDays = [];
  if (daily && daily.time) {
    for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
      const dateObj = new Date(daily.time[i] + "T00:00:00");
      const dayOfWeek = PERSIAN_DAYS[dateObj.getDay()];
      const weatherMeta = getWeatherMeta(daily.weather_code[i]);
      const minTemp = Math.round(daily.temperature_2m_min[i]);
      const maxTemp = Math.round(daily.temperature_2m_max[i]);
      const precipProb = daily.precipitation_probability_max
        ? daily.precipitation_probability_max[i]
        : 0;

      const sunrise = daily.sunrise?.[i]
        ? daily.sunrise[i].split("T")[1]?.slice(0, 5)
        : null;
      const sunset = daily.sunset?.[i]
        ? daily.sunset[i].split("T")[1]?.slice(0, 5)
        : null;

      forecastDays.push({
        date: daily.time[i],
        dayName: i === 0 ? "امروز" : i === 1 ? "فردا" : dayOfWeek,
        icon: weatherMeta.icon,
        desc: weatherMeta.desc,
        minTemp,
        maxTemp,
        precipProb,
        sunrise,
        sunset,
      });
    }
  }

  const currentMeta = current ? getWeatherMeta(current.weather_code) : null;

  return {
    timezone,
    elevation,
    current: current
      ? {
          temp: Math.round(current.temperature_2m),
          apparentTemp: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          windDirection: current.wind_direction_10m,
          weatherCode: current.weather_code,
          desc: currentMeta.desc,
          icon: currentMeta.icon,
        }
      : null,
    forecast: forecastDays,
    todaySunrise: forecastDays[0]?.sunrise || "اطلاعات در دسترس نیست",
    todaySunset: forecastDays[0]?.sunset || "اطلاعات در دسترس نیست",
    todayMin: forecastDays[0]?.minTemp ?? "-",
    todayMax: forecastDays[0]?.maxTemp ?? "-",
  };
}

// 4. City Description from Wikipedia (fa with fallback to en)
export async function fetchCityDescription(cityName, cityNameEn) {
  const tryFetchSummary = async (title, lang) => {
    try {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.type === "standard" && data.extract) {
          return {
            title: data.title,
            extract: data.extract,
            thumbnail: data.thumbnail?.source || data.originalimage?.source || null,
            pageUrl: data.content_urls?.desktop?.page || null,
            lang,
          };
        }
      }
    } catch (e) {
      console.warn(`Wikipedia ${lang} fetch failed:`, e);
    }
    return null;
  };

  // Try Persian Wikipedia first
  let summary = await tryFetchSummary(cityName, "fa");

  // Fallback to English Wikipedia
  if (!summary && cityNameEn) {
    summary = await tryFetchSummary(cityNameEn, "en");
  }

  return summary;
}

// 5. Tourist Attractions & POI via Wikipedia Geosearch
export async function fetchCityAttractions(lat, lon, cityName) {
  const attractions = [];

  // Helper to categorize POI based on Persian and English keywords
  function categorizePlace(title, extract = "") {
    const text = (title + " " + extract).toLowerCase();
    if (
      text.includes("موزه") ||
      text.includes("museum") ||
      text.includes("gallery") ||
      text.includes("نگارخانه")
    ) {
      return { category: "موزه", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    }
    if (
      text.includes("کاخ") ||
      text.includes("قلعه") ||
      text.includes("تاریخی") ||
      text.includes("palace") ||
      text.includes("castle") ||
      text.includes("fort") ||
      text.includes("ancient") ||
      text.includes("عمارت") ||
      text.includes("کاروانسرا")
    ) {
      return { category: "تاریخی", color: "bg-red-500/10 text-red-500 border-red-500/20" };
    }
    if (
      text.includes("مسجد") ||
      text.includes("کلیسا") ||
      text.includes("امامزاده") ||
      text.includes("آرامگاه") ||
      text.includes("mosque") ||
      text.includes("church") ||
      text.includes("cathedral") ||
      text.includes("temple") ||
      text.includes("زیارت")
    ) {
      return { category: "مذهبی", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    }
    if (
      text.includes("پارک") ||
      text.includes("بوستان") ||
      text.includes("باغ") ||
      text.includes("park") ||
      text.includes("garden") ||
      text.includes("جنگل") ||
      text.includes("رود") ||
      text.includes("دریاچه") ||
      text.includes("lake")
    ) {
      return { category: "پارک", color: "bg-green-500/10 text-green-500 border-green-500/20" };
    }
    if (
      text.includes("برج") ||
      text.includes("پل") ||
      text.includes("میدان") ||
      text.includes("tower") ||
      text.includes("bridge") ||
      text.includes("square") ||
      text.includes("معماری") ||
      text.includes("arch")
    ) {
      return { category: "معماری", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
    }
    if (
      text.includes("تئاتر") ||
      text.includes("سینما") ||
      text.includes("فرهنگسرا") ||
      text.includes("کتابخانه") ||
      text.includes("theatre") ||
      text.includes("cinema") ||
      text.includes("opera")
    ) {
      return { category: "فرهنگی", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
    }
    if (
      text.includes("کوه") ||
      text.includes("طبیعت") ||
      text.includes("mountain") ||
      text.includes("valley") ||
      text.includes("دره") ||
      text.includes("آبشار") ||
      text.includes("waterfall")
    ) {
      return { category: "طبیعت", color: "bg-teal-500/10 text-teal-500 border-teal-500/20" };
    }
    return { category: "تفریحی", color: "bg-sky-500/10 text-sky-500 border-sky-500/20" };
  }

  try {
    // Search Wikipedia geosearch for points of interest within 15km
    const geoUrl = `https://fa.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lon}&gsradius=15000&gslimit=18&format=json&origin=*`;
    const res = await fetch(geoUrl);
    if (res.ok) {
      const data = await res.json();
      const items = data.query?.geosearch || [];

      // Filter out city title itself and irrelevant articles
      const filtered = items
        .filter(
          (item) =>
            item.title !== cityName &&
            !item.title.startsWith("فهرست") &&
            !item.title.startsWith("رده:") &&
            !item.title.includes("کشته") &&
            !item.title.includes("حادثه")
        )
        .slice(0, 12);

      // Fetch summary and image for each
      const detailsPromises = filtered.map(async (item) => {
        try {
          const sumRes = await fetch(
            `https://fa.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
              item.title
            )}`
          );
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            const { category, color } = categorizePlace(
              item.title,
              sumData.extract || ""
            );
            return {
              id: item.pageid,
              name: item.title,
              lat: item.lat,
              lon: item.lon,
              distanceMeters: Math.round(item.dist),
              distanceKm: (item.dist / 1000).toFixed(1),
              description: sumData.extract || "جاذبه دیدنی و نقطه مهم شهری.",
              image: sumData.thumbnail?.source || sumData.originalimage?.source || null,
              category,
              categoryColor: color,
              mapUrl: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=16/${item.lat}/${item.lon}`,
            };
          }
        } catch (e) {
          // ignore individual failed attraction
        }
        const { category, color } = categorizePlace(item.title);
        return {
          id: item.pageid,
          name: item.title,
          lat: item.lat,
          lon: item.lon,
          distanceMeters: Math.round(item.dist),
          distanceKm: (item.dist / 1000).toFixed(1),
          description: "نقطه دیدنی و جاذبه شهری واقع در این منطقه.",
          image: null,
          category,
          categoryColor: color,
          mapUrl: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=16/${item.lat}/${item.lon}`,
        };
      });

      const settled = await Promise.allSettled(detailsPromises);
      settled.forEach((r) => {
        if (r.status === "fulfilled" && r.value) {
          attractions.push(r.value);
        }
      });
    }
  } catch (err) {
    console.warn("Attractions geosearch failed:", err);
  }

  return attractions;
}

// 6. City Photos & Gallery from Wikimedia Commons
export async function fetchCityPhotos(lat, lon, cityName, cityNameEn) {
  const photos = [];

  try {
    const commonsUrl =
      `https://commons.wikimedia.org/w/api.php?action=query` +
      `&generator=geosearch` +
      `&ggscoord=${lat}%7C${lon}` +
      `&ggsradius=12000` +
      `&ggsnamespace=6` +
      `&ggslimit=12` +
      `&prop=imageinfo` +
      `&iiprop=url|extmetadata` +
      `&iiurlwidth=1200` +
      `&format=json` +
      `&origin=*`;

    const res = await fetch(commonsUrl);
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages || {};

      Object.values(pages).forEach((p) => {
        const info = p.imageinfo?.[0];
        if (info && info.thumburl) {
          // Filter out vector icons or logos if possible
          if (!info.thumburl.includes(".svg.png") && !info.thumburl.includes("Logo_")) {
            const meta = info.extmetadata || {};
            const cleanTitle = p.title.replace(/^File:/i, "").replace(/\.[^/.]+$/, "");
            const author = meta.Artist?.value?.replace(/<[^>]*>?/gm, "") || "Wikimedia Commons";
            const license = meta.LicenseShortName?.value || "Creative Commons";

            photos.push({
              url: info.thumburl,
              fullUrl: info.url || info.thumburl,
              title: cleanTitle,
              author,
              license,
              credit: `عکاس: ${author} · منبع: ${license}`,
            });
          }
        }
      });
    }
  } catch (err) {
    console.warn("Wikimedia Commons photos fetch failed:", err);
  }

  return photos.slice(0, 10);
}

// 7. Format live local time
export function getLocalTime(timezone) {
  if (!timezone) return "اطلاعات در دسترس نیست";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch (e) {
    return new Date().toLocaleTimeString("fa-IR");
  }
}

// 8. Format coordinates nicely
export function formatCoordinates(lat, lon) {
  if (lat === undefined || lon === undefined) return "اطلاعات در دسترس نیست";
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir} / ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

// 9. Format population with Persian numerals
export function formatPopulation(pop) {
  if (!pop || isNaN(pop)) return "اطلاعات در دسترس نیست";
  if (pop >= 1000000) {
    return (pop / 1000000).toFixed(1) + " میلیون نفر";
  }
  if (pop >= 1000) {
    return (pop / 1000).toFixed(0) + " هزار نفر";
  }
  return pop.toLocaleString("fa-IR") + " نفر";
}

// 10. Favorites Management
const FAVORITES_KEY = "shahrava_favorites";

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function isCityFavorite(cityName) {
  const favs = getFavorites();
  return favs.some((f) => f.name?.toLowerCase() === cityName?.toLowerCase());
}

export function toggleFavorite(cityObj) {
  const favs = getFavorites();
  const index = favs.findIndex(
    (f) => f.name?.toLowerCase() === cityObj.name?.toLowerCase()
  );

  let isFav = false;
  if (index >= 0) {
    favs.splice(index, 1);
    isFav = false;
  } else {
    favs.push({
      name: cityObj.name,
      country: cityObj.country,
      flag: cityObj.flag || "🏙️",
      timestamp: Date.now(),
    });
    isFav = true;
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return isFav;
}

// 11. Recent Searches Management (Max 5)
const RECENT_KEY = "shahrava_recent_searches";

export function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function addRecentSearch(cityName) {
  if (!cityName) return;
  const recent = getRecentSearches().filter(
    (c) => c.toLowerCase() !== cityName.toLowerCase()
  );
  recent.unshift(cityName);
  if (recent.length > 5) {
    recent.pop();
  }
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}
