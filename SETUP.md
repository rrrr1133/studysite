# 처음 한 번만 하면 되는 설정

이 사이트는 아이패드·모바일에서 기록이 서로 동기화되도록 Firebase(구글의 무료 클라우드)를 사용합니다.
아래 단계를 순서대로 따라 하면 됩니다. 막히는 부분이 있으면 그 단계까지 했다고 말해주면 이어서 도와드릴게요.

## 1. Firebase 프로젝트 만들기 (5분)

1. https://console.firebase.google.com 접속 → 구글 계정으로 로그인
2. "프로젝트 추가" 클릭 → 이름은 자유롭게 (예: `japan-it-study`) → 애널리틱스는 꺼도 됨 → 프로젝트 만들기
3. 왼쪽 메뉴 ⚙️ → "프로젝트 설정" → 아래로 스크롤해서 "내 앱" 섹션 → `</>` (웹) 아이콘 클릭
4. 앱 닉네임 아무거나 입력 (예: `study-web`) → "Firebase Hosting도 설정" 체크는 안 해도 됨 → 앱 등록
5. 화면에 나오는 `firebaseConfig = { apiKey: ..., authDomain: ..., ... }` 객체를 통째로 복사

## 2. 로그인 방식 켜기

1. 왼쪽 메뉴 "빌드" → "Authentication" → "시작하기"
2. "Sign-in method" 탭 → "이메일/비밀번호" 선택 → 사용 설정 → 저장

## 3. 데이터베이스(Firestore) 만들기

1. 왼쪽 메뉴 "빌드" → "Firestore Database" → "데이터베이스 만들기"
2. 위치는 기본값(또는 `asia-northeast3` 서울) 선택
3. 보안 규칙은 일단 "테스트 모드"로 시작해도 되고, 아래 4단계에서 바로 우리 규칙으로 덮어씁니다.

## 4. 보안 규칙 적용하기

Firestore Database → "규칙" 탭 → 아래 내용을 그대로 붙여넣고 "게시" 클릭
(이 프로젝트 폴더의 `firestore.rules` 파일과 동일한 내용입니다 — 본인 계정으로 로그인했을 때만 자신의 데이터를 읽고 쓸 수 있게 막아줍니다.)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5. 이 프로젝트에 config 붙여넣기

`firebase-config.js` 파일을 열어서, 1단계에서 복사한 `firebaseConfig` 값을 그대로 붙여넣으세요.

```js
export const firebaseConfig = {
  apiKey: "여기에 본인 값",
  authDomain: "여기에 본인 값",
  projectId: "여기에 본인 값",
  storageBucket: "여기에 본인 값",
  messagingSenderId: "여기에 본인 값",
  appId: "여기에 본인 값"
};
```

## 6. 로컬에서 먼저 테스트

터미널에서 이 폴더(`studysite`)로 이동한 뒤:

```
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속 → "계정 만들기"로 본인 이메일/비밀번호 가입 → 로그인되고 대시보드가 보이면 성공입니다.

## 7. Firebase Hosting으로 배포하기 (아이패드/모바일에서 쓰려면 필요)

1. Node.js가 없다면 설치: https://nodejs.org (LTS 버전)
2. 터미널에서:
   ```
   npm install -g firebase-tools
   firebase login
   ```
   → 브라우저가 열리며 본인 구글 계정으로 로그인 (1단계와 같은 계정)
3. `studysite` 폴더 안에서:
   ```
   firebase use --add
   ```
   → 1단계에서 만든 프로젝트 선택 → 별칭은 `default` 입력
4. 배포:
   ```
   firebase deploy --only hosting,firestore:rules
   ```
5. 완료되면 `https://<프로젝트ID>.web.app` 형태의 주소가 나옵니다. 이 주소를 아이패드/아이폰 홈 화면에 추가해두면 앱처럼 쓸 수 있어요 (Safari 공유 버튼 → "홈 화면에 추가").

## 이후에 코드가 바뀌면

다시 `firebase deploy --only hosting` 한 번이면 반영됩니다.

---

### 카루가루 단어 데이터 확인 안내

`data/karugaru.json` 안에 `"verify": true` 로 표시된 단어들은 PDF가 스캔본이라 OCR이 이미지 속 글자를 놓친 부분입니다.
일본어 공부 페이지 → 카루가루 단어 → 해당 Day 카드에 노란 "⚠️ PDF 원본 대조 필요" 배지가 붙어 있으니,
실제 책(또는 PDF)의 해당 과를 한 번씩만 펼쳐서 맞는지 확인하고 틀리면 `karugaru.json`의 값을 고쳐주세요.
