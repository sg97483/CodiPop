# 빠른 빌드 확인 방법

## 문제
`xcodebuild` 전체 빌드는 5-10분 이상 걸릴 수 있습니다.

## 더 빠른 방법

### 방법 1: Xcode에서 직접 빌드 (권장)
1. Xcode에서 `CodiPop.xcworkspace` 열기
2. **Clean Build Folder** (⌘+Shift+K)
3. **Build** (⌘+B)
   - Xcode는 증분 빌드를 사용하므로 더 빠름
   - 에러가 즉시 표시됨
   - Report Navigator에서 상세 정보 확인 가능

### 방법 2: 링킹만 확인 (빠른 검증)
```bash
cd /Users/mac/Documents/CodiPop/ios
xcodebuild -workspace CodiPop.xcworkspace -scheme CodiPop -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15' clean build 2>&1 | tee /tmp/build.log
```

그 다음:
```bash
# duplicate symbols 확인
grep -i "duplicate symbol" /tmp/build.log

# 또는 linking errors만 확인
grep -i "ld:" /tmp/build.log | head -20
```

### 방법 3: Pod 설정만 확인
현재 Podfile 설정이 올바른지 확인:
- ✅ Firebase 명시적 선언 제거됨 (중복 방지)
- ✅ `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES` 설정됨
- ✅ `RNScreens` 모듈 설정 추가됨

## 권장 사항
**Xcode에서 직접 빌드하는 것이 가장 빠르고 정확합니다.**

1. Xcode 열기
2. Clean Build Folder
3. Build
4. 에러 확인 (Report Navigator에서 `duplicate symbol` 검색)

## 참고
- 전체 빌드: 5-10분 이상
- Xcode 증분 빌드: 1-3분 (변경사항만)
- 링킹 에러 확인: 빌드 완료 직후 즉시 확인 가능

