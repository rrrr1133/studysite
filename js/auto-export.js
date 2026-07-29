// 일주일 간격 자동 엑셀 내보내기.
// 주의: 순수 정적 사이트라 "사이트를 안 열어도 스스로 실행"되는 진짜 백그라운드 작업은 불가능하다.
// 대신 사용자가 사이트를 열 때마다 "마지막 내보내기 이후 7일 이상 지났는지"를 확인해서,
// 지났으면 자동으로 엑셀을 내려받고 마지막 내보내기 날짜를 갱신한다.
//
// 재시도 가드는 Firestore 왕복(비동기, 실패 가능)에 의존하지 않고 이 기기의 localStorage에
// 즉시(동기적으로) 기록한다 - 그래야 서버 저장이 지연/실패해도 같은 기기에서 새로고침할 때마다
// 반복 다운로드되는 일이 없다.
import { state, toast } from "./state.js";
import { saveSettings } from "./firestore.js";
import { todayISO, daysBetween } from "./tracker-math.js";
import { exportTrackerXlsx } from "./export-xlsx.js";

const LOCAL_KEY = "studysite_last_excel_export";
let checkedThisSession = false;

export async function maybeAutoExportWeekly() {
  if (checkedThisSession) return;
  const uid = state.user?.uid;
  if (!uid) return;
  checkedThisSession = true;

  const today = todayISO();
  const localLast = localStorage.getItem(LOCAL_KEY) || "";
  const remoteLast = state.settings.lastExcelExport || "";
  const last = localLast > remoteLast ? localLast : remoteLast;
  const due = !last || daysBetween(last, today) >= 7;
  if (!due) return;

  // 실제 내보내기를 시도하기 전에 먼저 로컬에 기록 - 이후 어떤 이유로 실패하더라도
  // 이 기기에서는 다음 새로고침 때 다시 트리거되지 않는다.
  localStorage.setItem(LOCAL_KEY, today);

  try {
    await exportTrackerXlsx();
    state.settings.lastExcelExport = today;
    saveSettings(uid, { lastExcelExport: today }); // 실패해도 로컬 가드는 이미 걸려있음
    toast("일주일치 기록을 엑셀로 자동 저장했어요 📥");
  } catch (e) {
    console.error("[auto-export]", e);
  }
}
