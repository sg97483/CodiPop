# 지원 중단된 API 경고 완전 해결 가이드

## 🔍 문제 설명

Google Play Console에서 "앱에서 더 넓은 화면용으로 지원 중단된 API 또는 파라미터를 사용합니다" 경고가 발생했습니다.

### 지원 중단된 API들
- `android.view.Window.setStatusBarColor`
- `android.view.Window.getStatusBarColor`
- `android.view.Window.setNavigationBarColor`
- `android.view.Window.getNavigationBarColor`

### 문제가 발생하는 위치
1. **React Native StatusBar 모듈**
   - `com.facebook.react.modules.statusbar.StatusBarModule`
   - 앱에서 `StatusBar` 컴포넌트 사용 시

2. **react-native-screens**
   - `com.swmansion.rnscreens`
   - 네비게이션 라이브러리

3. **Material Design 라이브러리**
   - Firebase나 다른 Google 라이브러리에서 사용

## ✅ 적용된 수정사항

### 1. StatusBar backgroundColor 제거

**수정된 파일들:**
- `src/screens/LoginScreen.tsx`
- `src/screens/CodiDetailScreen.tsx`
- `src/screens/OnboardingScreen.tsx`

**변경 사항:**
```typescript
// 이전
<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

// 이후
<StatusBar barStyle="dark-content" />
```

**효과:**
- `backgroundColor` 속성 제거로 일부 경고 완화
- Android 15의 Edge-to-Edge 모드에서 자동으로 처리됨

### 2. Edge-to-Edge 활성화 (이미 완료)

**파일**: `android/app/src/main/java/com/mk/codipop/MainActivity.kt`
```kotlin
WindowCompat.setDecorFitsSystemWindows(window, false)
```

## ⚠️ 남아있는 경고

### 라이브러리 문제

다음 라이브러리들이 여전히 지원 중단된 API를 사용합니다:
1. **React Native StatusBar 모듈** (내부적으로 사용)
2. **react-native-screens** (네비게이션)
3. **Material Design 라이브러리** (Firebase 등)

### 해결 방법

#### 단기적 (현재)
- ✅ StatusBar backgroundColor 제거 완료
- ✅ Edge-to-Edge 활성화 완료
- ⚠️ 라이브러리 경고는 남아있음 (정상)

#### 장기적 (향후)
1. **React Native 업데이트 대기**
   - React Native 팀이 Android 15 지원 업데이트
   - 예상: 수개월 내

2. **react-native-screens 업데이트 대기**
   - react-native-screens 팀이 새 API로 마이그레이션
   - 예상: 수개월 내

3. **라이브러리 업데이트 후 재빌드**
   - 새 버전으로 업데이트
   - 재빌드 및 테스트

## 📋 현재 상태

### 완료된 작업
- [x] StatusBar backgroundColor 제거
- [x] Edge-to-Edge 활성화
- [x] 16KB 정렬 설정
- [x] 빌드 도구 업데이트

### 남아있는 경고
- [ ] React Native StatusBar 모듈 (라이브러리 문제)
- [ ] react-native-screens (라이브러리 문제)
- [ ] Material Design 라이브러리 (라이브러리 문제)

## 🎯 권장 조치

### 지금 할 일
1. **새 버전 빌드**
   ```bash
   cd /Users/mac/Documents/CodiPop/android
   ./gradlew clean
   ./gradlew bundleRelease
   ```

2. **Google Play Console에 업로드**
   - 버전 코드 6으로 업로드
   - 경고가 줄어들었는지 확인

3. **정상 배포 가능**
   - 남아있는 경고는 라이브러리 문제
   - 앱 기능에는 영향 없음
   - 정상적으로 배포 가능

### 향후 할 일
1. **라이브러리 업데이트 모니터링**
   - React Native 최신 버전 확인
   - react-native-screens 최신 버전 확인

2. **업데이트 적용**
   - 새 버전이 나오면 업데이트
   - 재빌드 및 테스트

## ⚠️ 중요 참고사항

### 이것은 경고입니다

- **앱 기능 정상**: 경고일 뿐, 앱은 정상 작동
- **Android 15 호환**: Android 15에서도 작동
- **배포 가능**: 경고가 있어도 정상 배포 가능

### 라이브러리 의존성

- **앱 코드 문제 아님**: 앱 코드는 수정 완료
- **라이브러리 문제**: React Native와 서드파티 라이브러리 문제
- **해결 시점**: 라이브러리 업데이트 대기

## 📊 경고 감소 예상

### 수정 전
- StatusBar backgroundColor 사용 (앱 코드)
- Edge-to-Edge 미활성화
- 라이브러리 경고

### 수정 후
- ✅ StatusBar backgroundColor 제거 (앱 코드)
- ✅ Edge-to-Edge 활성화
- ⚠️ 라이브러리 경고 (남아있음, 정상)

**예상**: 경고가 상당히 줄어들 것입니다!

## 🎯 요약

1. **StatusBar backgroundColor 제거**: 완료 ✅
2. **Edge-to-Edge 활성화**: 완료 ✅
3. **라이브러리 경고**: 남아있음 (정상, 무시 가능)
4. **새 버전 빌드**: 필요
5. **정상 배포 가능**: 경고가 있어도 배포 가능

**결론**: 앱 코드 수정은 완료되었습니다. 남아있는 경고는 라이브러리 문제이므로 무시하고 정상적으로 배포할 수 있습니다.

