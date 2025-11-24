# Xcode PIF Transfer Session 오류 해결 가이드

## 문제
"Build service could not create build operation: unable to initiate PIF transfer session (operation in progress?)" 오류

## 해결 방법

### 1. Xcode 완전 종료
- Xcode를 완전히 종료합니다 (Cmd+Q)
- Dock에서 Xcode가 실행 중인지 확인하고 모두 종료

### 2. Xcode 재시작
- Xcode를 다시 실행합니다
- 프로젝트를 다시 엽니다 (CodiPop.xcworkspace)

### 3. Clean Build Folder
- Xcode에서: Product > Clean Build Folder (Cmd+Shift+K)
- 또는: Product > Clean (Cmd+K) 후 Build Folder 수동 삭제

### 4. 빌드 시도
- Product > Build (Cmd+B)
- 또는 실제 기기/시뮬레이터에서 실행

## 이미 수행한 작업
✅ Derived Data 삭제 완료
✅ Xcode 빌드 프로세스 정리 완료
✅ iOS build 폴더 삭제 완료
✅ Xcode 캐시 정리 완료

## 추가 해결 방법 (위 방법이 안 될 경우)

### 방법 1: Xcode 재설치 (최후의 수단)
```bash
# Xcode 완전 종료 후
sudo rm -rf ~/Library/Developer/Xcode/DerivedData
sudo rm -rf ~/Library/Caches/com.apple.dt.Xcode
```

### 방법 2: 프로젝트 파일 재생성
```bash
cd /Users/mac/Documents/CodiPop/ios
rm -rf Pods Podfile.lock
pod install
```

### 방법 3: Xcode 빌드 시스템 재설정
Xcode > Settings > Locations > Derived Data 경로 확인
해당 폴더 전체 삭제 후 Xcode 재시작

## 참고
- 이 오류는 Xcode 내부 빌드 시스템 문제입니다
- 코드 문제가 아니라 Xcode 자체의 문제입니다
- 캐시 정리 후 대부분 해결됩니다

