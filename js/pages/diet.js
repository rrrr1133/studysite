import { state, rerender, toast } from "../state.js";
import { el } from "../dom.js";
import { saveCheckin } from "../firestore.js";
import { compressImage } from "../photo-utils.js";
import { todayISO } from "../tracker-math.js";

function renderSplitCard(root, { key, title, today, todayData }) {
  const card = el("div", "split-card");
  const done = !!todayData?.done;
  const h = el("h4");
  h.innerHTML = `<span>${title}</span><span class="badge${done ? "" : " off"}">${done ? "완료" : "미완료"}</span>`;
  card.appendChild(h);

  const drop = el("div", "photo-drop");
  if (todayData?.photo) {
    drop.innerHTML = `<img src="${todayData.photo}">`;
  } else {
    drop.innerHTML = `<div class="icon">🍽️</div><div>식단 사진 인증</div>`;
  }
  const input = el("input");
  input.type = "file"; input.accept = "image/*"; input.capture = "environment";
  drop.appendChild(input);
  drop.onclick = () => input.click();
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    toast("사진 압축 중…");
    const dataUrl = await compressImage(file);
    save({ photo: dataUrl, done: true });
  };
  card.appendChild(drop);

  const memo = el("textarea", "memo-input");
  memo.placeholder = "메모 (무엇을 먹었나요?)";
  memo.value = todayData?.memo || "";
  memo.onblur = () => save({ memo: memo.value, done: memo.value.trim().length > 0 || !!todayData?.photo || done });
  card.appendChild(memo);

  const toggleBtn = el("button", `cta-btn ${done ? "secondary" : ""}`, done ? "완료 취소" : "완료로 표시");
  toggleBtn.style.marginTop = "10px";
  toggleBtn.onclick = () => save({ done: !done });
  card.appendChild(toggleBtn);

  function save(patch) {
    const uid = state.user.uid;
    const merged = { ...(todayData || {}), ...patch };
    state.checkins[today] = { ...(state.checkins[today] || {}), diet: { ...(state.checkins[today]?.diet || {}), [key]: merged } };
    rerender();
    saveCheckin(uid, today, { diet: { [key]: patch } });
  }

  root.appendChild(card);
}

function renderHistory(root) {
  const entries = Object.entries(state.checkins)
    .filter(([, c]) => c.diet?.brunch?.memo || c.diet?.dinner?.memo || c.diet?.brunch?.photo || c.diet?.dinner?.photo)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 14);

  root.appendChild(el("div", "section-title", "📋 최근 기록"));
  if (entries.length === 0) {
    root.appendChild(el("div", "empty", "아직 기록이 없어요"));
    return;
  }
  const list = el("div", "history-list");
  entries.forEach(([date, c]) => {
    ["brunch", "dinner"].forEach((k) => {
      const d = c.diet?.[k];
      if (!d || (!d.memo && !d.photo)) return;
      const row = el("div", "history-row");
      row.innerHTML = `
        ${d.photo ? `<img class="thumb" src="${d.photo}">` : `<div class="thumb"></div>`}
        <div style="flex:1;">
          <div class="d">${date} · ${k === "brunch" ? "아점" : "저녁"}</div>
          <div class="m">${d.memo || ""}</div>
        </div>`;
      list.appendChild(row);
    });
  });
  root.appendChild(list);
}

export function renderDiet(root) {
  const today = todayISO();
  const todayC = state.checkins[today]?.diet || {};

  const header = el("div", "header");
  header.innerHTML = `<h1>식단 체크</h1><div class="sub">${today} · 아점 / 저녁</div>`;
  root.appendChild(header);

  const grid = el("div", "split-grid");
  renderSplitCard(grid, { key: "brunch", title: "🍳 아점", today, todayData: todayC.brunch });
  renderSplitCard(grid, { key: "dinner", title: "🌙 저녁", today, todayData: todayC.dinner });
  root.appendChild(grid);

  renderHistory(root);
}
