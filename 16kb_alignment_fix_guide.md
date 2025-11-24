# 16KB 네이티브 라이브러리 정렬 문제 해결 가이드

## 🔍 문제 설명

Google Play Console에서 "16KB 네이티브 라이브러리 정렬로 앱 재컴파일" 경고가 발생했습니다.

### 원인
- Android 15는 16KB 메모리 페이지 크기를 지원하는 기기를 지원합니다
- 현재 앱의 네이티브 라이브러리가 16KB 정렬되지 않아서 이러한 기기에서 문제가 발생할 수 있습니다

### 영향
- 16KB 페이지 크기 기기에서 앱 설치/시작 실패 가능
- 앱 시작 후 비정상 종료 가능

## ✅ 해결 방법

### 1. Android Gradle Plugin 업데이트

**변경 사항:**
- `8.2.1` → `8.7.0` (16KB 정렬 지원)

**파일**: `android/build.gradle`
```gradle
classpath("com.android.tools.build:gradle:8.7.0")
```

### 2. Gradle 버전 업데이트

**변경 사항:**
- `8.6` → `8.9` (16KB 정렬 지원)

**파일**: `android/gradle/wrapper/gradle-wrapper.properties`
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-all.zip
```

### 3. 빌드 설정에 16KB 정렬 옵션 추가

**파일**: `android/app/build.gradle`
```gradle
packaging {
    jniLibs {
        useLegacyPackaging = false
    }
}
```

## 📋 적용된 변경사항

### ✅ 완료된 수정

1. **Android Gradle Plugin**: 8.2.1 → 8.7.0
2. **Gradle**: 8.6 → 8.9
3. **packaging 설정**: 16KB 정렬 지원 추가

## 🔄 다음 단계

### 1. Gradle 동기화

터미널에서 실행:
```bash
cd /Users/mac/Documents/CodiPop/android
./gradlew --stop
./gradlew clean
```

### 2. 새 버전으로 빌드

```bash
# AAB 빌드
./gradlew bundleRelease

# 또는 APK 빌드
./gradlew assembleRelease
```

### 3. Google Play Console에 업로드

1. 새로 빌드한 AAB 파일 업로드
2. 버전 코드 증가 (현재: 5 → 6)
3. 테스트 후 출시

## ⚠️ 중요 참고사항

### 버전 코드 업데이트 필요

새 빌드를 위해 버전 코드를 증가시켜야 합니다:

**파일**: `android/app/build.gradle`
```gradle
versionCode 6  // 5에서 6으로 증가
versionName "1.0.6"  // 또는 원하는 버전
```

### 빌드 시간

- 첫 빌드 시 Gradle과 플러그인 다운로드로 시간이 걸릴 수 있습니다
- 네이티브 라이브러리 재컴파일로 빌드 시간이 증가할 수 있습니다

### 테스트 권장

- 새로 빌드한 앱을 실제 기기에서 테스트
- 특히 Android 15 기기에서 테스트 (가능한 경우)

## 📋 체크리스트

- [x] Android Gradle Plugin 업데이트 (8.7.0)
- [x] Gradle 버전 업데이트 (8.9)
- [x] packaging 설정 추가
- [ ] 버전 코드 증가 (5 → 6)
- [ ] Gradle 동기화 및 클린 빌드
- [ ] 새 AAB 빌드
- [ ] Google Play Console에 업로드

## 🎯 요약

1. **빌드 도구 업데이트**: Android Gradle Plugin 8.7.0, Gradle 8.9
2. **빌드 설정 추가**: 16KB 정렬 지원
3. **버전 코드 증가**: 5 → 6
4. **재빌드**: 새 AAB 생성
5. **업로드**: Google Play Console에 새 버전 업로드

이제 16KB 페이지 크기를 지원하는 기기에서도 정상적으로 작동할 것입니다!

