/**
 * 스토어 주소.
 *
 * 초대 메시지에 붙습니다 — 링크가 없으면 초대받은 사람이 앱을 어디서 받는지 몰라
 * 초대 코드만 덩그러니 남습니다.
 *
 * **iOS 는 심사 통과 후 숫자 ID 가 나오므로, 출시하면 아래 값을 채우세요.**
 * 비어 있으면 초대 메시지에서 그 줄만 빠집니다 (깨진 링크를 보내지 않기 위해).
 */
export const ANDROID_PACKAGE = 'com.mk.codipop';

/** 출시 후 App Store 숫자 ID 로 교체 (예: '6501234567'). 비우면 링크가 생략됩니다. */
export const IOS_APP_ID = '';

export const ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const IOS_STORE_URL = IOS_APP_ID
  ? `https://apps.apple.com/kr/app/id${IOS_APP_ID}`
  : '';

/** 초대 메시지에 붙일 다운로드 안내. 준비된 스토어만 넣습니다. */
export function buildStoreLinksText(): string {
  const lines: string[] = [];
  if (ANDROID_STORE_URL) {
    lines.push(`안드로이드: ${ANDROID_STORE_URL}`);
  }
  if (IOS_STORE_URL) {
    lines.push(`아이폰: ${IOS_STORE_URL}`);
  }
  return lines.join('\n');
}
