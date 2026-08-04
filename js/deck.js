// 카루가루/1000단어 공용 플래시카드 덱 컴포넌트
import { el, navigate } from "./dom.js";

const POS_CLASS = { "명사": "pos-noun", "동사": "pos-verb", "い형용사": "pos-iadj", "な형용사": "pos-nadj", "부사": "pos-adv" };

export function renderDayGrid(root, { days, isDayDone, todayIndex, onSelectDay }) {
  const grid = el("div", "day-grid");
  days.forEach((d, idx) => {
    const done = isDayDone(idx);
    const card = el("div", `day-card${idx === todayIndex ? " today" : ""}`);
    card.innerHTML = `<div class="dnum">Day ${idx + 1}</div><div class="status">${done ? "✅" : "⬜️"}</div><div class="drange">${d.label || ""}</div>`;
    card.onclick = () => onSelectDay(idx);
    grid.appendChild(card);
  });
  root.appendChild(grid);
}

export function renderDeck(root, { day, dayIndex, onComplete, backRoute, isFavorite, onToggleFavorite }) {
  const cards = day.cards;
  let i = 0;
  let flipped = false;

  const topbar = el("div", "topbar");
  const back = el("button", "iconbtn", "‹");
  back.onclick = () => navigate(backRoute);
  const title = el("div", "title");
  title.innerHTML = `<div class="t1">Day ${dayIndex + 1}</div><div class="t2">${day.label || ""} · ${cards.length}개 단어</div>`;
  topbar.append(back, title);
  const starBtn = el("button", "iconbtn star-btn", "☆");
  topbar.appendChild(starBtn);
  root.appendChild(topbar);

  const dots = el("div", "dots");
  const wrap = el("div", "card-wrap");
  const nav = el("div", "nav-row");
  const prevBtn = el("button", "cta-btn secondary", "이전");
  const nextBtn = el("button", "cta-btn", "다음");
  nav.append(prevBtn, nextBtn);

  root.append(dots, wrap, nav);

  function renderDots() {
    dots.innerHTML = "";
    cards.forEach((_, idx) => {
      const dot = el("div", `dot${idx < i ? " seen" : ""}${idx === i ? " current" : ""}`);
      dots.appendChild(dot);
    });
  }

  function renderStar() {
    if (!isFavorite) return;
    const w = cards[i];
    const active = isFavorite(w.id);
    starBtn.textContent = active ? "★" : "☆";
    starBtn.classList.toggle("active", active);
  }
  starBtn.onclick = () => {
    const w = cards[i];
    onToggleFavorite(w.id);
    renderStar();
  };

  function renderCard() {
    wrap.innerHTML = "";
    const w = cards[i];
    renderStar();
    const card = el("div", `flashcard${flipped ? " flipped" : ""}`);
    const pill = w.pos ? `<span class="pos-pill ${POS_CLASS[w.pos] || "pos-noun"}">${w.pos}</span>` : (w.bonus ? `<span class="pos-pill pos-adv">추가 단어</span>` : "");
    const front = el("div", "face face-front", `
      <div class="jp-word">${w.jp}</div>
      <div class="jp-reading">${w.reading || ""}</div>
      ${pill}
      ${w.verify ? '<div class="verify-badge">⚠️ PDF 원본 대조 필요</div>' : ""}
      <div class="tap-hint">👆 탭해서 뜻 보기</div>
    `);
    const back2 = el("div", "face face-back", `
      <div class="kr-meaning">${w.kr}</div>
      ${w.ex_jp ? `<div class="example-box"><div class="example-jp">${w.ex_jp}</div><div class="example-kr">${w.ex_kr || ""}</div></div>` : ""}
      <div class="tap-hint">👆 탭해서 다시 보기</div>
    `);
    card.append(front, back2);
    card.onclick = () => { flipped = !flipped; card.classList.toggle("flipped"); };
    wrap.appendChild(card);
    renderDots();
    prevBtn.disabled = i === 0;
    nextBtn.textContent = i === cards.length - 1 ? "학습 완료" : "다음";
  }

  prevBtn.onclick = () => { if (i > 0) { i--; flipped = false; renderCard(); } };
  nextBtn.onclick = () => {
    if (i < cards.length - 1) { i++; flipped = false; renderCard(); }
    else { onComplete(); }
  };

  renderCard();
}
