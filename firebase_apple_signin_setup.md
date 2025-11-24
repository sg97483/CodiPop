# Firebase Console에서 Apple Sign In 활성화 가이드

## 문제
`[auth/operation-not-allowed] This operation is not allowed. You must enable this service in the console.`

이 오류는 Firebase Console에서 Apple Sign In 인증 제공자가 비활성화되어 있을 때 발생합니다.

## 해결 방법

### 1. Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 `codipop-63c0d` 선택

### 2. Authentication 설정
1. 왼쪽 메뉴에서 **"Authentication"** 클릭
2. 상단 탭에서 **"Sign-in method"** (또는 "로그인 방법") 클릭

### 3. Apple Sign In 활성화
1. 제공자 목록에서 **"Apple"** 찾기
2. **"Apple"** 클릭하여 설정 열기
3. **"Enable"** (또는 "사용 설정") 토글을 켜기
4. **"Save"** (또는 "저장") 클릭

### 4. 추가 설정 (필요한 경우)
- Apple Sign In을 사용하려면 Apple Developer 계정에서 App ID에 "Sign in with Apple" capability가 활성화되어 있어야 합니다.
- Xcode에서도 "Sign in with Apple" capability가 추가되어 있어야 합니다.

## 확인 사항
- ✅ Firebase Console에서 Apple Sign In이 "Enabled" 상태인지 확인
- ✅ Xcode 프로젝트에 "Sign in with Apple" capability 추가됨
- ✅ `CodiPop.entitlements` 파일에 Apple Sign In 권한 포함됨

## 참고
- Google Sign In도 동일한 방식으로 활성화되어 있는지 확인하세요.
- 변경 사항은 즉시 적용되지만, 때로는 몇 분 정도 걸릴 수 있습니다.

