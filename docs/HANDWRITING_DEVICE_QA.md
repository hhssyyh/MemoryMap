# 손글씨 편집기 실기기 QA

두 기기에서 같은 문서를 사용해 검증한다. 모든 필수 항목이 통과하고 양쪽
플랫폼에서 문서를 다시 열 수 있기 전에는 출시 가능 상태로 판단하지 않는다.

## 자동 검증 결과 (2026-08-23)

현재 작업 트리는 다음 비실기기 검증을 통과했다.

* `npm test -- --runInBand`: 11 suites, 43 tests
* `npm run typecheck`
* JDK 21 + `./gradlew :native-ink-view:testDebugUnitTest :app:assembleDebug`
* Android 16 emulator + `./gradlew :native-ink-view:connectedDebugAndroidTest`
* 코드 서명을 끈 generic iOS Simulator 대상 `xcodebuild` Debug 빌드
* 실제 `PKStroke` 공통 포맷 왕복 실행 테스트

자동 구현 검증은 개발 Goal의 범위다. 실기기 승인은 제품 담당자에게 인계하며
개발 Goal 종료 조건에는 포함하지 않는다. Emulator와 Simulator 검증은 아래의
Pencil/S Pen latency, palm rejection, gesture, 성능 측정을 대신할 수 없다.

## iPad 개발 빌드

iOS 개발 client는 Expo Dev Launcher와 React Native debug runtime의 symbol을
일치시키기 위해 React Native를 소스에서 빌드한다. React Native 0.81에 포함된
fmt 11.0.2는 Apple Clang 21의 C++20 모드와 호환되지 않는다.
`plugins/withFmtXcode26Fix.js`는 React Native의 C++20 설정은 유지하면서 fmt
pod만 C++17로 컴파일한다. fmt 12 이상을 포함한 React Native로 업그레이드한
뒤에는 이 plugin을 제거한다.

네이티브 개발 client를 빌드하고 설치한다.

```sh
cd app
npx expo prebuild --platform ios
npm run ios:device:dev-client
```

다른 terminal에서 Expo tunnel을 사용하는 Metro를 실행한다.

```sh
cd app
npm run start:dev-client:tunnel
```

같은 신뢰할 수 있는 Wi-Fi에 연결되어 있다면 tunnel 대신 더 짧은 네트워크
경로를 사용하는 LAN server를 실행할 수 있다.

```sh
cd app
npm run start:dev-client:lan
```

스크립트는 iOS 개발 client scheme인 `exp+memory-map`을 명시한다. 체크인된
iOS와 Android 네이티브 프로젝트의 URI scheme이 아직 같지 않을 때 Expo CLI가
localhost QR로 fallback하는 것을 방지한다.

Tunnel은 개발용으로만 사용한다. Release 빌드에는 Expo Dev Launcher와 Dev
Menu가 포함되지 않는다. 출시 안정화 단계에서 `buildReactNativeFromSource`를
재평가하고 fmt workaround를 제거할 수 있는지 확인한다.

## 테스트 문서

* 세로와 가로 방향이 섞인 10페이지
* 문서 전체 1,000획
* 원본 긴 변이 4096px보다 큰 사진 여러 장과 스티커
* 잠금, 숨김, 복제, 순서 변경 상태의 레이어

## iPad + Apple Pencil

- [ ] 빠르게 펜과 형광펜을 움직여도 획이 펜촉에 붙어 보인다.
- [ ] 압력, tilt, azimuth가 저장·재실행·페이지 회전 후에도 유지된다.
- [ ] 손바닥 접촉으로 의도하지 않은 획이 생성되지 않는다.
- [ ] Apple Pencil로 필기하면서 한 손가락 이동과 두 손가락 확대·회전이 동작한다.
- [ ] 획 단위 지우기 제스처 하나가 undo 한 단계가 된다.
- [ ] 사진 이동, pinch, 모서리 크기 조절, 회전 핸들, 잠금, 숨김이 동작한다.
- [ ] 올가미로 여러 획을 함께 이동하고 undo 한 번으로 원래 위치에 복원한다.
- [ ] 저장되지 않은 변경이 있을 때 background로 전환해도 최신 revision이 복원된다.
- [ ] 10페이지 로드, 페이지 전환, undo, 썸네일 캡처, 자동 저장 중 눈에 띄는 멈춤이 없다.

## Galaxy Tab + S Pen

- [ ] 빠르게 펜과 형광펜을 움직여도 획이 펜촉에 붙어 보인다.
- [ ] 압력, tilt, azimuth가 저장·재실행·페이지 회전 후에도 유지된다.
- [ ] 손바닥 접촉과 취소된 pointer로 의도하지 않은 획이 생성되지 않는다.
- [ ] S Pen으로 필기하면서 한 손가락 이동과 두 손가락 확대·회전이 동작한다.
- [ ] Geometry 기반 획 단위 지우기 제스처 하나가 undo 한 단계가 된다.
- [ ] 사진 이동, pinch, 모서리 크기 조절, 회전 핸들, 잠금, 숨김이 동작한다.
- [ ] 올가미로 여러 획을 함께 이동하고 undo 한 번으로 원래 위치에 복원한다.
- [ ] 저장되지 않은 변경이 있을 때 background로 전환해도 최신 revision이 복원된다.
- [ ] 10페이지 로드, 페이지 전환, undo, 썸네일 캡처, 자동 저장 중 눈에 띄는 멈춤이 없다.

## 결과 기록

기기 모델, OS version, 앱 revision, 문서 load 시간, 최악의 페이지 전환 시간,
최악의 undo 시간, 자동 저장 시간, 관찰된 frame stall을 기록한다.
