# React Native 업그레이드 가이드 - Gradle 8.9 호환성

## 🔍 현재 상황

- **현재 버전**: React Native 0.74.2
- **목표**: Gradle 8.9 + Android Gradle Plugin 8.7.0 호환
- **16KB 정렬**: 완전한 지원 필요

## 📋 React Native 버전별 Gradle 호환성

### React Native 0.74.x
- **Gradle**: 8.6 이하 권장
- **Android Gradle Plugin**: 8.3.x 이하
- **Gradle 8.9**: ❌ 호환되지 않음 (`serviceOf` 오류)

### React Native 0.75.x
- **Gradle**: 8.7+ 지원
- **Android Gradle Plugin**: 8.5+ 지원
- **Gradle 8.9**: ⚠️ 확인 필요 (부분 지원 가능)

### React Native 0.76.x (최신)
- **Gradle**: 8.9+ 지원
- **Android Gradle Plugin**: 8.7+ 지원
- **Gradle 8.9**: ✅ 완전 지원

## 🎯 권장 업그레이드 경로

### 옵션 1: React Native 0.75.x (최소 호환 버전)

**장점:**
- Gradle 8.7+ 지원
- Android Gradle Plugin 8.5+ 지원
- 0.74.2에서 업그레이드 부담 적음

**단점:**
- Gradle 8.9 완전 지원 여부 불확실
- 16KB 정렬 완전 지원 여부 불확실

### 옵션 2: React Native 0.76.x (권장)

**장점:**
- Gradle 8.9 완전 지원 ✅
- Android Gradle Plugin 8.7+ 완전 지원 ✅
- 16KB 정렬 완전 지원 ✅
- 최신 기능 및 버그 수정

**단점:**
- 0.74.2에서 업그레이드 시 변경사항 많음
- 일부 라이브러리 호환성 확인 필요

## 📋 업그레이드 전 확인사항

### 1. 현재 의존성 확인

**주요 라이브러리:**
- `@react-native-firebase/*`: 22.0.0
- `@react-navigation/*`: 6.x
- `react-native-screens`: ^4.16.0
- 기타 라이브러리들

### 2. 호환성 확인 필요

업그레이드 전에 다음을 확인해야 합니다:
- Firebase 라이브러리 호환성
- Navigation 라이브러리 호환성
- 기타 서드파티 라이브러리 호환성

## 🔄 업그레이드 절차 (React Native 0.75.x)

### 1단계: 버전 확인 및 백업

```bash
# 현재 버전 확인
cat package.json | grep "react-native"

# Git 커밋 (백업)
git add .
git commit -m "Before React Native upgrade"
```

### 2단계: React Native 업그레이드

```bash
# React Native 업그레이드
npm install react-native@0.75.4

# 또는 yarn
yarn add react-native@0.75.4
```

### 3단계: 관련 패키지 업데이트

```bash
# React Native 관련 패키지 업데이트
npm install @react-native/gradle-plugin@0.75.4
npm install @react-native/babel-preset@0.75.4
npm install @react-native/eslint-config@0.75.4
npm install @react-native/metro-config@0.75.4
npm install @react-native/typescript-config@0.75.4
```

### 4단계: Android 설정 업데이트

```gradle
// android/build.gradle
classpath("com.android.tools.build:gradle:8.7.0")

// android/gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-all.zip
```

### 5단계: 의존성 재설치

```bash
# Node modules 재설치
rm -rf node_modules
yarn install

# Android 의존성 업데이트
cd android
./gradlew clean
cd ..
```

## ⚠️ 주의사항

### Breaking Changes

React Native 0.75+에서 변경될 수 있는 사항:
- 새로운 아키텍처 기본 활성화 (선택사항)
- 일부 API 변경
- 라이브러리 호환성 문제

### 테스트 필수

업그레이드 후 반드시 테스트:
- 모든 화면 동작 확인
- 로그인 기능 테스트
- 이미지 업로드/다운로드 테스트
- 네비게이션 테스트

## 🎯 최종 권장사항

### 단기적 (지금)

**현재 설정 유지:**
- React Native 0.74.2
- Android Gradle Plugin 8.6.1
- Gradle 8.6
- 16KB 정렬 경고는 무시 (앱 기능 정상)

### 장기적 (향후)

**React Native 0.76.x로 업그레이드:**
- Gradle 8.9 완전 지원
- Android Gradle Plugin 8.7.0 사용 가능
- 16KB 정렬 완전 지원
- 충분한 테스트 후 업그레이드

## 📋 체크리스트

### 업그레이드 전
- [ ] 현재 프로젝트 백업
- [ ] 의존성 호환성 확인
- [ ] 업그레이드 계획 수립

### 업그레이드 중
- [ ] React Native 버전 업데이트
- [ ] 관련 패키지 업데이트
- [ ] Android 설정 업데이트
- [ ] 의존성 재설치

### 업그레이드 후
- [ ] 빌드 테스트
- [ ] 모든 기능 테스트
- [ ] 실제 기기 테스트
- [ ] 문제 발생 시 롤백 준비

## 🎯 요약

**최소 호환 버전**: React Native 0.75.x
**권장 버전**: React Native 0.76.x

**현재 권장**: 현재 설정 유지 (0.74.2 + AGP 8.6.1 + Gradle 8.6)
**향후 권장**: React Native 0.76.x로 업그레이드 (충분한 테스트 후)

