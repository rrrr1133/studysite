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

// 매주 토요일은 쉬는 날 - 체크하지 않아도 되고 성실도 계산에서도 제외된다.
export function isRestDay(dateISO) {
  return toDate(dateISO).getDay() === 6;
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

// 무산소/유산소(또는 아점/저녁) 중 몇 개가 done인지에 따라 0 / 0.5 / 1을 반환한다.
// 두 항목을 모두 인증해야 최종완료(1)이고, 하나만 인증하면 절반 성공(0.5)으로 기록된다.
export function exerciseScore(c) {
  const a = c?.exercise?.anaerobic?.done ? 1 : 0;
  const b = c?.exercise?.aerobic?.done ? 1 : 0;
  return (a + b) / 2;
}

export function dietScore(c) {
  const a = c?.diet?.brunch?.done ? 1 : 0;
  const b = c?.diet?.dinner?.done ? 1 : 0;
  return (a + b) / 2;
}

// checkins: { [date]: { japanese:{done}, java:{done}, exercise:{anaerobic:{done},aerobic:{done}}, diet:{brunch:{done},dinner:{done}}, weight:number|null } }
export function aggregateCheckins(checkins) {
  const days = Object.values(checkins || {});
  let japanese = 0, java = 0, exercise = 0, weightRecords = 0;
  for (const c of days) {
    if (c.japanese?.done) japanese++;
    if (c.java?.done) java++;
    if (exerciseScore(c) === 1) exercise++;
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
// 토요일(쉬는 날)은 체크가 필요 없으므로 그래프 계산에서 아예 제외한다.
export function dailyComplianceHistory(checkins) {
  return Object.entries(checkins || {})
    .filter(([date]) => !isRestDay(date))
    .map(([date, c]) => {
      let score = 0;
      if (c.japanese?.done) score += 25;
      if (c.java?.done) score += 25;
      score += 25 * exerciseScore(c);
      score += 25 * dietScore(c);
      return { date, score: Math.round(score) };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
