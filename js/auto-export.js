// 일주일 간격 자동 엑셀 내보내기.
// 주의: 순수 정적 사이트라 "사이트를 안 열어도 스스로 실행"되는 진짜 백그라운드 작업은 불가능하다.
// 대신 사용자가 사이트를 열 때마다 "마지막 내보내기 이후 7일 이상 지났는지"를 확인해서,
// 지났으면 자동으로 엑셀을 내려받고 마지막 내보내기 날짜를 갱신한다.
import { state, toast } from "./state.js";
import { saveSettings } from "./firestore.js";
import { todayISO, daysBetween } from "./tracker-math.js";
import { exportTrackerXlsx } from "./export-xlsx.js";

let checkedThisSession = false;

export async function maybeAutoExportWeekly() {
  if (checkedThisSession) return;
  const uid = state.user?.uid;
  if (!uid) return;
  checkedThisSession = true;

  const today = todayISO();
  const last = state.settings.lastExcelExport;
  const due = !last || daysBetween(last, today) >= 7;
  if (!due) return;

  try {
    await exportTrackerXlsx();
    await saveSettings(uid, { lastExcelExport: today });
    state.settings.lastExcelExport = today;
    toast("일주일치 기록을 엑셀로 자동 저장했어요 📥");
  } catch (e) {
    checkedThisSession = false; // 실패하면 다음에 사이트 열 때 다시 시도
  }
}
