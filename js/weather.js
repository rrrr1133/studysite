// 무료(키 불필요) Open-Meteo API로 현재 날씨를 가져와 30분 캐시한다.
// 위치는 브라우저 Geolocation을 시도하고, 거부/실패하면 서울 좌표로 대체한다.

const SEOUL = { lat: 37.5665, lon: 126.978 };
const CACHE_MS = 30 * 60 * 1000;

let cached = null; // { tempC, code, fetchedAt }
let inFlight = null;

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(SEOUL);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(SEOUL),
      { timeout: 5000 }
    );
  });
}

async function fetchWeather() {
  const { lat, lon } = await getPosition();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    tempC: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    fetchedAt: Date.now()
  };
}

export function getCachedWeather() {
  return cached;
}

// 캐시가 없거나 오래됐으면 새로 가져온 뒤 onReady(weather)를 호출한다.
export function ensureWeather(onReady) {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return;
  if (inFlight) return;
  inFlight = fetchWeather()
    .then((w) => { cached = w; onReady(w); })
    .catch(() => {})
    .finally(() => { inFlight = null; });
}

// WMO weather_code -> 카테고리
function category(code) {
  if (code === 0) return "clear";
  if ([1, 2].includes(code)) return "partly";
  if (code === 3) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunder";
  return "cloudy";
}

const ICONS = {
  clear: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#ffd166"/><g stroke="#ffd166" stroke-width="2" stroke-linecap="round"><path d="M12 1v3M12 20v3M23 12h-3M4 12H1M20.5 3.5l-2 2M5.5 18.5l-2 2M20.5 20.5l-2-2M5.5 5.5l-2-2"/></g></svg>`,
  partly: `<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="4" fill="#ffd166"/><path d="M6 18a5 5 0 0 1 1-9.9A6 6 0 0 1 18.5 11 4.5 4.5 0 0 1 18 18H6Z" fill="#cfe3f2"/></svg>`,
  cloudy: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 18a5 5 0 0 1 .5-10A6.5 6.5 0 0 1 19 10.5 4.5 4.5 0 0 1 18.5 18H6Z" fill="#cfe3f2"/></svg>`,
  fog: `<svg viewBox="0 0 24 24" fill="none" stroke="#b9c7d1" stroke-width="2" stroke-linecap="round"><path d="M4 8h16M2 12h20M4 16h16M6 20h12"/></svg>`,
  rain: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 15a5 5 0 0 1 .5-10A6.5 6.5 0 0 1 19 7.5 4.5 4.5 0 0 1 18.5 15H6Z" fill="#cfe3f2"/><g stroke="#2fa8e0" stroke-width="2" stroke-linecap="round"><path d="M8 18l-1 3M13 18l-1 3M18 18l-1 3"/></g></svg>`,
  snow: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 13a5 5 0 0 1 .5-10A6.5 6.5 0 0 1 19 5.5 4.5 4.5 0 0 1 18.5 13H6Z" fill="#e6eef3"/><g stroke="#8fd8f7" stroke-width="2" stroke-linecap="round"><path d="M9 17v5M9 18.5l-2 1.5M9 18.5l2 1.5M15 17v5M15 18.5l-2 1.5M15 18.5l2 1.5"/></g></svg>`,
  thunder: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 13a5 5 0 0 1 .5-10A6.5 6.5 0 0 1 19 5.5 4.5 4.5 0 0 1 18.5 13H6Z" fill="#cfe3f2"/><path d="M13 13l-3 5h3l-2 4 5-6h-3l2-3z" fill="#ffd166"/></svg>`
};

export function weatherIcon(code) {
  return ICONS[category(code)] || ICONS.cloudy;
}
