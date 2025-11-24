# React Native 최소 호환 버전 - Gradle 8.9 + AGP 8.7.0

## 🎯 목표

- **Gradle**: 8.9
- **Android Gradle Plugin**: 8.7.0
- **16KB 정렬**: 완전 지원

## 📋 React Native 버전별 호환성

### React Native 0.74.x (현재)
- **Gradle**: 8.6 이하 권장
- **Android Gradle Plugin**: 8.3.x 이하
- **Gradle 8.9**: ❌ 호환되지 않음

### React Native 0.75.x (최소 호환 버전 추정)
- **Gradle**: 8.7+ 지원
- **Android Gradle Plugin**: 8.5+ 지원
- **Gradle 8.9**: ⚠️ 부분 지원 가능 (확인 필요)

### React Native 0.76.x (확실한 호환)
- **Gradle**: 8.9+ 지원 ✅
- **Android Gradle Plugin**: 8.7+ 지원 ✅
- **16KB 정렬**: 완전 지원 ✅

## 🎯 권장 최소 버전

### React Native 0.75.4 (최소 호환 버전)

**이유:**
- Gradle 8.7+ 지원 확인
- Android Gradle Plugin 8.5+ 지원
- 0.74.2에서 업그레이드 부담 적음
- Gradle 8.9 호환성 확인 필요 (테스트 필요)

**확인 필요:**
- Gradle 8.9와의 실제 호환성 테스트
- Android Gradle Plugin 8.7.0과의 호환성 테스트

### React Native 0.76.x (권장)

**이유:**
- Gradle 8.9 완전 지원 ✅
- Android Gradle Plugin 8.7.0 완전 지원 ✅
- 16KB 정렬 완전 지원 ✅
- 최신 안정 버전

## 📋 업그레이드 가이드 (React Native 0.75.4)

### 1단계: 현재 상태 백업

```bash
# Git 커밋
git add .
git commit -m "Before React Native 0.75.4 upgrade"
```

### 2단계: React Native 업그레이드

```bash
# React Native 업그레이드
yarn add react-native@0.75.4

# 관련 패키지 업데이트
yarn add @react-native/gradle-plugin@0.75.4
yarn add @react-native/babel-preset@0.75.84
yarn add @react-native/eslint-config@0.75.84
yarn add @react-native/metro-config@0.75.84
yarn add @react-native/typescript-config@0.75.84
```

### 3단계: Android 설정 업데이트

**android/build.gradle:**
```gradle
classpath("com.android.tools.build:gradle:8.7.0")
```

**android/gradle/wrapper/gradle-wrapper.properties:**
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-all.zip
```

### 4단계: 의존성 재설치

```bash
# Node modules 재설치
rm -rf node_modules
yarn install

# Android 의존성 업데이트
cd android
./gradlew clean
cd ..
```

### 5단계: 빌드 테스트

```bash
cd android
./gradlew bundleRelease
```

## ⚠️ 주의사항

### Breaking Changes 가능성

React Native 0.75.x에서 변경될 수 있는 사항:
- 일부 API 변경
- 라이브러리 호환성 문제
- 새로운 아키텍처 관련 변경

### 테스트 필수

업그레이드 후 반드시 테스트:
- 모든 화면 동작 확인
- 로그인 기능 테스트
- 이미지 업로드/다운로드 테스트
- 네비게이션 테스트

## 🎯 최종 권장사항

### 옵션 1: React Native 0.75.4 (최소 호환 버전)

**장점:**
- 0.74.2에서 업그레이드 부담 적음
- Gradle 8.7+ 지원
- Android Gradle Plugin 8.5+ 지원

**단점:**
- Gradle 8.9 호환성 테스트 필요
- Android Gradle Plugin 8.7.0 호환성 테스트 필요

### 옵션 2: React Native 0.76.x (권장)

**장점:**
- Gradle 8.9 완전 지원 ✅
- Android Gradle Plugin 8.7.0 완전 지원 ✅
- 16KB 정렬 완전 지원 ✅

**단점:**
- 0.74.2에서 업그레이드 시 변경사항 많음
- 더 많은 테스트 필요

## 📋 체크리스트

### 업그레이드 전
- [ ] 현재 프로젝트 백업
- [ ] 의존성 호환성 확인
- [ ] 업그레이드 계획 수립

### 업그레이드 중
- [ ] React Native 0.75.4 업데이트
- [ ] 관련 패키지 업데이트
- [ ] Android 설정 업데이트 (AGP 8.7.0, Gradle 8.9)
- [ ] 의존성 재설치

### 업그레이드 후
- [ ] 빌드 테스트
- [ ] Gradle 8.9 호환성 확인
- [ ] 모든 기능 테스트
- [ ] 실제 기기 테스트

## 🎯 요약

**최소 호환 버전**: React Native 0.75.4
**확실한 호환 버전**: React Native 0.76.x

**권장**: React Native 0.75.4로 업그레이드 후 Gradle 8.9 호환성 테스트

