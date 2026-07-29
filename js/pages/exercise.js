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
    drop.innerHTML = `<div class="icon">📷</div><div>사진 인증하기</div>`;
  }
  const input = el("input");
  input.type = "file"; input.accept = "image/*";
  drop.appendChild(input);
  drop.onclick = () => input.click();
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    toast("사진 압축 중…");
    const dataUrl = await compressImage(file);
    save({ photo: dataUrl });
  };
  card.appendChild(drop);

  const memo = el("textarea", "memo-input");
  memo.placeholder = "메모 (오늘 어떤 운동을 했나요?)";
  memo.value = todayData?.memo || "";
  memo.onblur = () => save({ memo: memo.value });
  card.appendChild(memo);

  const toggleBtn = el("button", `cta-btn ${done ? "secondary" : ""}`, done ? "완료 취소" : "완료로 표시");
  toggleBtn.style.marginTop = "10px";
  toggleBtn.onclick = () => save({ done: !done });
  card.appendChild(toggleBtn);

  function save(patch) {
    const uid = state.user.uid;
    const merged = { ...(todayData || {}), ...patch };
    state.checkins[today] = { ...(state.checkins[today] || {}), exercise: { ...(state.checkins[today]?.exercise || {}), [key]: merged } };
    rerender();
    saveCheckin(uid, today, { exercise: { [key]: patch } });
  }

  root.appendChild(card);
}

function renderHistory(root) {
  const entries = Object.entries(state.checkins)
    .filter(([, c]) => c.exercise?.anaerobic?.memo || c.exercise?.aerobic?.memo || c.exercise?.anaerobic?.photo || c.exercise?.aerobic?.photo)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 14);

  root.appendChild(el("div", "section-title", "📋 최근 기록"));
  if (entries.length === 0) {
    root.appendChild(el("div", "empty", "아직 기록이 없어요"));
    return;
  }
  const list = el("div", "history-list");
  entries.forEach(([date, c]) => {
    ["anaerobic", "aerobic"].forEach((k) => {
      const d = c.exercise?.[k];
      if (!d || (!d.memo && !d.photo)) return;
      const row = el("div", "history-row");
      row.innerHTML = `
        ${d.photo ? `<img class="thumb" src="${d.photo}">` : `<div class="thumb"></div>`}
        <div style="flex:1;">
          <div class="d">${date} · ${k === "anaerobic" ? "무산소" : "유산소"}</div>
          <div class="m">${d.memo || ""}</div>
        </div>`;
      list.appendChild(row);
    });
  });
  root.appendChild(list);
}

export function renderExercise(root) {
  const today = todayISO();
  const todayC = state.checkins[today]?.exercise || {};

  const header = el("div", "header");
  header.innerHTML = `<h1>운동 체크</h1><div class="sub">${today} · 무산소 / 유산소</div>`;
  root.appendChild(header);

  const grid = el("div", "split-grid");
  renderSplitCard(grid, { key: "anaerobic", title: "💪 무산소", today, todayData: todayC.anaerobic });
  renderSplitCard(grid, { key: "aerobic", title: "🏃 유산소", today, todayData: todayC.aerobic });
  root.appendChild(grid);

  renderHistory(root);
}
