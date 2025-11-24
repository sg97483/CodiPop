#!/bin/bash

# Hermes framework dSYM을 Archive의 dSYMs 폴더로 복사하는 스크립트
# React Native 0.76 + static frameworks 환경에서 필요
# Build Phase 스크립트로 실행됩니다.

set -e

# Release 빌드가 아니면 스킵
if [ "${CONFIGURATION}" != "Release" ]; then
    exit 0
fi

# Archive 빌드가 아니면 스킵 (ARCHIVE_DSYMS_PATH가 설정되어 있어야 함)
if [ -z "${ARCHIVE_DSYMS_PATH}" ] && [ -z "${DWARF_DSYM_FOLDER_PATH}" ]; then
    echo "⚠️  Archive 빌드가 아닙니다 (스킵)"
    exit 0
fi

# Archive dSYMs 폴더 찾기
ARCHIVE_DSYMS_DIR=""
if [ -n "${ARCHIVE_DSYMS_PATH}" ]; then
    ARCHIVE_DSYMS_DIR="${ARCHIVE_DSYMS_PATH}"
elif [ -n "${DWARF_DSYM_FOLDER_PATH}" ]; then
    ARCHIVE_DSYMS_DIR="${DWARF_DSYM_FOLDER_PATH}"
fi

if [ -z "$ARCHIVE_DSYMS_DIR" ] || [ ! -d "$ARCHIVE_DSYMS_DIR" ]; then
    echo "⚠️  Archive dSYMs 폴더를 찾을 수 없습니다"
    exit 0
fi

echo "🔍 Hermes dSYM 검색 중... (dSYMs 폴더: $ARCHIVE_DSYMS_DIR)"

# Hermes dSYM 찾기 (여러 가능한 위치 확인)
HERMES_DSYM=""

# 1. Pods 빌드 디렉토리에서 찾기 (가장 가능성 높음)
if [ -n "$PODS_BUILD_DIR" ]; then
    echo "   1. PODS_BUILD_DIR 확인: $PODS_BUILD_DIR"
    # hermes-engine 타겟의 빌드 출력 디렉토리에서 찾기
    for search_path in "${PODS_BUILD_DIR}/hermes-engine" "${PODS_BUILD_DIR}/../hermes-engine"; do
        if [ -d "$search_path" ]; then
            found_dsym=$(find "$search_path" -name "hermes.framework.dSYM" -type d 2>/dev/null | head -1)
            if [ -n "$found_dsym" ] && [ -d "$found_dsym" ]; then
                HERMES_DSYM="$found_dsym"
                break
            fi
        fi
    done
fi

# 2. DWARF_DSYM_FOLDER_PATH에서 찾기
if [ -z "$HERMES_DSYM" ] && [ -n "$DWARF_DSYM_FOLDER_PATH" ]; then
    echo "   2. DWARF_DSYM_FOLDER_PATH 확인: $DWARF_DSYM_FOLDER_PATH"
    found_dsym=$(find "$DWARF_DSYM_FOLDER_PATH" -name "hermes.framework.dSYM" -type d 2>/dev/null | head -1)
    if [ -n "$found_dsym" ] && [ -d "$found_dsym" ]; then
        HERMES_DSYM="$found_dsym"
    fi
fi

# 3. DerivedData에서 찾기 (hermes-engine 타겟)
if [ -z "$HERMES_DSYM" ] && [ -n "$PROJECT_DIR" ]; then
    echo "   3. DerivedData에서 검색 중..."
    derived_data_paths=(
        "${HOME}/Library/Developer/Xcode/DerivedData"
        "${PODS_ROOT}/../DerivedData"
    )
    for derived_data in "${derived_data_paths[@]}"; do
        if [ -d "$derived_data" ]; then
            found_dsym=$(find "$derived_data" -path "*/hermes-engine*/Build/Products/Release-iphoneos/hermes.framework.dSYM" -type d 2>/dev/null | head -1)
            if [ -n "$found_dsym" ] && [ -d "$found_dsym" ]; then
                HERMES_DSYM="$found_dsym"
                break
            fi
        fi
    done
fi

# 4. BUILT_PRODUCTS_DIR에서 찾기
if [ -z "$HERMES_DSYM" ] && [ -n "$BUILT_PRODUCTS_DIR" ]; then
    echo "   4. BUILT_PRODUCTS_DIR 확인: $BUILT_PRODUCTS_DIR"
    if [ -d "${BUILT_PRODUCTS_DIR}/hermes.framework.dSYM" ]; then
        HERMES_DSYM="${BUILT_PRODUCTS_DIR}/hermes.framework.dSYM"
    fi
fi

if [ -n "$HERMES_DSYM" ] && [ -d "$HERMES_DSYM" ]; then
    echo "✅ Hermes dSYM 발견: $HERMES_DSYM"
    echo "📋 dSYMs 폴더로 복사: $ARCHIVE_DSYMS_DIR"
    
    # 기존 dSYM이 있으면 제거
    if [ -d "${ARCHIVE_DSYMS_DIR}/hermes.framework.dSYM" ]; then
        rm -rf "${ARCHIVE_DSYMS_DIR}/hermes.framework.dSYM"
    fi
    
    cp -R "$HERMES_DSYM" "$ARCHIVE_DSYMS_DIR/"
    echo "✅ Hermes dSYM 복사 완료: ${ARCHIVE_DSYMS_DIR}/hermes.framework.dSYM"
else
    echo "❌ Hermes dSYM을 찾을 수 없습니다"
    echo "   다음 위치를 확인했습니다:"
    echo "   - PODS_BUILD_DIR: ${PODS_BUILD_DIR:-없음}"
    echo "   - DWARF_DSYM_FOLDER_PATH: ${DWARF_DSYM_FOLDER_PATH:-없음}"
    echo "   - BUILT_PRODUCTS_DIR: ${BUILT_PRODUCTS_DIR:-없음}"
    echo "   - PROJECT_DIR: ${PROJECT_DIR:-없음}"
    # 에러로 종료하지 않고 경고만 표시 (빌드가 실패하지 않도록)
    exit 0
fi

