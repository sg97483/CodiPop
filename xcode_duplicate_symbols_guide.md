# Xcode에서 Duplicate Symbols 오류 확인하는 방법

## 방법 1: Report Navigator 사용 (가장 빠름)

1. **Xcode에서 Report Navigator 열기**
   - `⌘9` (Command + 9) 키를 누르거나
   - View > Navigators > Show Report Navigator

2. **최신 빌드 리포트 선택**
   - 왼쪽 사이드바에서 가장 최근의 빌드 리포트 클릭
   - 실패한 빌드(빨간색 아이콘)를 선택

3. **검색으로 오류 찾기**
   - 리포트 상단의 검색창에 `duplicate symbol` 입력
   - 또는 `ld:` 입력 (링커 오류 표시)

4. **상세 정보 확인**
   - 검색 결과에서 `duplicate symbol` 메시지 클릭
   - 어떤 심볼이 중복되었는지, 어느 라이브러리에서 발생했는지 확인

## 방법 2: Issue Navigator 사용

1. **Issue Navigator 열기**
   - `⌘5` (Command + 5) 키를 누르거나
   - View > Navigators > Show Issue Navigator

2. **오류 클릭**
   - "4 duplicate symbols" 오류를 클릭
   - 오류를 확장하면 각 중복 심볼의 상세 정보 표시

3. **상세 정보 확인**
   - 각 심볼 이름
   - 어느 라이브러리/파일에서 정의되었는지
   - 정확한 위치

## 방법 3: Build Log 확인

1. **Report Navigator에서 빌드 리포트 선택**
2. **상단 필터에서 "All Messages" 선택**
3. **검색창에 `duplicate symbol` 입력**
4. **각 오류 메시지 확인**

## 일반적인 중복 심볼 원인

### 1. Firebase 관련
- `GoogleUtilities`, `FirebaseCore` 등이 여러 번 링크
- **해결**: Podfile에서 중복 선언 제거 (이미 완료)

### 2. React Native 컴포넌트
- React Native 0.76 + static frameworks 조합에서 발생
- **해결**: Podfile 설정 조정 필요할 수 있음

### 3. 라이브러리 충돌
- 여러 라이브러리가 같은 심볼 export
- **해결**: 특정 라이브러리 제외 또는 버전 변경

## 다음 단계

1. **Xcode에서 정확한 심볼 이름 확인**
   - 위 방법 중 하나로 어떤 심볼이 중복되었는지 확인

2. **심볼 이름을 알려주세요**
   - 어떤 심볼이 중복되었는지 알려주시면 정확한 해결 방법 제시 가능

3. **일반적인 해결 방법 시도**
   - Podfile 설정 조정
   - 특정 라이브러리 제외
   - 빌드 설정 변경

