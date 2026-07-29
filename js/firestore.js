// Firebase 연동 헬퍼. Firestore만 사용(Storage 유료 플랜 불필요) - 사진은 압축된 base64로 문서에 직접 저장.
import { toast } from "./state.js";
import { firebaseConfig } from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

function onSyncError(label) {
  return (err) => {
    console.error(`[firestore:${label}]`, err);
    toast(`⚠️ ${label} 동기화 실패: ${err.code || err.message}`);
  };
}

// ---- checkins/{date} ----
export function watchAllCheckins(uid, cb) {
  return onSnapshot(
    collection(db, "users", uid, "checkins"),
    (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      cb(map);
    },
    onSyncError("체크인 불러오기")
  );
}

export async function getCheckin(uid, date) {
  const snap = await getDoc(doc(db, "users", uid, "checkins", date));
  return snap.exists() ? snap.data() : {};
}

export function saveCheckin(uid, date, patch) {
  return setDoc(doc(db, "users", uid, "checkins", date), patch, { merge: true })
    .catch(onSyncError("체크인 저장"));
}

// ---- progress/{key} (jp1000 / karugaru 진행률) ----
export function watchProgress(uid, key, cb) {
  return onSnapshot(
    doc(db, "users", uid, "progress", key),
    (snap) => { cb(snap.exists() ? snap.data() : {}); },
    onSyncError("진행률 불러오기")
  );
}

export function saveProgress(uid, key, data) {
  return setDoc(doc(db, "users", uid, "progress", key), data, { merge: true })
    .catch(onSyncError("진행률 저장"));
}

// ---- settings ----
export function watchSettings(uid, cb) {
  return onSnapshot(
    doc(db, "users", uid, "settings", "main"),
    (snap) => { cb(snap.exists() ? snap.data() : null); },
    onSyncError("설정 불러오기")
  );
}

export function saveSettings(uid, data) {
  return setDoc(doc(db, "users", uid, "settings", "main"), data, { merge: true })
    .catch(onSyncError("설정 저장"));
}
