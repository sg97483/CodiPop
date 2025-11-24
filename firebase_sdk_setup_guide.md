# Firebase SDK 추가 가이드

## ✅ 현재 상황 확인

프로젝트는 **CocoaPods**를 사용하고 있으며, **React Native Firebase**를 사용하고 있습니다.

## 🔍 확인 사항

### 이미 설치되어 있는지 확인

프로젝트는 이미 Firebase를 사용하고 있습니다:
- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`
- `@react-native-firebase/storage`
- `@react-native-firebase/messaging`

이들은 **React Native Firebase** 패키지로, CocoaPods를 통해 자동으로 설치됩니다.

## 📋 Firebase Console 단계 처리 방법

### Step 3: Firebase SDK 추가

**이 단계는 건너뛰어도 됩니다!**

이유:
- 프로젝트는 **React Native Firebase**를 사용
- CocoaPods를 통해 이미 Firebase SDK가 포함됨
- Swift Package Manager로 직접 추가할 필요 없음

**하지만 확인해야 할 사항:**
1. **Podfile에 Firebase 설정이 있는지 확인**
2. **pod install이 실행되었는지 확인**

### 확인 방법

터미널에서 실행:
```bash
cd /Users/mac/Documents/CodiPop/ios
pod install
```

이미 설치되어 있다면 "Pod installation complete!" 메시지가 나타납니다.

### Step 4: 초기화 코드 추가

**이 단계도 확인 필요!**

React Native Firebase는 자동으로 초기화되지만, `AppDelegate.mm`에서 Firebase 초기화 코드가 있는지 확인해야 합니다.

## ✅ 다음 단계

### 1. Podfile 확인 및 pod install 실행

```bash
cd /Users/mac/Documents/CodiPop/ios
pod install
```

### 2. AppDelegate.mm 확인

Firebase 초기화 코드가 있는지 확인:
- `#import <Firebase.h>` 또는
- `[FIRApp configure];` 또는
- React Native Firebase는 자동 초기화되므로 없어도 됨

### 3. Firebase Console에서 "다음" 클릭

Step 3과 Step 4는 React Native Firebase를 사용하는 경우 대부분 자동으로 처리되므로, Firebase Console에서 "다음" 버튼을 클릭하여 진행하면 됩니다.

## 🎯 요약

1. **Step 3 (Firebase SDK 추가)**: 건너뛰기 가능 ✅
   - React Native Firebase가 이미 설치되어 있음
   - CocoaPods를 통해 관리됨

2. **pod install 확인**: 실행하여 최신 상태 확인

3. **Firebase Console**: "다음" 버튼 클릭하여 진행

4. **Step 4 (초기화 코드)**: 확인만 하면 됨
   - React Native Firebase는 자동 초기화

## ⚠️ 중요 참고사항

- **Swift Package Manager 사용하지 않음**: 이 프로젝트는 CocoaPods 사용
- **React Native Firebase**: Swift Package Manager로 직접 추가할 필요 없음
- **자동 초기화**: React Native Firebase는 GoogleService-Info.plist를 자동으로 읽음

