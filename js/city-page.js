// =========================================================
// SHAHRAVA — CITY PAGE CONTROLLER & PROGRESSIVE UI
// Handles progressive rendering, Leaflet map, gallery,
// weather, compare tool, favorites, and share.
// =========================================================

import {
  searchCityDetails,
  getCountryInfo,
  fetchWeatherForecast,
  fetchCityDescription,
  fetchCityAttractions,
  fetchCityPhotos,
  getLocalTime,
  formatCoordinates,
  formatPopulation,
  isCityFavorite,
  toggleFavorite,
  getRecentSearches,
  addRecentSearch,
} from "./city-intelligence.js";

let currentCityState = null;
let leafletMap = null;
let mapMarkers = [];
let localTimeInterval = null;
let galleryPhotos = [];
let currentPhotoIndex = 0;
let allAttractions = [];
let currentCategoryFilter = "همه";

// Toast helper
export function showToast(message, type = "success") {
  const container = document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold text-white transition-all duration-300 transform translate-y-3 opacity-0 ${
    type === "error" ? "bg-red-600" : "bg-emerald-600"
  }`;
  toast.innerHTML = `
    <span>${type === "error" ? "⚠️" : "✓"}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-3", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-3");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function createToastContainer() {
  const el = document.createElement("div");
  el.id = "toast-container";
  el.className = "fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none";
  document.body.appendChild(el);
  return el;
}

// Progressive rendering of the City Intelligence Page
export async function loadCityIntelligence(query) {
  if (!query || !query.trim()) {
    query = "تهران";
  }

  showSkeletonLoaders();
  updateRecentSearchesBar();

  // Clear previous timers & markers
  if (localTimeInterval) clearInterval(localTimeInterval);
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
    mapMarkers = [];
  }

  try {
    // 1. Fetch City Geocoding
    const city = await searchCityDetails(query);
    if (!city) {
      showCityNotFoundError(query);
      return;
    }

    currentCityState = city;
    addRecentSearch(city.name);
    updateRecentSearchesBar();

    // Update URL without full reload
    const url = new URL(window.location);
    url.searchParams.set("q", city.name);
    window.history.replaceState({}, "", url);

    // Update document title
    document.title = `${city.name} | شهرآوا`;

    // Progressive Step 1: Render City Hero, Base Info & Country immediately
    const countryPromise = getCountryInfo(city.countryCode, city.country);

    // Run independent API calls in parallel (Progressive Architecture)
    const weatherPromise = fetchWeatherForecast(city.lat, city.lon);
    const descPromise = fetchCityDescription(city.name, city.nameEn);
    const attractionsPromise = fetchCityAttractions(city.lat, city.lon, city.name);
    const photosPromise = fetchCityPhotos(city.lat, city.lon, city.name, city.nameEn);

    // Render Hero & Basic info right away
    renderCityHero(city);

    // When country resolves -> render country card
    countryPromise.then((country) => {
      city.countryInfo = country;
      renderCountryCard(country);
      renderCityStatistics(city, null);
    });

    // When weather resolves -> render Weather & update Timezone/Elevation stats
    weatherPromise
      .then((weather) => {
        city.weather = weather;
        renderWeatherSection(city, weather);
        renderCityStatistics(city, weather);
        startLiveClock(weather.timezone || city.timezone);
      })
      .catch((err) => {
        console.warn("Weather error:", err);
        renderWeatherError();
      });

    // When description resolves -> render About City
    descPromise
      .then((desc) => {
        renderAboutCity(city, desc);
      })
      .catch((err) => {
        console.warn("Description error:", err);
        renderAboutError();
      });

    // When attractions resolve -> render Attractions & Leaflet Map
    attractionsPromise
      .then((attractions) => {
        allAttractions = attractions;
        renderAttractions(attractions);
        initInteractiveMap(city, attractions);
      })
      .catch((err) => {
        console.warn("Attractions error:", err);
        renderAttractionsError();
        initInteractiveMap(city, []);
      });

    // When photos resolve -> render Gallery & Lightbox
    photosPromise
      .then((photos) => {
        galleryPhotos = photos;
        renderPhotoGallery(photos, city);
      })
      .catch((err) => {
        console.warn("Photos error:", err);
        renderPhotosError();
      });
  } catch (error) {
    console.error("Critical error loading city:", error);
    showCityNotFoundError(query);
  }
}

// ------------------------------------------------------------------
// HERO SECTION
// ------------------------------------------------------------------
function renderCityHero(city) {
  const container = document.getElementById("city-hero-container");
  if (!container) return;

  const isFav = isCityFavorite(city.name);

  container.innerHTML = `
    <div class="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 md:p-12 shadow-xl backdrop-blur-md">
      <!-- Glow decoration -->
      <div class="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--primary)]">
              <span>${city.countryCode ? `FLAG: ${city.countryCode}` : "🏙️"}</span>
              <span>${city.country}</span>
            </span>
            ${
              city.state
                ? `<span class="px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--muted)]">${city.state}</span>`
                : ""
            }
          </div>

          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--text)] tracking-tight">
            ${city.name}
          </h1>
          <p class="mt-2 text-xl font-medium text-[var(--muted)] tracking-wide font-sans">
            ${city.nameEn || ""}
          </p>

          <!-- Live Local Time -->
          <div class="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
            <span>⏰ زمان محلی:</span>
            <span id="live-local-time" class="font-bold text-[var(--text)] font-mono text-base">در حال بارگذاری...</span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <button
            id="btn-favorite"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-bold text-sm text-[var(--text)] shadow-sm transition-all duration-300 hover:border-red-400 hover:text-red-500 active:scale-95"
          >
            <span id="fav-icon" class="text-base ${isFav ? "text-red-500" : ""}">${isFav ? "♥" : "♡"}</span>
            <span id="fav-text">${isFav ? "در علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}</span>
          </button>

          <button
            id="btn-share"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-bold text-sm text-[var(--text)] shadow-sm transition-all duration-300 hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-95"
          >
            <span>🔗</span>
            <span>اشتراک‌گذاری</span>
          </button>

          <button
            id="btn-compare-open"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--primary)] font-bold text-sm text-white shadow-md transition-all duration-300 hover:opacity-90 active:scale-95"
          >
            <span>⚖️</span>
            <span>مقایسه با شهر دیگر</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind Hero actions
  const favBtn = document.getElementById("btn-favorite");
  if (favBtn) {
    favBtn.onclick = () => {
      const nowFav = toggleFavorite(city);
      const favIcon = document.getElementById("fav-icon");
      const favText = document.getElementById("fav-text");
      if (nowFav) {
        favIcon.textContent = "♥";
        favIcon.classList.add("text-red-500");
        favText.textContent = "در علاقه‌مندی‌ها";
        showToast(`شهر ${city.name} به علاقه‌مندی‌ها افزوده شد.`);
      } else {
        favIcon.textContent = "♡";
        favIcon.classList.remove("text-red-500");
        favText.textContent = "افزودن به علاقه‌مندی‌ها";
        showToast(`شهر ${city.name} از علاقه‌مندی‌ها حذف شد.`);
      }
    };
  }

  const shareBtn = document.getElementById("btn-share");
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `اطلاعات جامع شهر ${city.name} در شهرآوا`,
            text: `کاوش کامل آب‌وهوا، جاذبه‌ها و آمار شهر ${city.name} در شهرآوا`,
            url: shareUrl,
          });
          return;
        } catch (e) {
          // Fall back to clipboard if user dismissed share sheet
        }
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("لینک شهر کپی شد.");
      } catch (err) {
        showToast("خطا در کپی لینک", "error");
      }
    };
  }

  const compareBtn = document.getElementById("btn-compare-open");
  if (compareBtn) {
    compareBtn.onclick = () => openCompareModal(city);
  }
}

// ------------------------------------------------------------------
// CITY STATISTICS
// ------------------------------------------------------------------
function renderCityStatistics(city, weather) {
  const container = document.getElementById("city-statistics-container");
  if (!container) return;

  const timezoneStr = weather?.timezone || city.timezone || "اطلاعات در دسترس نیست";
  const elevationStr = weather?.elevation !== undefined ? `${Math.round(weather.elevation)} متر` : "اطلاعات در دسترس نیست";
  const coordsStr = formatCoordinates(city.lat, city.lon);
  const populationStr = formatPopulation(city.population);

  container.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <span class="text-xs font-semibold text-[var(--muted)] block">جمعیت</span>
        <span class="mt-2 text-xl font-black text-[var(--text)] block truncate">${populationStr}</span>
        <span class="mt-1 text-[11px] text-[var(--muted)] block">منبع معتبر داده</span>
      </div>

      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <span class="text-xs font-semibold text-[var(--muted)] block">ارتفاع از سطح دریا</span>
        <span class="mt-2 text-xl font-black text-[var(--text)] block">${elevationStr}</span>
        <span class="mt-1 text-[11px] text-[var(--muted)] block">ارتفاع توپوگرافی</span>
      </div>

      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <span class="text-xs font-semibold text-[var(--muted)] block">منطقه زمانی</span>
        <span class="mt-2 text-base font-bold text-[var(--text)] block truncate font-mono">${timezoneStr}</span>
        <span class="mt-1 text-[11px] text-[var(--muted)] block">استاندارد IANA</span>
      </div>

      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <span class="text-xs font-semibold text-[var(--muted)] block">مختصات جغرافیایی</span>
        <span class="mt-2 text-sm font-bold text-[var(--text)] block truncate font-mono">${coordsStr}</span>
        <span class="mt-1 text-[11px] text-[var(--muted)] block">عرض و طول جغرافیایی</span>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------
// COUNTRY INFORMATION
// ------------------------------------------------------------------
function renderCountryCard(country) {
  const container = document.getElementById("country-card-container");
  if (!container) return;

  container.innerHTML = `
    <div class="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 shadow-sm">
      <div class="flex items-center gap-4 mb-6">
        <span class="text-4xl">${country.flag}</span>
        <div>
          <h3 class="text-2xl font-black text-[var(--text)]">${country.nameNative || country.name}</h3>
          <p class="text-sm font-medium text-[var(--muted)] font-sans">${country.name}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
        <div class="rounded-xl bg-[var(--surface)] p-3 border border-[var(--border)]">
          <span class="text-xs text-[var(--muted)] block">پایتخت</span>
          <span class="font-bold text-[var(--text)] mt-1 block">${country.capital}</span>
        </div>

        <div class="rounded-xl bg-[var(--surface)] p-3 border border-[var(--border)]">
          <span class="text-xs text-[var(--muted)] block">قاره / منطقه</span>
          <span class="font-bold text-[var(--text)] mt-1 block">${country.continent}</span>
        </div>

        <div class="rounded-xl bg-[var(--surface)] p-3 border border-[var(--border)]">
          <span class="text-xs text-[var(--muted)] block">کد کشور</span>
          <span class="font-bold text-[var(--text)] mt-1 block font-mono">${country.code}</span>
        </div>

        <div class="rounded-xl bg-[var(--surface)] p-3 border border-[var(--border)]">
          <span class="text-xs text-[var(--muted)] block">واحد پول</span>
          <span class="font-bold text-[var(--text)] mt-1 block">${country.currency}</span>
        </div>

        <div class="rounded-xl bg-[var(--surface)] p-3 border border-[var(--border)]">
          <span class="text-xs text-[var(--muted)] block">زبان‌های رسمی</span>
          <span class="font-bold text-[var(--text)] mt-1 block truncate" title="${country.languages}">${country.languages}</span>
        </div>

        <div class="rounded-xl bg-[var(--surface)] p-3 border border-[var(--border)]">
          <span class="text-xs text-[var(--muted)] block">پیش‌شماره تلفن</span>
          <span class="font-bold text-[var(--text)] mt-1 block font-mono dir-ltr text-right">${country.phoneCode}</span>
        </div>

        <div class="rounded-xl bg-[var(--surface)] p-3 border border-[var(--border)] col-span-2">
          <span class="text-xs text-[var(--muted)] block">مناطق زمانی کشور</span>
          <span class="font-bold text-[var(--text)] mt-1 block truncate font-mono text-xs" title="${country.timezones}">${country.timezones}</span>
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------
// WEATHER SECTION (Current + 7-Day Forecast)
// ------------------------------------------------------------------
function renderWeatherSection(city, weather) {
  const container = document.getElementById("weather-container");
  if (!container) return;

  const current = weather.current;
  const forecast = weather.forecast;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Current Weather Hero Card -->
      <div class="overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-blue-600/10 via-transparent to-amber-500/10 p-6 md:p-8 shadow-md backdrop-blur-md">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div class="flex items-center gap-6">
            <span class="text-6xl md:text-7xl filter drop-shadow-md">${current.icon}</span>
            <div>
              <span class="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">وضعیت آب‌وهوای ${city.name}</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-5xl md:text-6xl font-black text-[var(--text)]">${current.temp}°C</span>
                <span class="text-sm font-semibold text-[var(--muted)]">احساس دما: ${current.apparentTemp}°C</span>
              </div>
              <p class="mt-1 text-lg font-bold text-[var(--text)]">${current.desc}</p>
            </div>
          </div>

          <!-- Micro metrics grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 border-t md:border-t-0 md:border-r border-[var(--border)] pt-4 md:pt-0 md:pr-6">
            <div class="rounded-xl bg-[var(--card)] p-3 border border-[var(--border)] text-center">
              <span class="text-xs text-[var(--muted)] block">رطوبت هوا</span>
              <span class="text-lg font-black text-[var(--text)] mt-0.5 block">${current.humidity}%</span>
            </div>

            <div class="rounded-xl bg-[var(--card)] p-3 border border-[var(--border)] text-center">
              <span class="text-xs text-[var(--muted)] block">سرعت باد</span>
              <span class="text-lg font-black text-[var(--text)] mt-0.5 block">${current.windSpeed} km/h</span>
            </div>

            <div class="rounded-xl bg-[var(--card)] p-3 border border-[var(--border)] text-center">
              <span class="text-xs text-[var(--muted)] block">طلوع خورشید</span>
              <span class="text-base font-bold text-[var(--text)] mt-1 block font-mono">${weather.todaySunrise}</span>
            </div>

            <div class="rounded-xl bg-[var(--card)] p-3 border border-[var(--border)] text-center">
              <span class="text-xs text-[var(--muted)] block">غروب خورشید</span>
              <span class="text-base font-bold text-[var(--text)] mt-1 block font-mono">${weather.todaySunset}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 7-Day Forecast Section -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-[var(--text)]">پیش‌بینی ۷ روز آینده</h3>
          <span class="text-xs text-[var(--muted)]">بروزرسانی زنده بر اساس Open-Meteo</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto pb-2">
          ${forecast
            .map(
              (day) => `
            <div class="flex flex-col items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)] min-w-[120px]">
              <span class="text-xs font-bold text-[var(--text)]">${day.dayName}</span>
              <span class="text-3xl my-3">${day.icon}</span>
              <span class="text-[11px] font-semibold text-[var(--muted)] line-clamp-1 mb-2">${day.desc}</span>
              
              <div class="w-full border-t border-[var(--border)] pt-2 mt-auto">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-[var(--primary)]">${day.maxTemp}°</span>
                  <span class="text-[var(--muted)]">${day.minTemp}°</span>
                </div>
                <div class="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-blue-500 font-medium">
                  <span>💧</span>
                  <span>${day.precipProb}%</span>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderWeatherError() {
  const container = document.getElementById("weather-container");
  if (!container) return;
  container.innerHTML = `
    <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
      اطلاعات آب‌وهوا در حال حاضر در دسترس نیست.
    </div>
  `;
}

// ------------------------------------------------------------------
// ABOUT CITY
// ------------------------------------------------------------------
function renderAboutCity(city, desc) {
  const container = document.getElementById("about-city-container");
  if (!container) return;

  if (!desc || !desc.extract) {
    container.innerHTML = `
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
        توضیحاتی برای این شهر پیدا نشد.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-2xl font-black text-[var(--text)]">درباره ${city.name}</h3>
        <span class="text-xs px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
          منبع: دانشنامه ویکی‌پدیا (${desc.lang === "fa" ? "فارسی" : "انگلیسی"})
        </span>
      </div>

      <div class="flex flex-col md:flex-row gap-6 items-start">
        ${
          desc.thumbnail
            ? `
          <div class="w-full md:w-64 flex-shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] aspect-video md:aspect-[4/3]">
            <img src="${desc.thumbnail}" alt="${city.name}" class="w-full h-full object-cover" loading="lazy" />
          </div>
        `
            : ""
        }
        <div class="flex-1">
          <p class="text-base leading-8 text-[var(--text)] text-justify">
            ${desc.extract}
          </p>
          ${
            desc.pageUrl
              ? `
            <a href="${desc.pageUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-[var(--primary)] hover:underline">
              <span>مطالعه مقاله کامل در ویکی‌پدیا</span>
              <span>←</span>
            </a>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function renderAboutError() {
  const container = document.getElementById("about-city-container");
  if (!container) return;
  container.innerHTML = `
    <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
      اطلاعات توضیحات شهر در حال حاضر در دسترس نیست.
    </div>
  `;
}

// ------------------------------------------------------------------
// TOURIST ATTRACTIONS & CATEGORIES
// ------------------------------------------------------------------
function renderAttractions(attractions) {
  const container = document.getElementById("attractions-container");
  if (!container) return;

  if (!attractions || attractions.length === 0) {
    container.innerHTML = `
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
        جاذبه گردشگری ثبت‌شده‌ای برای این شهر یافت نشد.
      </div>
    `;
    return;
  }

  const categories = [
    "همه",
    "تاریخی",
    "فرهنگی",
    "موزه",
    "پارک",
    "معماری",
    "مذهبی",
    "تفریحی",
    "طبیعت",
  ];

  const filteredAttractions =
    currentCategoryFilter === "همه"
      ? attractions
      : attractions.filter((a) => a.category === currentCategoryFilter);

  container.innerHTML = `
    <div>
      <!-- Category filter pills -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        ${categories
          .map((cat) => {
            const count =
              cat === "همه"
                ? attractions.length
                : attractions.filter((a) => a.category === cat).length;
            if (cat !== "همه" && count === 0) return "";
            const active = currentCategoryFilter === cat;
            return `
            <button
              type="button"
              data-cat="${cat}"
              class="cat-filter-btn px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                active
                  ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                  : "bg-[var(--card)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--text)]"
              }"
            >
              ${cat} (${count})
            </button>
          `;
          })
          .join("")}
      </div>

      <!-- Attractions Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        ${filteredAttractions
          .map(
            (att, idx) => `
          <div class="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col">
            <div class="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              ${
                att.image
                  ? `<img src="${att.image}" alt="${att.name}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />`
                  : `<div class="h-full w-full flex items-center justify-center text-4xl text-slate-400">🏛️</div>`
              }
              <span class="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-lg border backdrop-blur-md ${
                att.categoryColor
              }">
                ${att.category}
              </span>
              <span class="absolute bottom-3 left-3 text-[11px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm">
                ${att.distanceKm} کیلومتر
              </span>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 class="font-bold text-base text-[var(--text)] line-clamp-1">${att.name}</h4>
                <p class="mt-2 text-xs leading-6 text-[var(--muted)] line-clamp-2">${att.description}</p>
              </div>

              <div class="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-lat="${att.lat}"
                  data-lon="${att.lon}"
                  data-title="${att.name}"
                  class="btn-pan-map text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  <span>📍</span>
                  <span>مشاهده روی نقشه</span>
                </button>
                <a
                  href="${att.mapUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[11px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  جزئیات ↗
                </a>
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  // Bind category clicks
  container.querySelectorAll(".cat-filter-btn").forEach((btn) => {
    btn.onclick = () => {
      currentCategoryFilter = btn.getAttribute("data-cat");
      renderAttractions(allAttractions);
    };
  });

  // Bind Pan-to-Map clicks
  container.querySelectorAll(".btn-pan-map").forEach((btn) => {
    btn.onclick = () => {
      const lat = parseFloat(btn.getAttribute("data-lat"));
      const lon = parseFloat(btn.getAttribute("data-lon"));
      const title = btn.getAttribute("data-title");
      if (leafletMap && !isNaN(lat) && !isNaN(lon)) {
        leafletMap.flyTo([lat, lon], 15, { duration: 1.2 });
        const marker = mapMarkers.find((m) => m.options?.title === title);
        if (marker) marker.openPopup();

        // Scroll to map
        const mapSection = document.getElementById("interactive-map-section");
        if (mapSection) mapSection.scrollIntoView({ behavior: "smooth" });
      }
    };
  });
}

function renderAttractionsError() {
  const container = document.getElementById("attractions-container");
  if (!container) return;
  container.innerHTML = `
    <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
      اطلاعات جاذبه‌های گردشگری در حال حاضر در دسترس نیست.
    </div>
  `;
}

// ------------------------------------------------------------------
// PHOTO GALLERY & LIGHTBOX
// ------------------------------------------------------------------
function renderPhotoGallery(photos, city) {
  const container = document.getElementById("photo-gallery-container");
  if (!container) return;

  if (!photos || photos.length === 0) {
    container.innerHTML = `
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
        تصویری برای این شهر پیدا نشد.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      ${photos
        .map(
          (p, i) => `
        <div
          data-photo-index="${i}"
          class="gallery-thumbnail-item group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] cursor-pointer shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <img
            src="${p.url}"
            alt="${p.title}"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white">
            <span class="text-xs font-bold line-clamp-1">${p.title}</span>
            <span class="text-[10px] text-white/70 mt-0.5 line-clamp-1">${p.credit}</span>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  // Bind clicks for Lightbox
  container.querySelectorAll(".gallery-thumbnail-item").forEach((el) => {
    el.onclick = () => {
      const idx = parseInt(el.getAttribute("data-photo-index"), 10);
      openLightbox(idx);
    };
  });
}

function renderPhotosError() {
  const container = document.getElementById("photo-gallery-container");
  if (!container) return;
  container.innerHTML = `
    <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
      تصویری برای این شهر پیدا نشد.
    </div>
  `;
}

// Lightbox Modal Implementation
function openLightbox(index) {
  if (!galleryPhotos || galleryPhotos.length === 0) return;
  currentPhotoIndex = index;

  let modal = document.getElementById("lightbox-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "lightbox-modal";
    modal.className = "fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4";
    modal.innerHTML = `
      <div class="relative w-full max-w-5xl flex flex-col items-center">
        <button id="lb-close" class="absolute top-2 right-2 text-white bg-white/20 hover:bg-white/40 p-2.5 rounded-full z-20">✕</button>
        <button id="lb-prev" class="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-3 rounded-full z-20 text-xl font-bold">‹</button>
        <button id="lb-next" class="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-3 rounded-full z-20 text-xl font-bold">›</button>

        <div class="max-h-[75vh] w-full flex items-center justify-center overflow-hidden rounded-2xl">
          <img id="lb-img" src="" alt="" class="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl" />
        </div>

        <div class="mt-4 text-center text-white max-w-xl">
          <h4 id="lb-title" class="text-base font-bold"></h4>
          <p id="lb-credit" class="text-xs text-white/70 mt-1"></p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#lb-close").onclick = closeLightbox;
    modal.querySelector("#lb-prev").onclick = () => navigateLightbox(-1);
    modal.querySelector("#lb-next").onclick = () => navigateLightbox(1);
    modal.onclick = (e) => {
      if (e.target === modal) closeLightbox();
    };

    window.addEventListener("keydown", handleLightboxKeys);
  }

  updateLightboxContent();
  modal.classList.remove("hidden");
}

function updateLightboxContent() {
  const photo = galleryPhotos[currentPhotoIndex];
  if (!photo) return;
  const img = document.getElementById("lb-img");
  const title = document.getElementById("lb-title");
  const credit = document.getElementById("lb-credit");
  if (img) img.src = photo.fullUrl || photo.url;
  if (title) title.textContent = photo.title;
  if (credit) credit.textContent = photo.credit;
}

function navigateLightbox(dir) {
  currentPhotoIndex = (currentPhotoIndex + dir + galleryPhotos.length) % galleryPhotos.length;
  updateLightboxContent();
}

function closeLightbox() {
  const modal = document.getElementById("lightbox-modal");
  if (modal) modal.classList.add("hidden");
  window.removeEventListener("keydown", handleLightboxKeys);
}

function handleLightboxKeys(e) {
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") navigateLightbox(1);
  if (e.key === "ArrowRight") navigateLightbox(-1);
}

// ------------------------------------------------------------------
// INTERACTIVE MAP (LEAFLET + OSM)
// ------------------------------------------------------------------
function initInteractiveMap(city, attractions) {
  const mapElement = document.getElementById("leaflet-map");
  if (!mapElement) return;

  // Check if Leaflet is loaded
  if (typeof L === "undefined") {
    mapElement.innerHTML = `
      <div class="h-full w-full flex items-center justify-center text-sm text-[var(--muted)]">
        در حال بارگذاری نقشه...
      </div>
    `;
    return;
  }

  mapElement.innerHTML = "";

  leafletMap = L.map(mapElement, {
    center: [city.lat, city.lon],
    zoom: 13,
    scrollWheelZoom: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap);

  // 1. City Center Marker
  const cityCenterIcon = L.divIcon({
    className: "custom-city-marker",
    html: `<div style="background-color:#2563eb; color:white; width:34px; height:34px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.3); font-size:16px;">🔵</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  const cityMarker = L.marker([city.lat, city.lon], {
    icon: cityCenterIcon,
    title: city.name,
  }).addTo(leafletMap);

  cityMarker.bindPopup(`
    <div style="font-family:'Vazirmatn',sans-serif; text-align:right; direction:rtl; padding:4px;">
      <b style="font-size:14px; color:#0f172a;">مرکز شهر ${city.name}</b>
      <p style="font-size:11px; color:#64748b; margin-top:4px;">مختصات: ${city.lat.toFixed(4)}, ${city.lon.toFixed(4)}</p>
    </div>
  `);

  mapMarkers.push(cityMarker);

  // 2. Attractions Markers
  attractions.forEach((att) => {
    const attIcon = L.divIcon({
      className: "custom-attraction-marker",
      html: `<div style="background-color:#f59e0b; color:white; width:28px; height:28px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25); font-size:13px;">📍</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([att.lat, att.lon], {
      icon: attIcon,
      title: att.name,
    }).addTo(leafletMap);

    marker.bindPopup(`
      <div style="font-family:'Vazirmatn',sans-serif; text-align:right; direction:rtl; max-width:220px; padding:2px;">
        ${att.image ? `<img src="${att.image}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; margin-bottom:6px;" />` : ""}
        <b style="font-size:13px; color:#0f172a; display:block;">${att.name}</b>
        <span style="display:inline-block; font-size:10px; background:#fef3c7; color:#b45309; padding:1px 6px; border-radius:4px; margin-top:3px;">${att.category}</span>
        <p style="font-size:11px; color:#64748b; margin-top:4px;">فاصله: ${att.distanceKm} کیلومتر</p>
      </div>
    `);

    mapMarkers.push(marker);
  });
}

// ------------------------------------------------------------------
// LIVE LOCAL TIME CLOCK
// ------------------------------------------------------------------
function startLiveClock(timezone) {
  const timeEl = document.getElementById("live-local-time");
  if (!timeEl) return;

  const update = () => {
    timeEl.textContent = getLocalTime(timezone);
  };
  update();
  localTimeInterval = setInterval(update, 1000);
}

// ------------------------------------------------------------------
// RECENT SEARCHES BAR
// ------------------------------------------------------------------
function updateRecentSearchesBar() {
  const container = document.getElementById("recent-searches-container");
  if (!container) return;

  const recents = getRecentSearches();
  if (recents.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
      <span class="text-[var(--muted)] flex-shrink-0">جستجوهای اخیر:</span>
      ${recents
        .map(
          (cityName) => `
        <button
          type="button"
          data-city="${cityName}"
          class="recent-search-pill flex-shrink-0 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--primary)] transition-colors"
        >
          ${cityName}
        </button>
      `
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll(".recent-search-pill").forEach((btn) => {
    btn.onclick = () => {
      const q = btn.getAttribute("data-city");
      loadCityIntelligence(q);
    };
  });
}

// ------------------------------------------------------------------
// COMPARE CITIES TOOL / MODAL
// ------------------------------------------------------------------
function openCompareModal(cityA) {
  let modal = document.getElementById("compare-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "compare-modal";
    modal.className = "fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto";
    modal.innerHTML = `
      <div class="relative w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 shadow-2xl my-8">
        <button id="close-compare" class="absolute top-5 left-5 text-[var(--muted)] hover:text-[var(--text)] text-xl font-bold p-2">✕</button>

        <h3 class="text-2xl font-black text-[var(--text)] text-center">مقایسه شهرها (City Compare)</h3>
        <p class="text-xs text-[var(--muted)] text-center mt-1">مقایسه دو شهر در شاخص‌های آب‌وهوا، جمعیت، موقعیت و ویژگی‌ها</p>

        <!-- Search second city -->
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            id="compare-city-b-input"
            type="search"
            placeholder="نام شهر دوم را وارد کنید (مثلاً Tokyo, Paris, Istanbul)..."
            class="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
          />
          <button
            id="btn-run-compare"
            type="button"
            class="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            مقایسه کن
          </button>
        </div>

        <!-- Comparison Table Container -->
        <div id="compare-results-container" class="mt-6">
          <p class="text-center text-sm text-[var(--muted)] py-8">شهر دوم را برای مقایسه با ${cityA.name} جستجو کنید.</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#close-compare").onclick = () => modal.classList.add("hidden");
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    };

    const runBtn = modal.querySelector("#btn-run-compare");
    const inputB = modal.querySelector("#compare-city-b-input");

    const execCompare = async () => {
      const qB = inputB.value.trim();
      if (!qB) return;
      await runComparison(cityA, qB);
    };

    runBtn.onclick = execCompare;
    inputB.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        execCompare();
      }
    };
  }

  modal.classList.remove("hidden");
}

async function runComparison(cityA, queryB) {
  const container = document.getElementById("compare-results-container");
  if (!container) return;

  container.innerHTML = `
    <div class="py-12 text-center text-sm text-[var(--muted)]">
      در حال دریافت اطلاعات شهر دوم...
    </div>
  `;

  try {
    const cityB = await searchCityDetails(queryB);
    if (!cityB) {
      container.innerHTML = `
        <div class="py-8 text-center text-sm text-red-500">
          شهری با نام «${queryB}» یافت نشد. لطفاً نام معتبری وارد کنید.
        </div>
      `;
      return;
    }

    const [countryB, weatherB, weatherA] = await Promise.all([
      getCountryInfo(cityB.countryCode, cityB.country),
      fetchWeatherForecast(cityB.lat, cityB.lon).catch(() => null),
      cityA.weather || fetchWeatherForecast(cityA.lat, cityA.lon).catch(() => null),
    ]);

    const countryA = cityA.countryInfo || (await getCountryInfo(cityA.countryCode, cityA.country));

    container.innerHTML = `
      <div class="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div class="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--card)] p-4 text-center font-bold text-sm">
          <div class="text-[var(--primary)] text-base">${cityA.name} (${cityA.country})</div>
          <div class="text-[var(--muted)]">شاخص مقایسه</div>
          <div class="text-[var(--primary)] text-base">${cityB.name} (${cityB.country})</div>
        </div>

        <div class="divide-y divide-[var(--border)] text-sm">
          <div class="grid grid-cols-3 p-3.5 text-center">
            <span class="font-bold text-[var(--text)]">${weatherA?.current ? `${weatherA.current.temp}°C (${weatherA.current.desc})` : "-"}</span>
            <span class="text-[var(--muted)] text-xs">دما و وضعیت فعلی</span>
            <span class="font-bold text-[var(--text)]">${weatherB?.current ? `${weatherB.current.temp}°C (${weatherB.current.desc})` : "-"}</span>
          </div>

          <div class="grid grid-cols-3 p-3.5 text-center">
            <span class="font-bold text-[var(--text)]">${weatherA?.current ? `${weatherA.current.apparentTemp}°C` : "-"}</span>
            <span class="text-[var(--muted)] text-xs">احساس دما</span>
            <span class="font-bold text-[var(--text)]">${weatherB?.current ? `${weatherB.current.apparentTemp}°C` : "-"}</span>
          </div>

          <div class="grid grid-cols-3 p-3.5 text-center">
            <span class="font-bold text-[var(--text)]">${formatPopulation(cityA.population)}</span>
            <span class="text-[var(--muted)] text-xs">جمعیت</span>
            <span class="font-bold text-[var(--text)]">${formatPopulation(cityB.population)}</span>
          </div>

          <div class="grid grid-cols-3 p-3.5 text-center">
            <span class="font-mono text-xs font-bold text-[var(--text)]">${weatherA?.timezone || cityA.timezone || "-"}</span>
            <span class="text-[var(--muted)] text-xs">منطقه زمانی</span>
            <span class="font-mono text-xs font-bold text-[var(--text)]">${weatherB?.timezone || cityB.timezone || "-"}</span>
          </div>

          <div class="grid grid-cols-3 p-3.5 text-center">
            <span class="font-bold text-[var(--text)]">${countryA.continent}</span>
            <span class="text-[var(--muted)] text-xs">قاره</span>
            <span class="font-bold text-[var(--text)]">${countryB.continent}</span>
          </div>

          <div class="grid grid-cols-3 p-3.5 text-center">
            <span class="font-bold text-[var(--text)]">${countryA.currency}</span>
            <span class="text-[var(--muted)] text-xs">واحد پول</span>
            <span class="font-bold text-[var(--text)]">${countryB.currency}</span>
          </div>

          <div class="grid grid-cols-3 p-3.5 text-center">
            <span class="font-mono text-xs text-[var(--text)]">${formatCoordinates(cityA.lat, cityA.lon)}</span>
            <span class="text-[var(--muted)] text-xs">مختصات</span>
            <span class="font-mono text-xs text-[var(--text)]">${formatCoordinates(cityB.lat, cityB.lon)}</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Comparison error:", err);
    container.innerHTML = `
      <div class="py-8 text-center text-sm text-red-500">
        خطا در دریافت اطلاعات مقایسه. لطفاً مجدداً امتحان کنید.
      </div>
    `;
  }
}

// ------------------------------------------------------------------
// SKELETON LOADERS
// ------------------------------------------------------------------
function showSkeletonLoaders() {
  const heroEl = document.getElementById("city-hero-container");
  if (heroEl) {
    heroEl.innerHTML = `
      <div class="animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 md:p-12 space-y-4">
        <div class="h-6 w-36 rounded-full bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-12 w-64 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-5 w-44 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
      </div>
    `;
  }

  const statsEl = document.getElementById("city-statistics-container");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        <div class="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
      </div>
    `;
  }

  const countryEl = document.getElementById("country-card-container");
  if (countryEl) {
    countryEl.innerHTML = `
      <div class="animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 h-48"></div>
    `;
  }

  const weatherEl = document.getElementById("weather-container");
  if (weatherEl) {
    weatherEl.innerHTML = `
      <div class="animate-pulse space-y-4">
        <div class="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div class="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        </div>
      </div>
    `;
  }

  const aboutEl = document.getElementById("about-city-container");
  if (aboutEl) {
    aboutEl.innerHTML = `
      <div class="animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 h-48"></div>
    `;
  }

  const attractionsEl = document.getElementById("attractions-container");
  if (attractionsEl) {
    attractionsEl.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
        <div class="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
      </div>
    `;
  }

  const galleryEl = document.getElementById("photo-gallery-container");
  if (galleryEl) {
    galleryEl.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
        <div class="aspect-[4/3] rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="aspect-[4/3] rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="aspect-[4/3] rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div class="aspect-[4/3] rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
      </div>
    `;
  }
}

function showCityNotFoundError(query) {
  const main = document.getElementById("app");
  if (!main) return;
  main.innerHTML = `
    <section class="max-w-4xl mx-auto px-6 py-20 text-center">
      <div class="text-6xl mb-4">🔍</div>
      <h2 class="text-3xl font-black text-[var(--text)]">شهری با نام «${query}» یافت نشد</h2>
      <p class="mt-3 text-base text-[var(--muted)]">لطفاً املای نام شهر را بررسی کنید یا شهر دیگری را جستجو فرمایید.</p>
      <div class="mt-8 flex justify-center gap-3">
        <a href="/" class="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm">بازگشت به صفحه اصلی</a>
        <a href="/cities/?q=تهران" class="px-6 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] font-bold text-sm">مشاهده تهران</a>
      </div>
    </section>
  `;
}
