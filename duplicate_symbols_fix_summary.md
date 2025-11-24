# Duplicate Symbols 오류 해결 요약

## 문제 원인

빌드 로그에서 확인된 `4 duplicate symbols` 오류는 다음과 같은 원인이었습니다:

1. **패치 파일 문제**: `patches/react-native-screens+4.16.0.patch` 파일이 `RNSGammaStubs.mm`에 `RNSBottomTabsHostComponentView`와 `RNSBottomTabsScreenComponentView`의 스텁 구현을 추가하고 있었습니다.

2. **실제 구현과의 중복**: 이 클래스들의 실제 구현이 이미 `node_modules/react-native-screens/ios/bottom-tabs/` 디렉터리에 존재합니다.

3. **정적 프레임워크 빌드**: `use_frameworks! :linkage => :static` 설정으로 인해 스텁과 실제 구현이 모두 프레임워크에 컴파일되어 중복 심볼 오류가 발생했습니다.

## 해결 방법

패치 파일에서 `RNSBottomTabs*` 관련 스텁 구현을 제거했습니다:

- `RNSGammaStubs.h`에서 `RNSBottomTabsHostComponentView`와 `RNSBottomTabsScreenComponentView` 인터페이스 선언 제거
- `RNSGammaStubs.mm`에서 해당 클래스의 구현과 관련 함수(`RNSBottomTabsCls`, `RNSBottomTabsScreenCls`) 제거

이제 `RNSBottomTabs*` 클래스는 `bottom-tabs/` 디렉터리의 실제 구현만 사용되므로 중복 심볼 오류가 발생하지 않습니다.

## 다음 단계

1. **Xcode에서 Clean Build Folder**: 
   - Xcode에서 `Product` > `Clean Build Folder` (단축키: `⇧⌘K`) 실행

2. **빌드 테스트**:
   - Xcode에서 `Product` > `Build` (단축키: `⌘B`) 실행
   - 또는 `Product` > `Run` (단축키: `⌘R`)로 실행 테스트

3. **빌드 성공 확인**:
   - 이전에 발생했던 `4 duplicate symbols` 오류가 더 이상 발생하지 않아야 합니다.

## 수정된 파일

- `patches/react-native-screens+4.16.0.patch`: BottomTabs 스텁 제거
- `node_modules/react-native-screens/ios/stubs/RNSGammaStubs.h`: 패치 적용됨
- `node_modules/react-native-screens/ios/stubs/RNSGammaStubs.mm`: 패치 적용됨

## 참고

- 패치는 `npm install` 또는 `npm run postinstall` 실행 시 자동으로 적용됩니다.
- `node_modules`를 삭제하고 재설치한 경우, `npm install` 후 패치가 자동으로 적용됩니다.

