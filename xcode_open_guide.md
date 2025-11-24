# Xcode 프로젝트 열기 가이드

## ❌ 잘못된 방법

### ios 폴더만 선택하고 열기
- `ios` 폴더를 선택하고 "Open" 클릭
- **결과**: Finder에서 폴더만 열리고 Xcode가 실행되지 않음

### .xcodeproj 파일 직접 열기
- `CodiPop.xcodeproj` 파일을 더블클릭
- **문제**: CocoaPods를 사용하는 프로젝트에서는 Pods가 제대로 로드되지 않을 수 있음

## ✅ 올바른 방법

### 방법 1: .xcworkspace 파일 열기 (권장)

1. **Finder에서 `ios` 폴더 열기**
2. **`CodiPop.xcworkspace` 파일 찾기**
3. **더블클릭하여 열기**
   - 또는 우클릭 → "Open With" → "Xcode"

### 방법 2: 터미널에서 열기

```bash
cd /Users/mac/Documents/CodiPop
open ios/CodiPop.xcworkspace
```

### 방법 3: Xcode에서 직접 열기

1. **Xcode 실행**
2. **File → Open** (⌘O)
3. **`ios/CodiPop.xcworkspace` 파일 선택**
4. **Open 클릭**

## 🔍 확인 방법

올바르게 열렸는지 확인:
- Xcode 상단에 **"CodiPop.xcworkspace"** 표시
- 왼쪽 프로젝트 네비게이터에 **"Pods"** 프로젝트가 보임
- **"CodiPop"**과 **"Pods"** 두 개의 프로젝트가 보임

## ⚠️ 중요 사항

### .xcworkspace vs .xcodeproj

- **`.xcworkspace`**: CocoaPods를 사용하는 프로젝트용
  - Pods가 포함되어 있음
  - ✅ **이것을 사용해야 함**

- **`.xcodeproj`**: 기본 Xcode 프로젝트 파일
  - Pods가 포함되지 않음
  - ❌ CocoaPods 프로젝트에서는 사용하지 않음

## 📋 체크리스트

- [ ] `ios/CodiPop.xcworkspace` 파일 찾기
- [ ] `.xcworkspace` 파일 더블클릭 또는 Xcode에서 열기
- [ ] Xcode에서 "Pods" 프로젝트가 보이는지 확인
- [ ] 빌드 테스트

## 🎯 요약

**올바른 방법**: `ios/CodiPop.xcworkspace` 파일을 열기
**잘못된 방법**: `ios` 폴더만 선택하거나 `.xcodeproj` 파일 열기

