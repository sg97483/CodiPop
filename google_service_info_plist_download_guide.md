# GoogleService-Info.plist 다운로드 가이드

## 📋 단계별 진행 방법

### Step 1: 앱 등록 (현재 단계)

스크린샷을 보면 현재 **Step 1: 앱 등록** 단계입니다.

1. **Apple 번들 ID 확인**
   - 현재 입력된 값: `com.company.appname`
   - **수정 필요**: `com.mk.codipop`으로 변경

2. **앱 닉네임 (선택사항)**
   - 현재: "내 Apple 앱"
   - **수정 권장**: "CodiPop" 또는 원하는 이름

3. **App Store ID (선택사항)**
   - 아직 App Store에 등록하지 않았다면 비워두거나 나중에 추가 가능

4. **"앱 등록" 버튼 클릭**
   - 번들 ID를 `com.mk.codipop`으로 수정한 후 클릭

### Step 2: 구성 파일 다운로드 (다음 단계)

Step 1을 완료하면 자동으로 Step 2로 이동합니다.

1. **"GoogleService-Info.plist 다운로드" 버튼 클릭**
   - 파일이 자동으로 다운로드됩니다
   - 다운로드 폴더에 저장됩니다

2. **파일 위치 확인**
   - 일반적으로 `~/Downloads/GoogleService-Info.plist`에 저장됩니다

### Step 3: Xcode 프로젝트에 파일 추가

1. **Finder에서 다운로드한 파일 찾기**
   - `GoogleService-Info.plist` 파일

2. **Xcode에서 프로젝트 열기**
   - `ios/CodiPop.xcworkspace` 파일 열기

3. **파일을 프로젝트에 드래그 앤 드롭**
   - Xcode 왼쪽 프로젝트 네비게이터에서 **CodiPop** 폴더 선택
   - 다운로드한 `GoogleService-Info.plist` 파일을 **CodiPop** 폴더로 드래그
   - 또는 **File → Add Files to "CodiPop"** 메뉴 사용

4. **옵션 확인**
   - "Copy items if needed" 체크 (파일이 프로젝트 폴더에 복사됨)
   - "Add to targets: CodiPop" 체크
   - "Finish" 클릭

## 🔄 대안 방법: 기존 앱이 있다면

만약 Firebase Console에 이미 iOS 앱이 등록되어 있다면:

1. **Firebase Console 접속**
   - [Firebase Console](https://console.firebase.google.com/)

2. **프로젝트 선택**
   - codipop-63c0d 프로젝트 선택

3. **프로젝트 설정**
   - ⚙️ **프로젝트 설정** 클릭

4. **내 앱 → iOS 앱**
   - iOS 앱이 있다면 선택
   - 없다면 "앱 추가" → "iOS" 클릭

5. **GoogleService-Info.plist 다운로드**
   - iOS 앱 설정 페이지에서 **GoogleService-Info.plist 다운로드** 버튼 클릭

## ✅ 확인 사항

파일을 추가한 후 확인:
- [ ] `ios/CodiPop/GoogleService-Info.plist` 파일이 있는지 확인
- [ ] Xcode 프로젝트 네비게이터에 파일이 보이는지 확인
- [ ] 파일이 Target에 포함되어 있는지 확인 (파일 선택 → Target Membership 확인)

## 📝 중요 참고사항

- **스크린샷 불필요**: 실제 파일을 다운로드해야 합니다
- **번들 ID 확인**: `com.mk.codipop`으로 정확히 입력
- **파일 위치**: `ios/CodiPop/` 폴더에 있어야 합니다
- **Target 포함**: Xcode에서 Target에 포함되어 있는지 확인

## 🎯 요약

1. Step 1: 번들 ID를 `com.mk.codipop`으로 수정 → "앱 등록" 클릭
2. Step 2: "GoogleService-Info.plist 다운로드" 버튼 클릭
3. 다운로드한 파일을 Xcode 프로젝트에 추가
4. 파일이 `ios/CodiPop/GoogleService-Info.plist`에 있는지 확인

