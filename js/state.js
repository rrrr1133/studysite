// 전역 상태 저장소 - 아주 단순한 pub/sub. Firestore 리스너들이 이 state를 갱신하고,
// render()가 호출되면 현재 라우트에 맞는 페이지를 다시 그린다.
import { DEFAULT_SETTINGS } from "./tracker-math.js";

export const state = {
  user: null,
  authReady: false,
  settings: { ...DEFAULT_SETTINGS },
  checkins: {},          // { "2026-07-27": {...} }
  progress: { jp1000: {}, karugaru: {} },
  data: { jp1000: null, karugaru: null, numbers: null }, // 정적 JSON, 최초 1회 로드
  route: "#/home"
};

let renderFn = () => {};
export function setRenderer(fn) { renderFn = fn; }
export function rerender() { renderFn(); }

export function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

export async function loadStaticData() {
  if (state.data.jp1000) return;
  const [jp1000, karugaru, numbers] = await Promise.all([
    fetch("./data/jp1000.json").then((r) => r.json()),
    fetch("./data/karugaru.json").then((r) => r.json()),
    fetch("./data/numbers.json").then((r) => r.json())
  ]);
  state.data.jp1000 = jp1000;
  state.data.karugaru = karugaru;
  state.data.numbers = numbers;
}
