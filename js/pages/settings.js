import { state, rerender, toast } from "../state.js";
import { el } from "../dom.js";
import { saveSettings, saveCheckin, logout } from "../firestore.js";
import { todayISO } from "../tracker-math.js";
import { exportTrackerXlsx } from "../export-xlsx.js";

function row(label, type, value, onChange) {
  const wrap = el("div", "form-row");
  wrap.appendChild(el("label", "", label));
  const input = el("input");
  input.type = type;
  input.value = value;
  input.onchange = () => onChange(type === "number" ? Number(input.value) : input.value);
  wrap.appendChild(input);
  return wrap;
}

export function renderSettings(root) {
  const s = state.settings;
  const uid = state.user.uid;

  root.appendChild(el("div", "header", `<h1>설정</h1><div class="sub">${state.user.email}</div>`));

  // 오늘의 체중 빠른 기록
  const weightCard = el("div", "card");
  weightCard.appendChild(el("div", "section-title", "⚖️ 오늘 체중 기록"));
  const today = todayISO();
  const wInput = el("input");
  wInput.type = "number"; wInput.step = "0.1"; wInput.placeholder = "예: 90.5";
  wInput.value = state.checkins[today]?.weight ?? "";
  const wBtn = el("button", "cta-btn", "저장");
  wBtn.style.marginTop = "10px";
  wBtn.onclick = () => {
    const val = Number(wInput.value);
    if (!val) return toast("체중을 입력해 주세요");
    state.checkins[today] = { ...(state.checkins[today] || {}), weight: val };
    rerender();
    saveCheckin(uid, today, { weight: val });
    toast("체중이 기록되었어요");
  };
  weightCard.append(wInput, wBtn);
  root.appendChild(weightCard);

  // 트래커 기준값
  const form = el("div", "card");
  form.appendChild(el("div", "section-title", "🎯 트래커 기준값 (xlsx의 '설정값'과 동일)"));
  const fields = [
    ["트래커 시작일", "date", "trackerStart"],
    ["부트캠프 시작일", "date", "bootcampStart"],
    ["부트캠프 종료일", "date", "bootcampEnd"],
    ["JLPT 시험일", "date", "jlptDate"],
    ["다이어트 목표일", "date", "dietTargetDate"],
    ["시작 체중 (kg)", "number", "startWeight"],
    ["목표 체중 (kg)", "number", "targetWeight"]
  ];
  const patch = {};
  fields.forEach(([label, type, key]) => {
    form.appendChild(row(label, type, s[key], (v) => { patch[key] = v; }));
  });
  const saveBtn = el("button", "cta-btn", "기준값 저장");
  saveBtn.style.marginTop = "6px";
  saveBtn.onclick = () => {
    state.settings = { ...state.settings, ...patch };
    rerender();
    saveSettings(uid, patch);
    toast("설정이 저장되었어요");
  };
  form.appendChild(saveBtn);
  root.appendChild(form);

  // 데이터 내보내기
  const exportCard = el("div", "card");
  exportCard.appendChild(el("div", "section-title", "📤 데이터 내보내기"));
  exportCard.appendChild(el("div", "num-note", "원본 트래커 엑셀과 같은 형식(주차별 요일 체크 + 종합 성실도)으로 내려받습니다. 사이트를 열 때마다 지난 내보내기로부터 7일 이상 지났으면 자동으로도 한 번 내려받아요."));
  exportCard.appendChild(el("div", "num-note", `마지막 내보내기: ${s.lastExcelExport || "아직 없음"}`));
  const exportBtn = el("button", "cta-btn secondary", "지금 엑셀로 내보내기");
  exportBtn.style.marginTop = "10px";
  exportBtn.onclick = async () => {
    toast("엑셀 생성 중…");
    await exportTrackerXlsx();
    const today2 = todayISO();
    state.settings.lastExcelExport = today2;
    rerender();
    saveSettings(uid, { lastExcelExport: today2 });
  };
  exportCard.appendChild(exportBtn);
  root.appendChild(exportCard);

  // 로그아웃
  const logoutCard = el("div", "card");
  const logoutBtn = el("button", "cta-btn danger", "로그아웃");
  logoutBtn.onclick = () => logout();
  logoutCard.appendChild(logoutBtn);
  root.appendChild(logoutCard);
}
