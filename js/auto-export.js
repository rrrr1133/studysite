// 엑셀 백업이 7일 이상 지났는지 판정하는 순수 함수.
// 예전에는 이 판정이 참이면 자동으로 파일을 다운로드시켰는데, 새로고침/로그인/다른 브라우저 등
// 트리거 시점이 늘어날 때마다 계속 예상 못한 곳에서 재발했다. 지금은 다운로드나 저장을 직접 하지
// 않고 "지금 due한지"만 알려주며, 실제 내보내기는 사용자가 배너의 버튼을 눌러야 실행된다.
import { state } from "./state.js";
import { todayISO, daysBetween } from "./tracker-math.js";

const LOCAL_KEY = "studysite_last_excel_export";

export function isExportDue() {
  const today = todayISO();
  const localLast = localStorage.getItem(LOCAL_KEY) || "";
  const remoteLast = state.settings.lastExcelExport || "";
  const last = localLast > remoteLast ? localLast : remoteLast;
  return !last || daysBetween(last, today) >= 7;
}

export function markExported() {
  localStorage.setItem(LOCAL_KEY, todayISO());
}
