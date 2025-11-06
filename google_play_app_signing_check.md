# Google Play App Signing 확인 및 해결

## 🔍 문제 원인

Google Play Store에 앱을 업로드하면 **Google Play App Signing**이 활성화될 수 있습니다. 이 경우:
- 우리가 만든 Release 키스토어로 서명하는 것이 아니라
- **Google Play가 생성한 앱 서명 키**로 실제 앱이 서명됩니다
- 따라서 Google Play App Signing의 SHA-1을 등록해야 합니다

## 📋 Google Play Console에서 확인할 사항

### 1. 앱 서명 인증서 확인

1. [Google Play Console](https://play.google.com/console) 접속
2. 앱 선택 (CodiPop)
3. 왼쪽 메뉴에서 **릴리스** → **설정** → **앱 무결성** 클릭
4. 또는 **설정** → **앱 서명** 클릭
5. **앱 서명 인증서** 섹션 확인
6. **SHA-1 인증서 지문** 확인

### 2. 업로드 키 인증서 확인

같은 페이지에서:
- **업로드 키 인증서** 섹션 확인
- **SHA-1 인증서 지문** 확인

## 🔑 두 가지 키의 차이

### 업로드 키 (Upload Key)
- 우리가 만든 Release 키스토어
- AAB를 업로드할 때 사용하는 키
- SHA-1: `2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32`

### 앱 서명 키 (App Signing Key)
- Google Play가 생성한 키
- **실제로 사용자에게 배포되는 앱에 서명하는 키**
- 이 키의 SHA-1을 등록해야 합니다!

## ✅ 해결 방법

### 1단계: Google Play Console에서 앱 서명 키 SHA-1 확인

1. Google Play Console → 앱 선택
2. **설정** → **앱 서명** 또는 **릴리스** → **설정** → **앱 무결성**
3. **앱 서명 인증서** 섹션에서 **SHA-1 인증서 지문** 복사
4. 형식: `XX:XX:XX:XX:...` (콜론 포함)

### 2단계: Google Cloud Console에 앱 서명 키 SHA-1 등록

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **API 및 서비스** → **사용자 인증 정보**
4. Android 클라이언트들 확인:
   - `19675128705-upmtunbv16dbkb3c26l4k2uvan0t78no` (2025.11.6)
   - `19675128705-df7cgqcd3i286lmmnm650c8um5f9d5on` (2025.9.16)
5. 각 클라이언트 클릭
6. **SHA-1 인증서 지문 추가** 클릭
7. Google Play Console에서 복사한 **앱 서명 키 SHA-1** 입력
8. **저장** 클릭

### 3단계: Firebase Console에도 추가

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. ⚙️ **프로젝트 설정** → **내 앱** → Android 앱
4. **SHA 인증서 지문 추가** 클릭
5. Google Play Console에서 복사한 **앱 서명 키 SHA-1** 입력
6. **저장** 클릭

### 4단계: 대기 및 테스트

1. **5-10분 대기** (변경사항 반영 시간)
2. Google Play Store에서 앱 재다운로드
3. Google 로그인 테스트

## 📝 체크리스트

- [ ] Google Play Console에서 앱 서명 키 SHA-1 확인
- [ ] Google Cloud Console OAuth 클라이언트에 앱 서명 키 SHA-1 추가
- [ ] Firebase Console에 앱 서명 키 SHA-1 추가
- [ ] 5-10분 대기
- [ ] 앱 재다운로드 및 테스트

## ⚠️ 중요 참고사항

### Google Play App Signing이 활성화된 경우
- **업로드 키 SHA-1**: 우리가 만든 Release 키스토어 (이미 등록됨)
- **앱 서명 키 SHA-1**: Google Play가 생성한 키 (**이것을 등록해야 함!**)

### Google Play App Signing이 비활성화된 경우
- 업로드 키 = 앱 서명 키
- 이미 등록한 Release 키스토어 SHA-1이면 충분

## 🎯 다음 단계

1. **Google Play Console에서 앱 서명 키 SHA-1 확인**
2. **Google Cloud Console에 등록**
3. **Firebase Console에 등록**
4. **테스트**

이것이 가장 가능성 높은 원인입니다! Google Play Console에서 앱 서명 키 SHA-1을 확인해주세요.

