# 광고 ID 사용 여부 확인 결과

## ✅ 확인 완료

### 1. 앱 코드 분석
- ❌ Firebase Analytics 사용 없음
- ❌ AdMob/광고 SDK 사용 없음
- ❌ 광고 ID 관련 코드 없음
- ✅ 사용 중인 Firebase 모듈: Auth, Firestore, Storage, Messaging (광고 ID 미사용)

### 2. AndroidManifest.xml 확인
- ❌ `com.google.android.gms.permission.AD_ID` 권한 선언 없음
- ✅ 광고 관련 권한 없음

### 3. 의존성 확인
- ❌ `@react-native-firebase/analytics` 패키지 없음
- ❌ 광고 관련 SDK 없음

## 📋 Google Play Console 답변

**"앱에서 광고 ID를 사용하나요?" → "아니요" 선택**

### 이유:
1. 앱에서 광고 ID를 직접 사용하지 않음
2. 광고 SDK를 사용하지 않음
3. Firebase Analytics를 사용하지 않음
4. AndroidManifest.xml에 AD_ID 권한이 없음

### 참고사항:
- Firebase의 다른 모듈들(Auth, Firestore, Storage, Messaging)은 광고 ID를 사용하지 않습니다
- Firebase Analytics를 사용하지 않는 한, 광고 ID 선언이 필요하지 않습니다
- 이 선언을 "아니요"로 설정하면, Android 13+ 타겟팅 시에도 AD_ID 권한 없이 앱을 출시할 수 있습니다


