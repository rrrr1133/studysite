// Firebase 연동 헬퍼. Firestore만 사용(Storage 유료 플랜 불필요) - 사진은 압축된 base64로 문서에 직접 저장.
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

// ---- checkins/{date} ----
export function watchAllCheckins(uid, cb) {
  return onSnapshot(collection(db, "users", uid, "checkins"), (snap) => {
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data(); });
    cb(map);
  });
}

export async function getCheckin(uid, date) {
  const snap = await getDoc(doc(db, "users", uid, "checkins", date));
  return snap.exists() ? snap.data() : {};
}

export async function saveCheckin(uid, date, patch) {
  await setDoc(doc(db, "users", uid, "checkins", date), patch, { merge: true });
}

// ---- progress/{key} (jp1000 / karugaru 진행률) ----
export function watchProgress(uid, key, cb) {
  return onSnapshot(doc(db, "users", uid, "progress", key), (snap) => {
    cb(snap.exists() ? snap.data() : {});
  });
}

export async function saveProgress(uid, key, data) {
  await setDoc(doc(db, "users", uid, "progress", key), data, { merge: true });
}

// ---- settings ----
export function watchSettings(uid, cb) {
  return onSnapshot(doc(db, "users", uid, "settings", "main"), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

export async function saveSettings(uid, data) {
  await setDoc(doc(db, "users", uid, "settings", "main"), data, { merge: true });
}
