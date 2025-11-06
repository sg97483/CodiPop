# Google Play Console - 앱 서명 인증서 SHA-1 확인 경로

## ❌ 현재 스크린샷
- **Play Integrity API 설정** 페이지
- 앱 서명 인증서 SHA-1을 확인하는 페이지가 아닙니다

## ✅ 올바른 경로

### 방법 1: 릴리스 메뉴에서 (권장)

1. [Google Play Console](https://play.google.com/console) 접속
2. 왼쪽 상단에서 **앱 선택** (CodiPop)
3. 왼쪽 메뉴에서 **릴리스** 클릭
4. **릴리스** 하위 메뉴에서 **설정** 클릭
5. **앱 무결성** 섹션 클릭
6. **앱 서명 인증서** 섹션에서 **SHA-1 인증서 지문** 확인

### 방법 2: 설정 메뉴에서

1. [Google Play Console](https://play.google.com/console) 접속
2. 왼쪽 상단에서 **앱 선택** (CodiPop)
3. 왼쪽 메뉴에서 **설정** 클릭
4. **앱 무결성** 또는 **앱 서명** 클릭
5. **앱 서명 인증서** 섹션에서 **SHA-1 인증서 지문** 확인

## 📋 찾아야 할 정보

### 앱 서명 인증서 (App Signing Certificate)
- **SHA-1 인증서 지문**: `XX:XX:XX:XX:...` 형식
- 이것이 **실제로 사용자에게 배포되는 앱에 서명하는 키**입니다
- 이 SHA-1을 Google Cloud Console과 Firebase Console에 등록해야 합니다

### 업로드 키 인증서 (Upload Key Certificate)
- 우리가 만든 Release 키스토어
- 이미 등록한 SHA-1: `2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32`

## 🎯 확인할 사항

앱 서명 인증서 섹션에서:
1. **SHA-1 인증서 지문** 복사
2. 형식: `XX:XX:XX:XX:XX:XX:...` (콜론 포함, 대문자 또는 소문자)
3. 이것이 업로드 키 SHA-1과 **다를 수 있습니다**

## 📝 스크린샷 예시

올바른 페이지에서는 다음과 같은 정보가 보여야 합니다:
- **앱 서명 인증서** (App Signing Certificate)
  - SHA-1 인증서 지문: `XX:XX:XX:...`
  - SHA-256 인증서 지문: `XX:XX:XX:...`
- **업로드 키 인증서** (Upload Key Certificate)
  - SHA-1 인증서 지문: `2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32`

## 🔄 다음 단계

1. **올바른 경로로 이동**
   - 릴리스 → 설정 → 앱 무결성
   - 또는 설정 → 앱 무결성/앱 서명

2. **앱 서명 인증서의 SHA-1 확인**
   - SHA-1 인증서 지문 복사

3. **Google Cloud Console에 등록**
   - API 및 서비스 → 사용자 인증 정보
   - Android 클라이언트에 SHA-1 추가

4. **Firebase Console에 등록**
   - 프로젝트 설정 → 내 앱 → Android 앱
   - SHA 인증서 지문 추가

5. **테스트**
   - 5-10분 대기
   - 앱 재다운로드 및 테스트

