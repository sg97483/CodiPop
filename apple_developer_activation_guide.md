# Apple Developer Program 활성화 가이드

## ⏰ 활성화 시간

### 일반적인 활성화 시간
- **최소**: 즉시~1시간
- **일반**: 2-4시간
- **최대**: 24시간 (드물게 48시간)

### 확인 방법
1. [Apple Developer Portal](https://developer.apple.com/account/) 접속
2. 로그인 후 계정 상태 확인
3. "Certificates, Identifiers & Profiles" 메뉴 접근 가능한지 확인

## 🔍 현재 오류 원인

### 1. 계정 활성화 대기 중
- Apple Developer Program 결제 후 계정 활성화에 시간이 필요
- 아직 활성화되지 않았을 수 있음

### 2. 기기 등록 필요
- 오류 메시지: "Your team has no devices from which to generate a provisioning profile"
- 실제 iOS 기기를 연결하고 등록해야 함

## ✅ 해결 방법

### 방법 1: 활성화 대기 후 재시도 (권장)

1. **1-2시간 대기**
   - Apple Developer Program 활성화 대기

2. **Apple Developer Portal 확인**
   - [developer.apple.com/account](https://developer.apple.com/account/) 접속
   - 로그인 후 "Certificates, Identifiers & Profiles" 메뉴가 보이는지 확인

3. **Xcode에서 "Try Again" 클릭**
   - Signing & Capabilities 탭에서 "Try Again" 버튼 클릭

### 방법 2: 실제 iOS 기기 연결 및 등록

1. **실제 iOS 기기 연결**
   - USB 케이블로 Mac에 연결
   - 기기에서 "이 컴퓨터를 신뢰하시겠습니까?" → "신뢰" 선택

2. **Xcode에서 기기 선택**
   - Xcode 상단에서 연결된 기기 선택

3. **기기 등록**
   - Xcode가 자동으로 기기를 등록하려고 시도
   - 또는 Window → Devices and Simulators에서 수동 등록

4. **"Try Again" 클릭**
   - Signing & Capabilities 탭에서 "Try Again" 버튼 클릭

### 방법 3: Apple Developer Portal에서 수동 설정

1. **Apple Developer Portal 접속**
   - [developer.apple.com/account](https://developer.apple.com/account/) 접속
   - 로그인

2. **Certificates, Identifiers & Profiles 확인**
   - 메뉴가 보이면 계정이 활성화된 것
   - 보이지 않으면 아직 활성화 대기 중

3. **App ID 생성** (필요시)
   - Identifiers → + 버튼
   - App ID 선택
   - Bundle ID: `com.mk.codipop` 입력
   - Capabilities 선택 (Sign in with Apple 등)
   - Register

4. **기기 등록** (필요시)
   - Devices → + 버튼
   - 기기 UDID 입력
   - Register

## 📋 단계별 체크리스트

### 즉시 확인 가능
- [ ] Apple Developer Portal 접속 가능한지 확인
- [ ] "Certificates, Identifiers & Profiles" 메뉴 보이는지 확인
- [ ] 실제 iOS 기기 연결
- [ ] Xcode에서 기기 인식되는지 확인

### 활성화 대기 중
- [ ] 1-2시간 대기
- [ ] Apple Developer Portal 재확인
- [ ] Xcode에서 "Try Again" 클릭

### 활성화 후
- [ ] App ID 생성 확인
- [ ] Provisioning Profile 자동 생성 확인
- [ ] 빌드 및 실행 테스트

## ⚠️ 중요 참고사항

### Personal Team vs Paid Developer Program

**현재 상태**: "Personal Team"으로 표시됨
- Personal Team: 무료 계정 (제한적 기능)
- Paid Developer Program: 유료 계정 (전체 기능)

**확인 필요**:
- Apple Developer Program 결제가 완료되었는지 확인
- 계정이 Paid Developer Program으로 업그레이드되었는지 확인

### 계정 상태 확인

1. **Apple Developer Portal 접속**
2. **Membership 탭 확인**
3. **"Active" 상태인지 확인**
4. **만료일 확인**

## 🎯 권장 순서

1. **Apple Developer Portal 확인**
   - 계정 활성화 상태 확인
   - "Certificates, Identifiers & Profiles" 접근 가능한지 확인

2. **실제 iOS 기기 연결**
   - 기기를 Mac에 연결
   - Xcode에서 기기 인식 확인

3. **1-2시간 대기** (활성화 대기)
   - Apple Developer Program 활성화 대기

4. **Xcode에서 "Try Again" 클릭**
   - Signing & Capabilities 탭
   - "Try Again" 버튼 클릭

5. **빌드 테스트**
   - Product → Build (⌘B)
   - 오류 확인

## 💡 팁

- **Personal Team**: 무료 계정으로도 개발 및 테스트 가능 (제한적)
- **Paid Developer Program**: App Store 배포 및 전체 기능 사용 가능
- **기기 등록**: 실제 기기를 연결하면 자동으로 등록 시도

## ✅ 결론

1. **Apple Developer Program 활성화 대기** (1-2시간)
2. **실제 iOS 기기 연결** (기기 등록 필요)
3. **Xcode에서 "Try Again" 클릭**

결제 후 즉시 사용 가능하지 않을 수 있으니, 활성화 대기 후 재시도하세요!

