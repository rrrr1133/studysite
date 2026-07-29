import { state, rerender, toast } from "../state.js";
import { el, navigate } from "../dom.js";
import {
  elapsedWeek, currentPhase, thisWeekTargetWeight, dDay, formatDday,
  aggregateCheckins, weightHistory, dailyComplianceHistory, todayISO
} from "../tracker-math.js";
import { saveCheckin, saveSettings } from "../firestore.js";
import { isExportDue, markExported } from "../auto-export.js";
import { exportTrackerXlsx } from "../export-xlsx.js";
import { ensureWeather, getCachedWeather, weatherIcon } from "../weather.js";

function quoteOfTheDay(quotes) {
  const epoch = new Date(2020, 0, 1);
  const days = Math.floor((new Date() - epoch) / 86400000);
  const idx = ((days % quotes.length) + quotes.length) % quotes.length;
  return quotes[idx];
}

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateKR(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KR[d.getDay()]})`;
}

function formatTimeKR(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const HERO_SVG = `
<svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1b2a"/>
      <stop offset="55%" stop-color="#123a5e"/>
      <stop offset="100%" stop-color="#2fa8e0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#skyGrad)"/>
  <circle cx="150" cy="70" r="2" fill="#ffffff" opacity=".8"/>
  <circle cx="260" cy="110" r="1.5" fill="#ffffff" opacity=".6"/>
  <circle cx="420" cy="60" r="2" fill="#ffffff" opacity=".7"/>
  <circle cx="600" cy="90" r="1.5" fill="#ffffff" opacity=".5"/>
  <circle cx="820" cy="55" r="2" fill="#ffffff" opacity=".8"/>
  <circle cx="980" cy="100" r="1.5" fill="#ffffff" opacity=".6"/>
  <circle cx="1100" cy="70" r="2" fill="#ffffff" opacity=".7"/>
  <circle cx="70" cy="150" r="60" fill="#ffe8b8" opacity=".18"/>
  <path d="M300 340 L470 150 L520 195 L560 150 L740 340 Z" fill="#274b6d" opacity=".9"/>
  <path d="M470 150 L520 195 L560 150 L545 168 L515 168 Z" fill="#e8f3fa" opacity=".95"/>
  <g opacity=".85">
    <rect x="1000" y="230" width="18" height="110" fill="#7a2e2e"/>
    <rect x="1110" y="230" width="18" height="110" fill="#7a2e2e"/>
    <rect x="985" y="230" width="158" height="16" fill="#7a2e2e"/>
    <rect x="995" y="260" width="138" height="12" fill="#7a2e2e"/>
  </g>
  <path d="M0 360 Q150 330 300 355 T600 350 T900 358 T1200 345 L1200 400 L0 400 Z" fill="#0a2740" opacity=".9"/>
</svg>`;

let clockTimer = null;

function toggleManual(field) {
  const uid = state.user.uid;
  const today = todayISO();
  const cur = state.checkins[today]?.[field]?.done || false;
  const patch = { [field]: { done: !cur } };
  state.checkins[today] = { ...(state.checkins[today] || {}), ...patch };
  rerender();
  saveCheckin(uid, today, patch);
}

export function renderHome(root) {
  const s = state.settings;
  const today = todayISO();
  const c = state.checkins[today] || {};
  const agg = aggregateCheckins(state.checkins);
  const phase = currentPhase(s, today);
  const week = elapsedWeek(s, today);
  const weekTarget = thisWeekTargetWeight(s, today);
  const hist = weightHistory(state.checkins);

  clearInterval(clockTimer);
  const now = new Date();

  const hero = el("div", "home-hero");
  hero.innerHTML = `
    <div class="hero-bg">${HERO_SVG}</div>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="hero-text">
        <h1>오늘도 한 걸음, 일본 IT 취업 🇯🇵</h1>
        <div class="sub">${today} · 트래커 ${week}주차</div>
      </div>
      <div class="hero-widget">
        <div class="hw-date">${formatDateKR(now)}</div>
        <div class="hw-time">${formatTimeKR(now)}</div>
        <div class="hw-weather"></div>
      </div>
    </div>
  `;
  root.appendChild(hero);

  const timeEl = hero.querySelector(".hw-time");
  clockTimer = setInterval(() => {
    if (!timeEl.isConnected) { clearInterval(clockTimer); return; }
    timeEl.textContent = formatTimeKR(new Date());
  }, 10000);

  const weatherEl = hero.querySelector(".hw-weather");
  function renderWeather(w) {
    if (!w) { weatherEl.innerHTML = ""; return; }
    weatherEl.innerHTML = `${weatherIcon(w.code)}<span>${w.tempC}°C</span>`;
  }
  renderWeather(getCachedWeather());
  ensureWeather(renderWeather);

  if (state.data.quotes && state.data.quotes.length > 0) {
    const q = quoteOfTheDay(state.data.quotes);
    const quoteCard = el("div", "quote-card");
    quoteCard.innerHTML = `
      <div class="quote-text">"${q.text.replace(/\n/g, "<br>")}"</div>
      <div class="quote-author">- ${q.author}</div>
    `;
    root.appendChild(quoteCard);
  }

  const banner = el("div", "phase-banner");
  banner.innerHTML = `<div class="p1">현재 단계</div><div class="p2">${phase.label}</div>`;
  root.appendChild(banner);

  if (isExportDue()) {
    const exportBanner = el("div", "card");
    exportBanner.innerHTML = `<div class="section-title" style="margin-top:0;">📤 이번 주 기록을 엑셀로 백업해두세요</div><div class="num-note">지난 백업으로부터 7일 이상 지났어요.</div>`;
    const exportBtn = el("button", "cta-btn secondary", "지금 엑셀로 내보내기");
    exportBtn.style.marginTop = "10px";
    exportBtn.onclick = async () => {
      toast("엑셀 생성 중…");
      await exportTrackerXlsx();
      markExported();
      const uid = state.user.uid;
      const todayNow = todayISO();
      state.settings.lastExcelExport = todayNow;
      rerender();
      saveSettings(uid, { lastExcelExport: todayNow });
    };
    exportBanner.appendChild(exportBtn);
    root.appendChild(exportBanner);
  }

  // D-day
  const ddayGrid = el("div", "dday-grid");
  const ddays = [
    { label: "부트캠프 시작", date: s.bootcampStart },
    { label: "JLPT 시험", date: s.jlptDate },
    { label: "부트캠프 종료", date: s.bootcampEnd }
  ];
  ddays.forEach((d) => {
    const n = dDay(d.date, today);
    const card = el("div", "dday-card");
    card.innerHTML = `<div class="label">${d.label}</div><div class="value">${formatDday(n)}</div><div class="date">${d.date}</div>`;
    ddayGrid.appendChild(card);
  });
  root.appendChild(ddayGrid);

  // 진행 현황 stat grid
  root.appendChild(el("div", "section-title", "📊 진행 현황"));
  const statGrid = el("div", "stat-grid");
  const stats = [
    { n: `${weekTarget}`, unit: "kg", l: "이번주 목표체중" },
    { n: `${agg.japanese}`, unit: "일", l: "일본어 누적일수" },
    { n: `${agg.java}`, unit: "일", l: "자바·부트캠프 누적일수" },
    { n: `${agg.exercise}`, unit: "일", l: "운동 누적일수" }
  ];
  stats.forEach((st) => {
    const card = el("div", "stat-card");
    card.innerHTML = `<div class="n">${st.n}<span class="unit">${st.unit}</span></div><div class="l">${st.l}</div>`;
    statGrid.appendChild(card);
  });
  root.appendChild(statGrid);

  // 체중 추이
  const weightCard = el("div", "card");
  weightCard.appendChild(el("div", "section-title", `⚖️ 체중 추이 (기록 ${agg.weightRecords}회)`));

  const weightRow = el("div");
  weightRow.style.display = "flex";
  weightRow.style.gap = "8px";
  weightRow.style.marginBottom = "12px";
  const wInput = el("input");
  wInput.type = "number"; wInput.step = "0.1"; wInput.placeholder = "오늘 체중 (예: 90.5)";
  wInput.value = c.weight ?? "";
  wInput.style.flex = "1";
  wInput.style.border = "1.5px solid var(--line)";
  wInput.style.borderRadius = "10px";
  wInput.style.padding = "10px 12px";
  wInput.style.fontSize = "14px";
  wInput.style.background = "var(--bg)";
  wInput.style.color = "var(--ink)";
  const wBtn = el("button", "cta-btn", "저장");
  wBtn.style.width = "auto";
  wBtn.style.padding = "10px 18px";
  wBtn.onclick = () => {
    const val = Number(wInput.value);
    if (!val) return toast("체중을 입력해 주세요");
    const uid = state.user.uid;
    state.checkins[today] = { ...(state.checkins[today] || {}), weight: val };
    rerender();
    saveCheckin(uid, today, { weight: val });
    toast("체중이 기록되었어요");
  };
  weightRow.append(wInput, wBtn);
  weightCard.appendChild(weightRow);

  if (hist.length === 0) {
    weightCard.appendChild(el("div", "empty", "위에서 체중을 기록하면 그래프가 나타나요"));
  } else {
    const recent = hist.slice(-14);
    const max = Math.max(s.startWeight, ...recent.map((h) => h.weight));
    const min = Math.min(s.targetWeight, ...recent.map((h) => h.weight));
    const chart = el("div", "weight-chart");
    recent.forEach((h) => {
      const ratio = max === min ? 1 : (h.weight - min) / (max - min);
      const bar = el("div", "bar has-data");
      bar.style.height = `${10 + ratio * 80}%`;
      bar.title = `${h.date}: ${h.weight}kg`;
      chart.appendChild(bar);
    });
    weightCard.appendChild(chart);
    const latest = hist[hist.length - 1];
    weightCard.appendChild(el("div", "num-note", `최근 기록: ${latest.date} · ${latest.weight}kg (목표 ${s.targetWeight}kg)`));
  }
  root.appendChild(weightCard);

  // 종합 성실도 추이 (일본어/자바/운동/식단 각 25%)
  const complianceHist = dailyComplianceHistory(state.checkins);
  const complianceCard = el("div", "card");
  complianceCard.innerHTML = `<div class="section-title" style="margin-top:0;">🔥 종합 성실도 추이</div><div class="num-note" style="margin-top:-6px;margin-bottom:6px;">일본어·자바·운동·식단 각 25%씩 합산한 하루 달성률</div>`;
  if (complianceHist.length === 0) {
    complianceCard.appendChild(el("div", "empty", "오늘 할 일을 체크하면 그래프가 나타나요"));
  } else {
    const recentC = complianceHist.slice(-14);
    const chart2 = el("div", "weight-chart");
    recentC.forEach((h) => {
      const bar = el("div", `bar${h.score > 0 ? " has-data" : ""}`);
      bar.style.height = `${Math.max(4, h.score)}%`;
      bar.title = `${h.date}: ${h.score}%`;
      chart2.appendChild(bar);
    });
    complianceCard.appendChild(chart2);
    const latestC = complianceHist[complianceHist.length - 1];
    complianceCard.appendChild(el("div", "num-note", `오늘(${latestC.date}) 달성률: ${latestC.score}%`));
  }
  root.appendChild(complianceCard);

  // 오늘 할 일
  root.appendChild(el("div", "section-title", "✅ 오늘 할 일"));
  const list = el("div", "todo-list");

  const jpDone = !!c.japanese?.done;
  const jpItem = el("div", `todo-item${jpDone ? " done" : ""}`);
  jpItem.innerHTML = `<div class="box">${jpDone ? "✓" : ""}</div><div class="txt"><div class="t1">일본어 공부</div><div class="t2">카루가루 2일차분 + 1000단어 1일차분 + 숫자/날짜 복습</div></div><div class="go">›</div>`;
  jpItem.onclick = (e) => { toggleManual("japanese"); };
  list.appendChild(jpItem);

  const javaDone = !!c.java?.done;
  const javaItem = el("div", `todo-item${javaDone ? " done" : ""}`);
  javaItem.innerHTML = `<div class="box">${javaDone ? "✓" : ""}</div><div class="txt"><div class="t1">자바 (인프런 강의)</div><div class="t2">기초 강의 30분 이상</div></div><div class="go">›</div>`;
  javaItem.onclick = () => toggleManual("java");
  list.appendChild(javaItem);

  const exDone = !!(c.exercise?.anaerobic?.done || c.exercise?.aerobic?.done);
  const exItem = el("div", `todo-item${exDone ? " done" : ""}`);
  exItem.innerHTML = `<div class="box">${exDone ? "✓" : ""}</div><div class="txt"><div class="t1">운동</div><div class="t2">무산소 / 유산소 - 사진·메모는 운동 페이지에서</div></div><div class="go">›</div>`;
  exItem.onclick = () => navigate("#/exercise");
  list.appendChild(exItem);

  const dietDone = !!(c.diet?.brunch?.done || c.diet?.dinner?.done);
  const dietItem = el("div", `todo-item${dietDone ? " done" : ""}`);
  dietItem.innerHTML = `<div class="box">${dietDone ? "✓" : ""}</div><div class="txt"><div class="t1">식단</div><div class="t2">아점 / 저녁 - 사진·메모는 식단 페이지에서</div></div><div class="go">›</div>`;
  dietItem.onclick = () => navigate("#/diet");
  list.appendChild(dietItem);

  root.appendChild(list);

  // 바로가기
  root.appendChild(el("div", "section-title", "🔗 바로가기"));
  const linkGrid = el("div", "link-grid");
  const links = [
    { emoji: "🈂️", name: "카루가루 단어", sub: "일본어 학원 교재", route: "#/japanese/karugaru" },
    { emoji: "📚", name: "1000단어", sub: "기초 필수 단어", route: "#/japanese/jp1000" },
    { emoji: "🔢", name: "숫자·날짜", sub: "한눈에 정리", route: "#/japanese/numbers" },
    { emoji: "⚙️", name: "설정", sub: "트래커 기준값 수정", route: "#/settings" }
  ];
  links.forEach((l) => {
    const card = el("div", "link-card");
    card.innerHTML = `<div class="emoji">${l.emoji}</div><div class="name">${l.name}</div><div class="sub">${l.sub}</div>`;
    card.onclick = () => navigate(l.route);
    linkGrid.appendChild(card);
  });
  root.appendChild(linkGrid);
}
