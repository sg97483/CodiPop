# iOS 배포 전 점검 결과

## ✅ 확인된 정상 사항

### 1. 기본 설정
- ✅ Bundle Identifier: `com.mk.codipop` (Android와 일치)
- ✅ 앱 이름: CodiPop
- ✅ iOS 최소 버전: 15.4
- ✅ Podfile 설정 정상

### 2. 권한 설정
- ✅ NSPhotoLibraryAddUsageDescription: 설정됨
- ✅ Podfile에 권한 설정 포함

### 3. Firebase 설정
- ✅ Firebase 라이브러리 포함
- ✅ Podfile에 Firebase 설정 포함

## ⚠️ 발견된 문제 및 수정 필요 사항

### 1. GoogleService-Info.plist 파일 누락 (중요!)
**문제**: Firebase 설정 파일이 없음
**해결**: Firebase Console에서 다운로드 필요

### 2. hasPlayServices() iOS 호출 문제 (중요!)
**문제**: `hasPlayServices()`는 Android 전용인데 iOS에서도 호출됨
**위치**: `src/screens/LoginScreen.tsx:46`
**해결**: Platform 체크 추가 필요

### 3. AppDelegate moduleName 불일치
**문제**: `AppDelegate.mm`에서 `moduleName = @"KachiApp"`로 되어 있음
**해결**: `@"CodiPop"`으로 변경 필요

### 4. NSLocationWhenInUseUsageDescription 빈 문자열
**문제**: 권한 설명이 비어있음
**해결**: 사용하지 않으면 제거, 사용하면 설명 추가

### 5. Apple 로그인 구현 확인 필요
**문제**: `onAppleButtonPress` 함수가 주석 처리되어 있음
**해결**: 구현 확인 및 완성 필요

### 6. 버전 정보 동기화
**문제**: iOS 버전이 Android와 다름
- iOS: 1.0 (MARKETING_VERSION), 1 (CURRENT_PROJECT_VERSION)
- Android: 1.0.4 (versionName), 4 (versionCode)
**해결**: 버전 동기화 권장

### 7. URL Scheme 설정 확인 필요
**문제**: Google 로그인용 URL Scheme 설정 확인 필요
**해결**: Info.plist에 REVERSED_CLIENT_ID 확인/추가

## 📋 수정 체크리스트

- [ ] GoogleService-Info.plist 다운로드 및 추가
- [ ] hasPlayServices() Platform 체크 추가
- [ ] AppDelegate moduleName 수정
- [ ] NSLocationWhenInUseUsageDescription 처리
- [ ] Apple 로그인 구현 확인
- [ ] 버전 정보 동기화 (선택사항)
- [ ] URL Scheme 설정 확인

