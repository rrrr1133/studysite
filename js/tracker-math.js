// 일본IT취업_목표트래커.xlsx 의 "대시보드" 시트 수식을 그대로 JS로 옮긴 것.
// 기준값은 settings 문서(사용자가 설정 화면에서 수정 가능)에서 주입받는다.

export const DEFAULT_SETTINGS = {
  trackerStart: "2026-07-27",
  bootcampStart: "2026-10-29",
  bootcampEnd: "2027-03-30",
  jlptDate: "2026-12-06",
  dietTargetDate: "2026-12-31",
  startWeight: 92,
  targetWeight: 75
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a, b) {
  return Math.round((toDate(b) - toDate(a)) / DAY_MS);
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// xlsx: IF(TODAY()<시작일,0,INT((TODAY()-시작일)/7)+1)
export function elapsedWeek(settings, today = todayISO()) {
  const diff = daysBetween(settings.trackerStart, today);
  if (diff < 0) return 0;
  return Math.floor(diff / 7) + 1;
}

// xlsx: IF(TODAY()<부트캠프시작,"1단계",IF(TODAY()<=부트캠프종료,"2단계","3단계"))
export function currentPhase(settings, today = todayISO()) {
  if (today < settings.bootcampStart) return { code: 1, label: "1단계: 일본어 집중 준비" };
  if (today <= settings.bootcampEnd) return { code: 2, label: "2단계: 부트캠프 병행" };
  return { code: 3, label: "3단계: BJT/취업 스퍼트" };
}

// xlsx: IF(TODAY()<=다이어트목표일, 시작체중+(목표체중-시작체중)*(TODAY()-트래커시작일)/(다이어트목표일-트래커시작일), 목표체중)
export function thisWeekTargetWeight(settings, today = todayISO()) {
  if (today > settings.dietTargetDate) return settings.targetWeight;
  const total = daysBetween(settings.trackerStart, settings.dietTargetDate);
  const elapsed = daysBetween(settings.trackerStart, today);
  const ratio = total <= 0 ? 1 : elapsed / total;
  const w = settings.startWeight + (settings.targetWeight - settings.startWeight) * ratio;
  return Math.round(w * 10) / 10;
}

export function dDay(targetISO, today = todayISO()) {
  return daysBetween(today, targetISO);
}

export function formatDday(n) {
  if (n === 0) return "D-Day";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

// checkins: { [date]: { japanese:{done}, java:{done}, exercise:{anaerobic:{done},aerobic:{done}}, diet:{brunch:{done},dinner:{done}}, weight:number|null } }
export function aggregateCheckins(checkins) {
  const days = Object.values(checkins || {});
  let japanese = 0, java = 0, exercise = 0, weightRecords = 0;
  for (const c of days) {
    if (c.japanese?.done) japanese++;
    if (c.java?.done) java++;
    if (c.exercise?.anaerobic?.done || c.exercise?.aerobic?.done) exercise++;
    if (typeof c.weight === "number") weightRecords++;
  }
  return { japanese, java, exercise, weightRecords, totalDays: days.length };
}

export function weightHistory(checkins) {
  return Object.entries(checkins || {})
    .filter(([, c]) => typeof c.weight === "number")
    .map(([date, c]) => ({ date, weight: c.weight }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// 일본어/자바/운동/식단 4개 항목을 각각 25%로 합산한 일별 종합 달성률(0~100%) 추이
export function dailyComplianceHistory(checkins) {
  return Object.entries(checkins || {})
    .map(([date, c]) => {
      let score = 0;
      if (c.japanese?.done) score += 25;
      if (c.java?.done) score += 25;
      if (c.exercise?.anaerobic?.done || c.exercise?.aerobic?.done) score += 25;
      if (c.diet?.brunch?.done || c.diet?.dinner?.done) score += 25;
      return { date, score };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
