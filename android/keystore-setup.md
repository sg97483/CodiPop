# Release Keystore 설정 가이드

## 1. 키스토어 생성

`android/app` 디렉토리에서 다음 명령어를 실행하세요:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

명령어 실행 시 다음 정보를 입력하세요:
- **비밀번호**: 안전한 비밀번호를 입력하세요 (나중에 gradle.properties에 사용)
- **이름, 조직 등**: 앱 정보를 입력하세요

## 2. gradle.properties 설정

`android/gradle.properties` 파일을 열고 다음 값을 실제 키스토어 정보로 수정하세요:

```
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=실제_스토어_비밀번호
MYAPP_RELEASE_KEY_PASSWORD=실제_키_비밀번호
```

⚠️ **중요**: 
- `gradle.properties` 파일은 **절대 Git에 커밋하지 마세요!**
- `.gitignore`에 `gradle.properties`가 포함되어 있는지 확인하세요
- 키스토어 파일(`my-release-key.keystore`)도 안전한 곳에 백업하세요

## 3. AAB 빌드

설정이 완료되면 다음 명령어로 출시용 AAB를 생성하세요:

```bash
cd android
./gradlew bundleRelease
```

생성된 AAB 파일 위치:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## 4. 키스토어 파일 보안

키스토어 파일과 비밀번호를 안전하게 보관하세요:
- 키스토어 파일을 잃어버리면 업데이트를 할 수 없습니다
- 비밀번호를 잊어버려도 복구할 수 없습니다
- 안전한 곳에 백업하세요 (예: 1Password, LastPass 등)

