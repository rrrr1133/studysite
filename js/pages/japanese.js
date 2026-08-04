import { state, rerender, toast } from "../state.js";
import { el, navigate } from "../dom.js";
import { renderDayGrid, renderDeck } from "../deck.js";
import { saveProgress } from "../firestore.js";

function buildKarugaruDays() {
  const src = state.data.karugaru;
  return src.days.map((d, dayIndex) => ({
    label: `${d.lesson} · ${d.title}`,
    cards: [
      ...d.words.map((w, idx) => ({ id: `karu-${dayIndex}-${idx}`, jp: w.jp, reading: w.reading, kr: w.kr, verify: !!w.verify })),
      ...(d.bonus || []).map((w, idx) => ({ id: `karu-${dayIndex}-b${idx}`, jp: w.jp, reading: w.reading, kr: w.kr, bonus: true }))
    ]
  }));
}

function buildJp1000Days() {
  const src = state.data.jp1000;
  const pages = src.pages;
  const PER_DAY = 3;
  const days = [];
  for (let i = 0; i < pages.length; i += PER_DAY) {
    const chunk = pages.slice(i, i + PER_DAY);
    const first = chunk[0].words[0].no;
    const last = chunk[chunk.length - 1].words[chunk[chunk.length - 1].words.length - 1].no;
    days.push({
      label: `${first}~${last}번`,
      cards: chunk.flatMap((p) => p.words.map((w) => ({
        id: `jp1000-${w.no}`, jp: w.jp, reading: w.reading, kr: w.kr, ex_jp: w.ex_jp, ex_kr: w.ex_kr, pos: w.pos
      })))
    });
  }
  return days;
}

function todayDayIndex(days, completed) {
  for (let i = 0; i < days.length; i++) if (!completed.includes(i)) return i;
  return days.length - 1;
}

function renderTabs(root, active) {
  const tabs = el("div", "tabs");
  const items = [
    { key: "karugaru", label: "카루가루 단어" },
    { key: "jp1000", label: "다나쌤 1000단어" },
    { key: "numbers", label: "숫자 · 날짜" }
  ];
  items.forEach((it) => {
    const btn = el("button", it.key === active ? "active" : "", it.label);
    btn.onclick = () => navigate(`#/japanese/${it.key}`);
    tabs.appendChild(btn);
  });
  root.appendChild(tabs);
}

function toggleFavorite(progressKey, id) {
  // 별 아이콘 자체는 deck.js의 renderStar()가 로컬로 즉시 갱신하므로 여기서 전체 rerender()를
  // 부르지 않는다 - 부르면 현재 보고 있는 덱이 통째로 다시 그려져 첫 카드로 돌아가 버린다.
  // (Firestore 쓰기 후 onSnapshot echo로 언젠가 한 번 더 rerender가 오긴 하지만,
  // renderDeck이 같은 day를 기억해 위치를 복원하므로 안전하다.)
  const uid = state.user.uid;
  const progress = state.progress[progressKey] || {};
  const favorites = { ...(progress.favorites || {}) };
  const next = !favorites[id];
  favorites[id] = next;
  state.progress[progressKey] = { ...progress, favorites };
  saveProgress(uid, progressKey, { favorites: { [id]: next } });
}

function renderDeckTab(root, kind, sub, dayParam, buildDays, progressKey) {
  const days = buildDays();
  const progress = state.progress[progressKey] || {};
  const completed = progress.completedDays || [];
  const favorites = progress.favorites || {};
  const isFavorite = (id) => !!favorites[id];
  const onToggleFavorite = (id) => toggleFavorite(progressKey, id);

  if (sub === "favorites") {
    renderFavoritesList(root, {
      cards: days.flatMap((d) => d.cards).filter((c) => isFavorite(c.id)),
      isFavorite, onToggleFavorite,
      backRoute: `#/japanese/${kind}`
    });
    return;
  }

  if (dayParam !== undefined) {
    const dayIndex = Number(dayParam);
    const day = days[dayIndex];
    if (!day) { root.appendChild(el("div", "empty", "존재하지 않는 Day 입니다.")); return; }
    renderDeck(root, {
      day, dayIndex, deckId: progressKey,
      backRoute: `#/japanese/${kind}`,
      isFavorite, onToggleFavorite,
      onComplete: () => {
        const uid = state.user.uid;
        const next = Array.from(new Set([...completed, dayIndex]));
        state.progress[progressKey] = { ...progress, completedDays: next };
        toast(`Day ${dayIndex + 1} 완료! 🎉`);
        rerender();
        saveProgress(uid, progressKey, { completedDays: next });
      }
    });
    return;
  }

  const header = el("div", "card");
  const pct = Math.round((completed.length / days.length) * 100) || 0;
  header.innerHTML = `
    <div class="progress-top" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
      <span style="font-size:26px;font-weight:800;color:var(--accent);">${pct}%</span>
      <span style="font-size:12px;color:var(--muted);">${completed.length} / ${days.length}일 완료</span>
    </div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
  `;
  root.appendChild(header);

  const favCount = Object.values(favorites).filter(Boolean).length;
  const favBtn = el("button", "cta-btn secondary", `⭐ 즐겨찾기 (${favCount}개)`);
  favBtn.style.marginBottom = "14px";
  favBtn.onclick = () => navigate(`#/japanese/${kind}/favorites`);
  root.appendChild(favBtn);

  const todayIdx = todayDayIndex(days, completed);
  renderDayGrid(root, {
    days, todayIndex: todayIdx,
    isDayDone: (idx) => completed.includes(idx),
    onSelectDay: (idx) => navigate(`#/japanese/${kind}/day/${idx}`)
  });
}

function renderFavoritesList(root, { cards, isFavorite, onToggleFavorite, backRoute }) {
  const topbar = el("div", "topbar");
  const back = el("button", "iconbtn", "‹");
  back.onclick = () => navigate(backRoute);
  const title = el("div", "title", `<div class="t1">⭐ 즐겨찾기</div><div class="t2">저장된 단어 ${cards.length}개</div>`);
  topbar.append(back, title);
  root.appendChild(topbar);

  if (cards.length === 0) {
    root.appendChild(el("div", "empty", "단어 카드에서 별 아이콘을 눌러 즐겨찾기에 추가해 보세요"));
    return;
  }

  const list = el("div", "fav-list");
  cards.forEach((w) => {
    const row = el("div", "fav-row");
    row.innerHTML = `
      <div class="info">
        <div class="jp">${w.jp}<span class="reading">${w.reading || ""}</span></div>
        <div class="kr">${w.kr}</div>
      </div>
    `;
    const starBtn = el("button", "iconbtn star-btn active", "★");
    starBtn.onclick = () => {
      onToggleFavorite(w.id);
      row.remove();
      if (!list.children.length) {
        list.replaceWith(el("div", "empty", "단어 카드에서 별 아이콘을 눌러 즐겨찾기에 추가해 보세요"));
      }
    };
    row.appendChild(starBtn);
    list.appendChild(row);
  });
  root.appendChild(list);
}

function renderNumbersTab(root) {
  const data = state.data.numbers;
  data.categories.forEach((cat) => {
    const wrap = el("div", "num-cat");
    wrap.innerHTML = `<h3>${cat.title}<span class="src">${cat.sourceLesson || ""}</span></h3>`;
    const grid = el("div", "num-grid");
    cat.items.forEach((it) => {
      const cell = el("div", `num-item${it.warn ? " warn" : ""}`, `<div class="n">${it.num}</div><div class="r">${it.reading}</div>`);
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    if (cat.note) wrap.appendChild(el("div", "num-note", cat.note));
    root.appendChild(wrap);
  });
}

export function renderJapanese(root, params) {
  const [tab, sub, dayParam] = params;
  const kind = tab || "karugaru";

  const header = el("div", "header");
  header.innerHTML = `<h1>일본어 공부</h1><div class="sub">카루가루 2일차분 + 1000단어 1일차분 + 숫자/날짜는 매일</div>`;
  root.appendChild(header);

  renderTabs(root, kind);

  if (kind === "karugaru") renderDeckTab(root, "karugaru", sub, sub === "day" ? dayParam : undefined, buildKarugaruDays, "karugaru");
  else if (kind === "jp1000") renderDeckTab(root, "jp1000", sub, sub === "day" ? dayParam : undefined, buildJp1000Days, "jp1000");
  else if (kind === "numbers") renderNumbersTab(root);
}
