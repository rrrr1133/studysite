import { state, setRenderer, rerender, loadStaticData, toast } from "./state.js";
import { onAuth, watchAllCheckins, watchProgress, watchSettings, login, signup, logout } from "./firestore.js";
import { el, parseRoute, navigate } from "./dom.js";
import { renderHome } from "./pages/home.js";
import { renderJapanese } from "./pages/japanese.js";
import { renderExercise } from "./pages/exercise.js";
import { renderDiet } from "./pages/diet.js";
import { renderSettings } from "./pages/settings.js";

const app = document.getElementById("app");
let unsubs = [];

function clearSubs() {
  unsubs.forEach((u) => u && u());
  unsubs = [];
}

function renderLogin() {
  app.innerHTML = "";
  const wrap = el("div", "auth-wrap");
  const card = el("div", "card");
  card.innerHTML = `
    <h1>🇯🇵 일본 IT 취업 스터디</h1>
    <div class="sub">로그인하면 아이패드·모바일 어디서든 기록이 동기화됩니다</div>
  `;
  const email = el("input"); email.type = "email"; email.placeholder = "이메일";
  const pw = el("input"); pw.type = "password"; pw.placeholder = "비밀번호 (6자 이상)";
  const errBox = el("div", "auth-error");
  const loginBtn = el("button", "cta-btn", "로그인");
  const signupBtn = el("button", "cta-btn secondary", "처음이에요 (계정 만들기)");
  loginBtn.style.marginBottom = "8px";

  loginBtn.onclick = async () => {
    errBox.textContent = "";
    try { await login(email.value.trim(), pw.value); }
    catch (e) { errBox.textContent = friendlyAuthError(e); }
  };
  signupBtn.onclick = async () => {
    errBox.textContent = "";
    try { await signup(email.value.trim(), pw.value); }
    catch (e) { errBox.textContent = friendlyAuthError(e); }
  };

  card.append(email, pw, errBox, loginBtn, signupBtn);
  wrap.appendChild(card);
  app.appendChild(wrap);
}

function friendlyAuthError(e) {
  const code = e && e.code ? e.code : "";
  if (code.includes("invalid-email")) return "이메일 형식을 확인해 주세요.";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "비밀번호가 맞지 않아요.";
  if (code.includes("user-not-found")) return "계정이 없어요. '계정 만들기'를 눌러 주세요.";
  if (code.includes("email-already-in-use")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (code.includes("weak-password")) return "비밀번호는 6자 이상이어야 해요.";
  return "오류가 발생했어요: " + (e?.message || e);
}

const NAV_ITEMS = [
  { route: "home", icon: "🏠", label: "홈" },
  { route: "japanese", icon: "🇯🇵", label: "일본어" },
  { route: "exercise", icon: "🏃", label: "운동" },
  { route: "diet", icon: "🍚", label: "식단" },
  { route: "settings", icon: "⚙️", label: "설정" }
];

function renderTabbar(activeRoute) {
  const bar = el("div", "tabbar");
  NAV_ITEMS.forEach((item) => {
    const btn = el("button", item.route === activeRoute ? "active" : "");
    btn.innerHTML = `<span class="ic">${item.icon}</span><span>${item.label}</span>`;
    btn.onclick = () => navigate(`#/${item.route}`);
    bar.appendChild(btn);
  });
  return bar;
}

function render() {
  if (!state.authReady) {
    app.innerHTML = `<div class="empty" style="margin-top:80px;">불러오는 중…</div>`;
    return;
  }
  if (!state.user) {
    renderLogin();
    return;
  }

  const { name, params } = parseRoute();
  app.innerHTML = "";
  const wrap = el("div");
  wrap.appendChild(renderTabbar(name));
  const page = el("div");

  switch (name) {
    case "japanese": renderJapanese(page, params); break;
    case "exercise": renderExercise(page); break;
    case "diet": renderDiet(page); break;
    case "settings": renderSettings(page); break;
    case "home":
    default: renderHome(page); break;
  }
  wrap.appendChild(page);
  app.appendChild(wrap);
}

setRenderer(render);
window.addEventListener("hashchange", render);

onAuth(async (user) => {
  clearSubs();
  state.user = user;
  state.authReady = true;

  if (user) {
    await loadStaticData();
    unsubs.push(watchAllCheckins(user.uid, (map) => { state.checkins = map; rerender(); }));
    unsubs.push(watchProgress(user.uid, "jp1000", (d) => { state.progress.jp1000 = d; rerender(); }));
    unsubs.push(watchProgress(user.uid, "karugaru", (d) => { state.progress.karugaru = d; rerender(); }));
    unsubs.push(watchSettings(user.uid, (d) => { if (d) state.settings = { ...state.settings, ...d }; rerender(); }));
    toast(`환영합니다, ${user.email}`);
  }
  render();
});

window.__logout = logout; // 설정 페이지에서 사용
