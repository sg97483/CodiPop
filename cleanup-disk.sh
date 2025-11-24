#!/bin/bash
# 디스크 공간 확보를 위한 정리 스크립트

echo "🧹 디스크 공간 정리 시작..."

# 1. Android 빌드 캐시 삭제
echo "📦 Android 빌드 캐시 정리 중..."
cd "$(dirname "$0")"
rm -rf android/app/build
rm -rf android/.gradle
rm -rf android/app/.cxx
find android -name ".cxx" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.cxx" -type d -exec rm -rf {} + 2>/dev/null || true

# 2. Metro 캐시 정리
echo "📦 Metro 캐시 정리 중..."
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true
rm -rf /tmp/react-* 2>/dev/null || true

# 3. Xcode Derived Data 정리 (iOS)
echo "📦 Xcode Derived Data 정리 중..."
rm -rf ~/Library/Developer/Xcode/DerivedData 2>/dev/null || true

# 4. Gradle 캐시 정리 (선택적 - 주의)
# echo "📦 Gradle 캐시 정리 중..."
# rm -rf ~/.gradle/caches 2>/dev/null || true

# 5. 디스크 사용량 확인
echo ""
echo "✅ 정리 완료!"
echo ""
echo "📊 디스크 사용량:"
df -h / | tail -1

