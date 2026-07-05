# Diary Map

> 위치 기반 사진 및 다이어리 기록 서비스

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)

---

## 📖 About

Diary Map은 사용자가 방문한 장소에서 촬영한 사진을 기반으로
자동으로 위치를 기록하고, 지도 위에서 다이어리를 관리할 수 있는
크로스 플랫폼 모바일 애플리케이션입니다.

사진, 위치, 기록을 하나의 추억으로 저장합니다.

---

## ✨ Main Features

- 사진 촬영 및 업로드
- GPS 기반 위치 저장
- 지도 기반 다이어리 관리
- 다이어리 작성 / 수정 / 삭제

---

## 🛠 Tech Stack

### Mobile

- React Native
- Expo
- TypeScript
- Mapbox

### Backend

- Spring Boot

### Database

- PostgreSQL

---

## 📂 Project Structure

```
app/        # Mobile Application

backend/    # Spring Boot API

docs/       # Project Documentation
```

---

## 📄 Documentation

프로젝트 상세 문서는 `docs` 디렉터리에서 확인할 수 있습니다.

| Document            | Description           |
| ------------------- | --------------------- |
| PROJECT_OVERVIEW.md | 프로젝트 개요 및 목표 |
| FEATURES.md         | 기능 정의             |
| TECH_STACK.md       | 기술 스택             |
| ARCHITECTURE.md     | 시스템 아키텍처       |
| TODO.md             | 개발 진행 현황        |

---

## 🚀 Status

현재 프로젝트 초기 설계 단계입니다.

MVP 개발을 진행 중입니다.

---

## 실행 방법

Node.js가 설치된 환경에서 아래 명령어를 실행합니다.

```bash
cd app
npm ci
npm start
```

의존성이 이미 설치되어 있다면 이후에는 `app` 디렉터리에서 `npm start`만 실행하면 됩니다.

### Android 실기기 USB 연결

개발용 앱이 설치된 Android 기기를 USB로 연결한 경우 아래 명령어로 연결 상태를 확인합니다.

```powershell
adb devices
```

기기가 `device` 상태로 표시되면 Metro 서버의 8081 포트를 휴대폰으로 전달하고 개발 서버를 실행합니다.

```powershell
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

Metro 터미널에서 `a`를 누르면 연결된 Android 기기에서 앱이 열립니다. USB 케이블을 다시 연결하거나 ADB 서버가 재시작된 경우 `adb reverse tcp:8081 tcp:8081` 명령을 다시 실행해야 합니다.
