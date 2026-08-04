// 원본 일본IT취업_목표트래커.xlsx 의 "주간체크리스트" 시트와 같은 컬럼 구조로 내보낸다.
import { state } from "./state.js";
import { exerciseScore, dietScore } from "./tracker-math.js";

function isoAddDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function phaseLabel(settings, date) {
  if (date < settings.bootcampStart) return "1단계: 일본어 집중준비";
  if (date <= settings.bootcampEnd) return "2단계: 부트캠프 병행";
  return "3단계: BJT/취업 스퍼트";
}

function buildRows(settings, checkins) {
  const header = [
    "주차", "시작일(월)", "종료일(일)", "단계", "목표체중(kg)",
    "일본어_월", "일본어_화", "일본어_수", "일본어_목", "일본어_금", "일본어_토", "일본어_일",
    "자바·부트캠프_월", "자바·부트캠프_화", "자바·부트캠프_수", "자바·부트캠프_목", "자바·부트캠프_금", "자바·부트캠프_토", "자바·부트캠프_일",
    "운동_월", "운동_화", "운동_수", "운동_목", "운동_금", "운동_토", "운동_일",
    "식단_월", "식단_화", "식단_수", "식단_목", "식단_금", "식단_토", "식단_일",
    "일본어 달성일수", "자바 달성일수", "운동 달성일수", "식단 달성일수", "종합 성실도(%)", "실측체중(kg)", "메모"
  ];
  const rows = [header];

  let weekStart = settings.trackerStart;
  const totalWeeks = 39;
  for (let w = 0; w < totalWeeks; w++) {
    const weekEnd = isoAddDays(weekStart, 6);
    const dayFlags = { japanese: [], java: [], exercise: [], diet: [] };
    const exScores = [];
    const dietScores = [];
    let weightForWeek = "";
    const memos = [];
    for (let d = 0; d < 7; d++) {
      const date = isoAddDays(weekStart, d);
      const c = checkins[date] || {};
      dayFlags.japanese.push(c.japanese?.done ? "O" : "");
      dayFlags.java.push(c.java?.done ? "O" : "");
      const exScore = exerciseScore(c);
      const dtScore = dietScore(c);
      dayFlags.exercise.push(exScore === 1 ? "O" : exScore === 0.5 ? "△" : "");
      dayFlags.diet.push(dtScore === 1 ? "O" : dtScore === 0.5 ? "△" : "");
      exScores.push(exScore);
      dietScores.push(dtScore);
      if (typeof c.weight === "number") weightForWeek = c.weight;
      if (c.exercise?.anaerobic?.memo) memos.push(c.exercise.anaerobic.memo);
      if (c.exercise?.aerobic?.memo) memos.push(c.exercise.aerobic.memo);
      if (c.diet?.brunch?.memo) memos.push(c.diet.brunch.memo);
      if (c.diet?.dinner?.memo) memos.push(c.diet.dinner.memo);
    }
    const jCount = dayFlags.japanese.filter((v) => v === "O").length;
    const javaCount = dayFlags.java.filter((v) => v === "O").length;
    const exCount = exScores.reduce((sum, v) => sum + v, 0);
    const dietCount = dietScores.reduce((sum, v) => sum + v, 0);
    const compliancePct = Math.round(((jCount + javaCount + exCount + dietCount) / 28) * 100);

    rows.push([
      w + 1, weekStart, weekEnd, phaseLabel(settings, weekStart), "",
      ...dayFlags.japanese, ...dayFlags.java, ...dayFlags.exercise, ...dayFlags.diet,
      jCount, javaCount, exCount, dietCount, compliancePct, weightForWeek, memos.join(" / ")
    ]);
    weekStart = isoAddDays(weekStart, 7);
  }
  return rows;
}

export async function exportTrackerXlsx() {
  const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  const rows = buildRows(state.settings, state.checkins);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "주간체크리스트");
  XLSX.writeFile(wb, `일본IT취업_트래커_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
