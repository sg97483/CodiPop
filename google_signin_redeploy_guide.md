# Google 로그인 - 재배포 필요 여부

## 🔍 현재 상황

### 완료된 작업
- ✅ Firebase Console에 Release SHA-1 추가
- ✅ Google Cloud Console OAuth 클라이언트에 Release SHA-1 추가
- ✅ google-services.json 업데이트 완료

### 중요 포인트

**Google Sign-In은 Google Cloud Console의 OAuth 클라이언트 설정을 사용합니다.**

- SHA-1이 Google Cloud Console에 등록되어 있으면, **기존에 배포된 앱도 작동할 수 있습니다**
- google-services.json은 주로 Firebase 서비스(Firestore, Storage 등)에 사용됩니다
- Google Sign-In의 경우, Google Cloud Console 설정이 더 중요합니다

## 📋 두 가지 옵션

### 옵션 1: 재배포 없이 테스트 (먼저 시도 권장)

**장점:**
- 즉시 테스트 가능
- 새 버전 빌드/업로드 불필요

**단계:**
1. 5-10분 대기 (SHA-1 등록 반영 시간)
2. Google Play Store에서 기존 앱 재다운로드
3. Google 로그인 테스트

**결과:**
- SHA-1이 Google Cloud Console에 등록되어 있으면 작동할 가능성이 높습니다
- google-services.json은 이전 버전이지만, Google Sign-In에는 직접적인 영향이 적습니다

### 옵션 2: 새 버전 빌드 및 재배포 (권장)

**장점:**
- 최신 google-services.json 포함
- 모든 설정이 완전히 동기화됨
- 향후 문제 방지

**단계:**
1. 버전 코드/이름 업데이트 (선택사항)
2. 새 AAB 빌드
3. Google Play Console에 업로드
4. 테스트 트랙에 배포
5. 테스트

## 🎯 권장 순서

### 1단계: 먼저 재배포 없이 테스트

1. **5-10분 대기**
2. **Google Play Store에서 앱 재다운로드**
   - 기존 앱 삭제 후 재설치
3. **Google 로그인 테스트**
   - 작동하면 완료! ✅
   - 작동하지 않으면 2단계로 진행

### 2단계: 작동하지 않으면 재배포

1. **버전 업데이트** (선택사항)
   ```gradle
   versionCode 4  // 3에서 4로 증가
   versionName "1.0.4"  // 또는 원하는 버전
   ```

2. **AAB 빌드**
   ```bash
   cd android && ./gradlew bundleRelease
   ```

3. **Google Play Console에 업로드**
   - 내부 테스트 또는 비공개 테스트 트랙에 업로드

4. **테스트**

## ⚠️ 중요 참고사항

### 재배포가 필요한 경우
- google-services.json의 다른 설정이 변경된 경우
- Firebase 서비스(Firestore, Storage 등) 설정이 변경된 경우
- 완전히 새로운 설정을 적용하고 싶은 경우

### 재배포가 불필요한 경우
- SHA-1만 추가한 경우 (Google Cloud Console에 등록되어 있으면 작동)
- Google Sign-In만 사용하는 경우
- 기존 앱이 정상 작동하는 경우

## 📋 체크리스트

### 먼저 시도 (재배포 없이)
- [ ] 5-10분 대기
- [ ] Google Play Store에서 앱 재다운로드
- [ ] Google 로그인 테스트
- [ ] 작동 여부 확인

### 작동하지 않으면 (재배포)
- [ ] 버전 코드/이름 업데이트
- [ ] AAB 빌드
- [ ] Google Play Console에 업로드
- [ ] 테스트

## 🎯 결론

**먼저 재배포 없이 테스트해보세요!**

SHA-1이 Google Cloud Console에 등록되어 있으면, 기존 앱도 작동할 가능성이 높습니다. 
작동하지 않으면 그때 새 버전을 빌드하고 배포하면 됩니다.


