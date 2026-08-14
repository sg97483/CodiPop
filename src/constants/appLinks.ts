/**
 * 스토어 주소.
 *
 * 초대 메시지에 붙습니다 — 링크가 없으면 초대받은 사람이 앱을 어디서 받는지 몰라
 * 초대 코드만 덩그러니 남습니다.
 *
 * **두 스토어를 모두 넣습니다.** 보내는 사람은 받는 사람이 안드로이드인지 아이폰인지
 * 모르는 채로 공유합니다. 한쪽만 넣으면 나머지 절반은 받아도 설치할 수가 없습니다.
 */
export const ANDROID_PACKAGE = 'com.mk.codipop';

/** App Store 숫자 ID. 번들 ID `com.mk.codipop` 로 조회해 확인한 값입니다. */
export const IOS_APP_ID = '6755323442';

export const ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * 짧은 형태를 씁니다. 앱 이름이 들어간 긴 주소도 동작하지만,
 * 한글이 퍼센트 인코딩되어 메시지에서 두 줄을 잡아먹습니다.
 */
export const IOS_STORE_URL = IOS_APP_ID
  ? `https://apps.apple.com/kr/app/id${IOS_APP_ID}`
  : '';

/**
 * 초대 메시지에 붙일 다운로드 안내.
 * 값이 빈 스토어는 줄째로 빠집니다 — 깨진 링크를 보내지 않기 위해서입니다.
 */
export function buildStoreLinksText(): string {
  const lines: string[] = [];
  if (IOS_STORE_URL) {
    lines.push(`아이폰: ${IOS_STORE_URL}`);
  }
  if (ANDROID_STORE_URL) {
    lines.push(`안드로이드: ${ANDROID_STORE_URL}`);
  }
  return lines.join('\n');
}

/**
 * 초대 링크 — 공유 이미지의 QR 이 가리키는 주소.
 *
 * QR 은 주소를 하나만 담을 수 있는데 받는 사람이 아이폰인지 안드로이드인지는
 * 보내는 사람도 모릅니다. 그래서 **서버가 기기를 보고 알맞은 스토어로 안내**합니다.
 *
 * 예전에는 `codipop.app` 을 가리켰는데 **그 도메인은 존재하지 않아** 스캔해도
 * 아무 데도 가지 못했습니다. 바이럴 워터마크가 아무 일도 하지 않고 있었습니다.
 */
export const INVITE_BASE_URL = 'https://codipop-backend.onrender.com/invite';

export function buildInviteUrl(referralCode: string): string {
  return `${INVITE_BASE_URL}?code=${encodeURIComponent(referralCode)}`;
}
