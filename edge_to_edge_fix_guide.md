# 더 넓은 화면 지원 (Edge-to-Edge) 해결 가이드

## 🔍 문제 설명

Google Play Console에서 "더 넓은 화면용으로 지원 중단" 경고가 발생했습니다.

### 원인
- Android 15부터 SDK 35를 타겟팅하는 앱은 기본적으로 더 넓은 화면(Edge-to-Edge)을 표시합니다
- 앱이 insets를 처리하지 않으면 Android 15 이상에서 올바르게 표시되지 않을 수 있습니다

### 영향
- Android 15 기기에서 앱이 시스템 UI(상태바, 내비게이션 바)와 겹칠 수 있음
- 콘텐츠가 시스템 UI에 가려질 수 있음

## ✅ 해결 방법

### MainActivity에 Edge-to-Edge 지원 추가

**파일**: `android/app/src/main/java/com/mk/codipop/MainActivity.kt`

**추가된 코드:**
```kotlin
import androidx.core.view.WindowCompat

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    // Android 15 Edge-to-Edge 지원 (더 넓은 화면 지원)
    WindowCompat.setDecorFitsSystemWindows(window, false)
    // 스플래시 화면 초기화
    RNBootSplash.init(this, R.style.BootTheme)
}
```

### React Native의 자동 처리

React Native는 이미 `react-native-safe-area-context`를 통해 insets를 처리합니다:
- 프로젝트에 이미 설치되어 있음: `react-native-safe-area-context`
- 화면에서 `useSafeAreaInsets()` 훅 사용 중

## 📋 적용된 변경사항

### ✅ 완료된 수정

1. **WindowCompat import 추가**
2. **Edge-to-Edge 활성화**: `WindowCompat.setDecorFitsSystemWindows(window, false)`
3. **기존 코드 유지**: 스플래시 화면 초기화 코드 유지

## 🔄 다음 단계

### 1. 빌드 테스트

```bash
cd /Users/mac/Documents/CodiPop/android
./gradlew clean
./gradlew bundleRelease
```

### 2. 실제 기기에서 테스트

- Android 15 기기에서 테스트 (가능한 경우)
- 시스템 UI와 콘텐츠가 겹치지 않는지 확인
- SafeArea가 올바르게 작동하는지 확인

### 3. Google Play Console에 업로드

1. 새로 빌드한 AAB 파일 업로드
2. 버전 코드 6으로 업로드
3. 테스트 후 출시

## ⚠️ 중요 참고사항

### React Native Safe Area Context

프로젝트는 이미 `react-native-safe-area-context`를 사용하고 있습니다:
- `useSafeAreaInsets()` 훅으로 insets 처리
- 화면에서 이미 사용 중 (예: LoginScreen)

### 추가 확인 사항

모든 화면에서 SafeArea를 올바르게 사용하고 있는지 확인:
- `SafeAreaView` 사용
- `useSafeAreaInsets()` 훅 사용
- 콘텐츠가 시스템 UI에 가려지지 않는지 확인

## 📋 체크리스트

- [x] WindowCompat import 추가
- [x] Edge-to-Edge 활성화 코드 추가
- [ ] 빌드 테스트
- [ ] 실제 기기에서 테스트 (Android 15 가능한 경우)
- [ ] 모든 화면에서 SafeArea 확인
- [ ] 새 AAB 빌드 및 업로드

## 🎯 요약

1. **Edge-to-Edge 활성화**: `WindowCompat.setDecorFitsSystemWindows(window, false)` 추가
2. **기존 SafeArea 유지**: React Native의 SafeArea Context는 이미 작동 중
3. **빌드 및 테스트**: 새 버전 빌드 후 테스트
4. **업로드**: Google Play Console에 새 버전 업로드

이제 Android 15의 더 넓은 화면을 올바르게 지원합니다!

