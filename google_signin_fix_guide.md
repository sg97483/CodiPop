# Google 로그인 DEVELOPER_ERROR 해결 가이드

## 🔍 문제 원인
Google Play Store에 배포된 앱은 **Release 키스토어**로 서명됩니다. 
Release 키스토어의 SHA-1 지문이 Firebase Console에 등록되지 않으면 `DEVELOPER_ERROR`가 발생합니다.

## ✅ 확인된 키스토어 정보

### Release 키스토어 (codipop.keystore)
- **SHA-1**: `2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32`
- **SHA-256**: `28:19:A8:69:A2:4F:1A:7B:95:FD:00:01:6A:7F:48:E5:9F:D1:AF:8F:D7:06:F5:6A:18:43:7E:3B:79:AC:9E:05`

## 📋 Firebase Console에 등록하는 방법

### 1단계: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (CodiPop)

### 2단계: Android 앱 설정으로 이동
1. 왼쪽 메뉴에서 ⚙️ **프로젝트 설정** 클릭
2. **내 앱** 섹션에서 Android 앱 선택 (com.mk.codipop)
3. **SHA 인증서 지문** 섹션으로 스크롤

### 3단계: SHA-1 지문 추가
1. **SHA 인증서 지문 추가** 버튼 클릭
2. 다음 SHA-1 지문 입력:
   ```
   2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32
   ```
3. **저장** 클릭

### 4단계: google-services.json 다운로드 (선택사항)
- SHA-1 추가 후 자동으로 업데이트되지만, 필요시 새로 다운로드 가능

### 5단계: Google Cloud Console 확인
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **API 및 서비스** > **사용자 인증 정보** 이동
4. OAuth 2.0 클라이언트 ID 확인
5. Android 앱의 **SHA-1 인증서 지문**에 위 SHA-1이 등록되어 있는지 확인

## ⚠️ 중요 사항

1. **SHA-1 추가 후 최대 1시간 소요**: Firebase Console에 SHA-1을 추가한 후 변경사항이 반영되는데 최대 1시간이 걸릴 수 있습니다.

2. **앱 재배포 불필요**: SHA-1만 등록하면 기존에 배포된 앱도 바로 작동합니다.

3. **Debug 키스토어도 확인**: 개발 중에는 Debug 키스토어의 SHA-1도 등록되어 있어야 합니다.

## 🔄 다음 단계

1. Firebase Console에 SHA-1 등록 완료
2. 1시간 대기 (또는 즉시 테스트)
3. Google Play Store에서 앱 재다운로드 및 테스트
4. Google 로그인 정상 작동 확인

## 📝 참고

- 현재 사용 중인 Web Client ID: `19675128705-m94gah4hdkv2vqfmbvuk8s17rb413jcj.apps.googleusercontent.com`
- 이 Client ID가 올바른 SHA-1과 연결되어 있는지 확인 필요

