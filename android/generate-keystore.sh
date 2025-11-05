#!/bin/bash

# Release 키스토어 생성 스크립트

echo "========================================="
echo "Release Keystore 생성"
echo "========================================="
echo ""

# android/app 디렉토리로 이동
cd "$(dirname "$0")/app" || exit

echo "키스토어를 생성합니다..."
echo ""

# 키스토어 생성
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ 키스토어 생성 완료!"
    echo "========================================="
    echo ""
    echo "다음 단계:"
    echo "1. android/gradle.properties 파일을 열어주세요"
    echo "2. 다음 값을 실제 비밀번호로 수정하세요:"
    echo "   - MYAPP_RELEASE_STORE_PASSWORD"
    echo "   - MYAPP_RELEASE_KEY_PASSWORD"
    echo ""
    echo "⚠️  중요: 키스토어 파일과 비밀번호를 안전하게 보관하세요!"
    echo "   키스토어를 잃어버리면 앱 업데이트가 불가능합니다."
else
    echo ""
    echo "❌ 키스토어 생성 실패"
    echo "keytool이 설치되어 있는지 확인하세요."
fi

