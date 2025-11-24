# Apple 로그인 설정 완료 가이드

## ✅ 코드 구현 완료

### 구현된 기능
- ✅ Apple 로그인 함수 구현 완료
- ✅ Firebase Auth와 연동
- ✅ 에러 처리 포함
- ✅ 로그인 취소 처리 포함

## ⚠️ Xcode 프로젝트 설정 필요

### 1. Sign in with Apple Capability 추가 (필수!)

**Xcode에서 설정**:
1. Xcode에서 `ios/CodiPop.xcworkspace` 열기
2. 프로젝트 네비게이터에서 **CodiPop** 프로젝트 선택
3. **TARGETS** → **CodiPop** 선택
4. **Signing & Capabilities** 탭 클릭
5. **+ Capability** 버튼 클릭
6. **Sign in with Apple** 검색 및 추가

### 2. App ID 설정 확인 (Apple Developer)

**Apple Developer Console에서**:
1. [Apple Developer](https://developer.apple.com/account/) 접속
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. 앱 ID 선택 (`com.mk.codipop`)
4. **Sign in with Apple** 기능이 활성화되어 있는지 확인
5. 없다면 **Edit** → **Sign in with Apple** 체크 → **Save**

### 3. Info.plist 확인

현재 `Info.plist`는 기본 설정으로 충분합니다. 추가 설정이 필요하지 않습니다.

## 📋 체크리스트

### 코드 (완료 ✅)
- [x] Apple 로그인 함수 구현
- [x] Firebase Auth 연동
- [x] 에러 처리
- [x] 패키지 설치 확인 (`@invertase/react-native-apple-authentication`)

### Xcode 설정 (필요 ⚠️)
- [ ] Sign in with Apple Capability 추가
- [ ] Apple Developer Console에서 App ID 설정 확인

### 테스트
- [ ] 실제 iOS 기기에서 테스트 (시뮬레이터에서는 작동하지 않음)
- [ ] Apple ID로 로그인 테스트

## 🚀 테스트 방법

### 중요: 시뮬레이터에서는 작동하지 않음
Apple 로그인은 **실제 iOS 기기**에서만 테스트할 수 있습니다.

1. **실제 iOS 기기 연결**
2. **Xcode에서 기기 선택**
3. **Run** (⌘R)
4. **앱 실행 후 Apple 로그인 버튼 클릭**
5. **Apple ID로 로그인 테스트**

## ⚠️ 주의사항

1. **시뮬레이터 제한**: Apple 로그인은 시뮬레이터에서 작동하지 않습니다
2. **Apple Developer 계정 필요**: Sign in with Apple 기능 사용 시 Apple Developer 계정이 필요합니다
3. **App Store Connect 설정**: App Store에 제출할 때 Sign in with Apple을 사용한다고 선언해야 합니다

## 📝 구현된 코드 요약

```typescript
const onAppleButtonPress = async () => {
  // Apple 로그인 요청
  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  // Firebase 인증서 생성 및 로그인
  const {identityToken, nonce} = appleAuthRequestResponse;
  const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
  await auth().signInWithCredential(appleCredential);
};
```

## ✅ 다음 단계

1. **Xcode에서 Sign in with Apple Capability 추가**
2. **Apple Developer Console에서 App ID 확인**
3. **실제 iOS 기기에서 테스트**

코드 구현은 완료되었습니다! Xcode 설정만 추가하면 됩니다.

