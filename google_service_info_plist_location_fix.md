# GoogleService-Info.plist 위치 수정 가이드

## ❌ 현재 문제

스크린샷을 보면 `GoogleService-Info` 파일이 **Pods** 폴더에 있습니다:
- 현재 경로: `CodiPop > Pods > GoogleService-Info`
- **이것은 잘못된 위치입니다!**

## ✅ 올바른 위치

`GoogleService-Info.plist` 파일은 **CodiPop** 폴더에 있어야 합니다:
- 올바른 경로: `CodiPop > CodiPop > GoogleService-Info.plist`

## 🔧 수정 방법

### 방법 1: 파일 이동 (권장)

1. **Xcode에서 파일 선택**
   - 현재 `Pods > GoogleService-Info` 파일 선택

2. **파일 삭제 (프로젝트에서만)**
   - 파일 선택 → 우클릭 → **Delete**
   - "Remove Reference" 선택 (파일 자체는 삭제하지 않음)

3. **올바른 위치에 다시 추가**
   - `CodiPop > CodiPop` 폴더 선택
   - Finder에서 `GoogleService-Info.plist` 파일 찾기
   - 파일을 `CodiPop` 폴더로 드래그 앤 드롭
   - 옵션 확인:
     - ✅ "Copy items if needed" 체크
     - ✅ "Add to targets: CodiPop" 체크
     - ✅ "Finish" 클릭

### 방법 2: 직접 파일 복사

1. **Finder에서 파일 찾기**
   - `Pods` 폴더에서 `GoogleService-Info.plist` 파일 찾기
   - 또는 다운로드 폴더에서 원본 파일 찾기

2. **올바른 위치로 복사**
   - `ios/CodiPop/GoogleService-Info.plist` 경로로 파일 복사

3. **Xcode에서 프로젝트 새로고침**
   - Xcode에서 파일이 자동으로 인식됨
   - 없다면 File → Add Files to "CodiPop" 메뉴 사용

## ✅ 확인 사항

수정 후 확인:
- [ ] 파일이 `CodiPop > CodiPop > GoogleService-Info.plist` 경로에 있는지 확인
- [ ] 파일이 `Pods` 폴더에 없는지 확인
- [ ] 파일 선택 → Target Membership에서 "CodiPop" 체크되어 있는지 확인
- [ ] 빌드 시 오류가 없는지 확인

## 📋 올바른 프로젝트 구조

```
CodiPop/
├── CodiPop/
│   ├── AppDelegate.mm
│   ├── Info.plist
│   ├── GoogleService-Info.plist  ← 여기에 있어야 함!
│   └── ...
├── Pods/  ← 여기 있으면 안 됨!
└── ...
```

## ⚠️ 중요 참고사항

- **Pods 폴더**: CocoaPods가 자동으로 관리하는 폴더
- **CodiPop 폴더**: 앱의 메인 소스 코드가 있는 폴더
- `GoogleService-Info.plist`는 앱의 일부이므로 **CodiPop 폴더**에 있어야 합니다

## 🎯 요약

1. 현재 위치: `Pods > GoogleService-Info` ❌
2. 올바른 위치: `CodiPop > CodiPop > GoogleService-Info.plist` ✅
3. 파일을 `CodiPop` 폴더로 이동
4. Target Membership 확인

