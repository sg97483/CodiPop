# 지원 중단된 API 경고 해결 가이드

## 🔍 문제 설명

Google Play Console에서 "앱에서 더 넓은 화면용으로 지원 중단된 API 또는 파라미터를 사용합니다" 경고가 발생했습니다.

### 지원 중단된 API들
- `android.view.Window.setStatusBarColor`
- `android.view.Window.getStatusBarColor`
- `android.view.Window.setNavigationBarColor`
- `android.view.Window.getNavigationBarColor`

### 문제가 발생하는 라이브러리들
1. **React Native StatusBar 모듈**
   - `com.facebook.react.modules.statusbar.StatusBarModule`
   - React Native의 StatusBar 컴포넌트 사용 시

2. **react-native-screens**
   - `com.swmansion.rnscreens`
   - 네비게이션 라이브러리에서 사용

3. **Material Design 라이브러리**
   - `com.google.android.material.internal.c.a`
   - Firebase나 다른 Google 라이브러리에서 사용

## ⚠️ 중요 참고사항

### 이것은 라이브러리 문제입니다

이 경고는 **앱 코드가 아닌 서드파티 라이브러리**에서 발생하는 것입니다:
- React Native 자체
- react-native-screens
- Material Design 라이브러리

### 현재 상태

- **즉시 해결 불가능**: 라이브러리 업데이트를 기다려야 함
- **앱 기능에는 영향 없음**: 경고일 뿐, 앱은 정상 작동
- **Android 15에서도 작동**: 다만 경고가 표시됨

## ✅ 해결 방법

### 방법 1: 라이브러리 업데이트 (권장, 장기적)

React Native와 관련 라이브러리들이 Android 15를 지원하는 버전으로 업데이트될 때까지 대기:

1. **React Native 업데이트 확인**
   - 현재: 0.74.2
   - 최신 버전 확인: [React Native Releases](https://github.com/facebook/react-native/releases)

2. **react-native-screens 업데이트**
   - 현재: ^4.16.0
   - 최신 버전 확인

3. **업데이트 후 재빌드**
   - 새 버전으로 업데이트
   - 재빌드 및 테스트

### 방법 2: 현재 상태 유지 (단기적)

- **경고는 무시 가능**: 앱 기능에는 영향 없음
- **Android 15에서도 작동**: 다만 경고만 표시됨
- **라이브러리 업데이트 대기**: React Native 팀이 해결할 때까지 대기

### 방법 3: StatusBar 사용 최소화 (선택사항)

앱에서 StatusBar를 직접 설정하는 부분이 있다면 제거:

```typescript
// 현재 코드 확인 필요
// StatusBar 컴포넌트 사용 최소화
```

## 📋 현재 사용 중인 라이브러리

### 확인된 라이브러리
- React Native: 0.74.2
- react-native-screens: ^4.16.0
- @react-navigation: 6.x
- Firebase 라이브러리들

### 업데이트 가능 여부
- React Native 0.74.2는 비교적 최신 버전
- react-native-screens 4.16.0도 최신 버전
- **문제**: 라이브러리들이 아직 Android 15의 새로운 API로 완전히 마이그레이션되지 않음

## 🎯 권장 조치

### 단기적 (지금)
1. **경고 무시**: 앱 기능에는 영향 없음
2. **정상 배포 가능**: 경고는 있지만 앱은 정상 작동
3. **모니터링**: 라이브러리 업데이트 확인

### 장기적 (향후)
1. **라이브러리 업데이트 확인**: 정기적으로 최신 버전 확인
2. **업데이트 적용**: 새 버전이 나오면 업데이트
3. **재빌드 및 테스트**: 업데이트 후 재빌드

## ⚠️ 중요 참고사항

### 이것은 경고입니다

- **앱 기능 정상**: 경고일 뿐, 앱은 정상 작동
- **Android 15 호환**: Android 15에서도 작동하지만 경고 표시
- **라이브러리 의존**: 앱 코드 문제가 아닌 라이브러리 문제

### 해결 시점

- **React Native 팀**: Android 15 지원 업데이트 대기
- **react-native-screens 팀**: 새 API로 마이그레이션 대기
- **예상 시간**: 수개월 내 업데이트 예상

## 📋 체크리스트

### 현재 상태
- [x] 경고 확인 완료
- [x] 원인 파악 완료 (라이브러리 문제)
- [ ] 라이브러리 업데이트 확인 (정기적으로)

### 향후 조치
- [ ] React Native 최신 버전 확인
- [ ] react-native-screens 최신 버전 확인
- [ ] 업데이트 가능 시 적용
- [ ] 재빌드 및 테스트

## 🎯 요약

1. **문제**: 서드파티 라이브러리가 지원 중단된 API 사용
2. **영향**: 경고만 표시, 앱 기능 정상
3. **해결**: 라이브러리 업데이트 대기 (장기적)
4. **현재**: 경고 무시하고 정상 배포 가능

**결론**: 이것은 라이브러리 문제이므로, 현재로서는 경고를 무시하고 정상적으로 배포할 수 있습니다. 라이브러리 업데이트가 나오면 그때 업데이트하면 됩니다.

