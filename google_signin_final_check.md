# Google 로그인 최종 확인 및 해결

## ✅ 확인된 정보

### 새 Android 클라이언트 (2025.11.6 생성)
- **Client ID**: `19675128705-upmtunbv16dbkb3c26l4k2uvan0t78no.apps.googleusercontent.com`

### Release 키스토어 SHA-1
- **SHA-1**: `2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32`

### 현재 코드 설정
- **Web Client ID 사용 중**: `19675128705-m94gah4hdkv2vqfmbvuk8s17rb413jcj.apps.googleusercontent.com`
- ✅ 이 설정은 올바릅니다 (Android와 iOS 모두에서 작동)

## 🔍 확인해야 할 사항

### 1. Google Cloud Console에서 SHA-1 확인
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **API 및 서비스** → **사용자 인증 정보**
4. Client ID `19675128705-upmtunbv16dbkb3c26l4k2uvan0t78no` 클릭
5. **SHA-1 인증서 지문** 섹션 확인
6. 다음 SHA-1이 등록되어 있는지 확인:
   ```
   2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32
   ```

### 2. SHA-1이 없다면 추가
1. Android 클라이언트 편집
2. **SHA-1 인증서 지문 추가** 클릭
3. 다음 SHA-1 입력:
   ```
   2D:FB:8F:C4:67:A6:AF:89:48:46:3D:C9:B9:32:43:65:83:14:E4:32
   ```
4. **저장** 클릭

### 3. Firebase Console에서 google-services.json 업데이트
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. ⚙️ **프로젝트 설정** → **내 앱** → Android 앱 (com.mk.codipop)
4. **google-services.json 다운로드** 클릭
5. 다운로드한 파일을 `android/app/google-services.json`에 덮어쓰기

## ⚠️ 중요 사항

### 코드 수정 불필요
현재 코드는 **Web Client ID**를 사용하고 있으며, 이것은 올바른 설정입니다:
```typescript
GoogleSignin.configure({
  webClientId: '19675128705-m94gah4hdkv2vqfmbvuk8s17rb413jcj.apps.googleusercontent.com',
});
```

**이유:**
- Web Client ID는 Android와 iOS 모두에서 작동합니다
- Android 클라이언트는 주로 앱 서명 확인용입니다
- SHA-1이 올바르게 등록되어 있으면 Web Client ID로도 정상 작동합니다

### DEVELOPER_ERROR 발생 원인
`DEVELOPER_ERROR`는 다음 중 하나일 때 발생합니다:
1. ❌ Release 키스토어의 SHA-1이 Android 클라이언트에 등록되지 않음
2. ❌ 잘못된 SHA-1이 등록됨
3. ❌ google-services.json이 오래된 버전

## 📋 해결 체크리스트

- [ ] Google Cloud Console에서 새 Android 클라이언트의 SHA-1 확인
- [ ] SHA-1이 없다면 Release 키스토어 SHA-1 추가
- [ ] Firebase Console에서 google-services.json 재다운로드
- [ ] 다운로드한 google-services.json을 프로젝트에 덮어쓰기
- [ ] 앱 재빌드 및 테스트

## 🔄 다음 단계

1. **SHA-1 확인 및 등록** (위의 1-2단계)
2. **google-services.json 업데이트** (3단계)
3. **앱 재빌드** (필요시)
4. **Google Play Store에서 앱 재다운로드 및 테스트**

## 💡 참고

- SHA-1 추가 후 최대 1시간 소요될 수 있지만, 보통 몇 분 내 반영됩니다
- 앱 재배포는 필요 없습니다 (SHA-1만 등록하면 됩니다)
- Web Client ID는 그대로 사용하면 됩니다


