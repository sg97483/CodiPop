/**
 * 상품이 실제로 파는 사이즈를 해석합니다.
 *
 * **왜 필요한가.** 앱은 XS~XXL 로만 답하는데, 국내 여성 쇼핑몰은 대부분 다릅니다.
 *
 *   리린      [size:F(55~66)]        ← 프리 사이즈. 55~66 이 입을 수 있다는 뜻
 *   저스트원  FREE / FREE,L / S,M,L  ← 프리 단독, 프리+L 혼합, 알파벳 옵션
 *
 * 지금 `normalizeSizeLabel('F(55~66)')` 은 **null 을 돌려주고**, 그러면
 * `recommendClothingSize` 의 상품 사이즈 비교가 통째로 건너뛰어집니다.
 * 사용자는 옷장에 담은 국내 몰 상품에서 "상품 표기 대비" 안내를 아예 못 봅니다 —
 * 기능이 없는 줄 압니다.
 *
 * 규칙은 하나입니다.
 *
 *   **상품이 팔지 않는 사이즈는 절대 추천하지 않는다.**
 *
 * BMI 보정 규칙(`sizeRecommendService.ts`)은 웹 데모·위젯과 공유하므로 건드리지 않습니다.
 * 이 파일은 그 결과를 **상품이 파는 사이즈에 맞춰 번역하는 층**입니다.
 *
 * 웹 구현과 반드시 같은 답을 내야 합니다 — `demo-mall/product-size.js` 와 쌍입니다.
 * 한쪽만 고치지 마세요.
 */

import { CLOTHING_SIZE_LABELS, type ClothingSizeLabel } from '../types/bodySize';

/** 국내 여성복 호수 ↔ 알파벳. 44=XS 부터 한 칸씩 올라갑니다. */
const KR_TO_ALPHA: Record<number, ClothingSizeLabel> = {
  44: 'XS',
  55: 'S',
  66: 'M',
  77: 'L',
  88: 'XL',
  99: 'XXL',
};

const ALPHA_TO_KR: Partial<Record<ClothingSizeLabel, number>> = {
  XS: 44,
  S: 55,
  M: 66,
  L: 77,
  XL: 88,
  XXL: 99,
};

const FREE_TOKENS = ['F', 'FREE', 'ONE', 'ONESIZE', '프리', '프리사이즈'];

export type ProductSizeOffering = {
  /** 프리 사이즈를 파는가 */
  free: boolean;
  /** 프리 사이즈가 커버하는 범위 (예: F(55~66) → ['S','M']) */
  range: [ClothingSizeLabel, ClothingSizeLabel] | null;
  /** 알파벳으로 정규화한 판매 옵션 */
  options: ClothingSizeLabel[];
  raw: string;
};

export type ProductSizeAdvice = {
  /** 화면 배지에 넣을 값. 프리 상품이면 'FREE' */
  badge: string;
  headline: string;
  detail: string;
  fit: 'fits' | 'tight' | 'loose' | 'unknown';
  /** "판매 사이즈" 로 보여줄 문자열 */
  offered: string;
};

function alphaIndex(size: string): number {
  return (CLOTHING_SIZE_LABELS as readonly string[]).indexOf(size);
}

/** '55' → 'S', 'S' → 'S'. 모르면 null. */
export function toAlpha(token?: string): ClothingSizeLabel | null {
  if (!token) {
    return null;
  }
  const raw = token.trim().toUpperCase().replace(/\s+/g, '');
  if ((CLOTHING_SIZE_LABELS as readonly string[]).includes(raw)) {
    return raw as ClothingSizeLabel;
  }
  if (raw === 'XXXL' || raw === 'XXL+') {
    return 'XXL+';
  }
  const num = parseInt(raw, 10);
  return KR_TO_ALPHA[num] ?? null;
}

/** 'M' → '66'. 국내 몰 표기로 되돌립니다 (없으면 알파벳 그대로). */
export function toKorean(alpha: ClothingSizeLabel): string {
  const kr = ALPHA_TO_KR[alpha];
  return kr ? String(kr) : alpha;
}

function isFreeToken(token: string): boolean {
  const raw = token.trim().toUpperCase().replace(/\s+/g, '');
  return FREE_TOKENS.some(f => f.replace(/\s+/g, '') === raw);
}

/**
 * 상품 사이즈 표기를 구조로 바꿉니다.
 *
 *   'F(55~66)' → { free: true,  range: ['S','M'] }
 *   'S,M,L'    → { free: false, options: ['S','M','L'] }
 *   'FREE,L'   → { free: true,  options: ['L'] }
 *   ''         → null
 */
export function parseProductSize(text?: string): ProductSizeOffering | null {
  if (!text) {
    return null;
  }
  const raw = text.trim();
  if (!raw) {
    return null;
  }

  // `[size:F(55~66)]` 같은 껍데기에서 알맹이만 꺼냅니다.
  const inner = raw
    .replace(/^\[?\s*size\s*[:=]?\s*/i, '')
    .replace(/\]$/, '')
    .trim();

  // 괄호 안의 범위를 먼저 회수합니다 — 토큰 분리 전에 빼야 '55~66' 이 쪼개지지 않습니다.
  let range: [ClothingSizeLabel, ClothingSizeLabel] | null = null;
  const rangeMatch = inner.match(/(\d{2,3})\s*[~\-–]\s*(\d{2,3})/);
  if (rangeMatch) {
    const from = toAlpha(rangeMatch[1]);
    const to = toAlpha(rangeMatch[2]);
    if (from && to) {
      range = [from, to];
    }
  }

  const body = inner.replace(/\([^)]*\)/g, ' ');
  const tokens = body
    .split(/[,/|·]/)
    .map(t => t.trim())
    .filter(Boolean);

  let free = false;
  const options: ClothingSizeLabel[] = [];
  for (const token of tokens) {
    if (isFreeToken(token)) {
      free = true;
      continue;
    }
    const alpha = toAlpha(token);
    if (alpha && !options.includes(alpha)) {
      options.push(alpha);
    }
  }

  // 괄호 밖에 토큰이 없고 범위만 있으면 프리로 봅니다 ('(55~66)' 단독 표기)
  if (!free && options.length === 0 && range) {
    free = true;
  }
  if (!free && options.length === 0) {
    return null;
  }

  options.sort((a, b) => alphaIndex(a) - alphaIndex(b));
  return { free, range, options, raw };
}

/**
 * 추천 사이즈를 **상품이 실제로 파는 사이즈**에 맞춰 번역합니다.
 * null 이면 상품 표기를 해석하지 못한 것이므로 기존 문구를 그대로 쓰면 됩니다.
 *
 * 숫자 뒤 조사는 읽는 법에 따라 달라집니다('55라' / '66이라').
 * 문장에서 조사를 빼고 괄호와 '입니다' 로만 씁니다 — 어떤 숫자에도 안전합니다.
 */
export function describeForProduct(
  recommendedSize: ClothingSizeLabel,
  productSizeText?: string,
): ProductSizeAdvice | null {
  const offering = parseProductSize(productSizeText);
  if (!offering || !recommendedSize) {
    return null;
  }

  const myIndex = alphaIndex(recommendedSize);
  const kr = toKorean(recommendedSize);

  // ── 프리 사이즈 단독 ─────────────────────────────
  if (offering.free && offering.options.length === 0) {
    if (!offering.range) {
      return {
        badge: 'FREE',
        headline: '프리 사이즈 상품입니다',
        detail: `회원님 추천 사이즈는 ${recommendedSize}(${kr}) 기준입니다. 상품 실측을 함께 확인해 보세요.`,
        fit: 'unknown',
        offered: 'FREE',
      };
    }

    const [from, to] = offering.range;
    const span = `${toKorean(from)}~${toKorean(to)}`;

    if (myIndex > alphaIndex(to)) {
      return {
        badge: 'FREE',
        headline: '타이트할 수 있습니다',
        detail: `프리 사이즈 기준이 ${span}인데 회원님 추천은 ${kr} 입니다. 여유 있는 핏을 원하시면 상품 실측을 확인해 주세요.`,
        fit: 'tight',
        offered: `FREE (${span})`,
      };
    }
    if (myIndex < alphaIndex(from)) {
      return {
        badge: 'FREE',
        headline: '여유 있게 맞습니다',
        detail: `프리 사이즈 기준이 ${span}이라 회원님 추천 ${kr} 기준으로는 넉넉하게 떨어집니다.`,
        fit: 'loose',
        offered: `FREE (${span})`,
      };
    }
    return {
      badge: 'FREE',
      headline: '잘 맞는 사이즈입니다',
      detail: `프리 사이즈 기준이 ${span}이고 회원님 추천은 ${kr} 입니다. 범위 안에 들어옵니다.`,
      fit: 'fits',
      offered: `FREE (${span})`,
    };
  }

  // ── 옵션이 있는 상품 (S,M,L / FREE,L / 66 등) ────
  const { options } = offering;
  if (options.length > 0) {
    // 파는 것 중 추천에 가장 가까운 것을 고릅니다. **없는 사이즈는 절대 말하지 않습니다.**
    let best = options[0];
    let bestGap = Math.abs(alphaIndex(best) - myIndex);
    for (const option of options) {
      const gap = Math.abs(alphaIndex(option) - myIndex);
      if (gap < bestGap) {
        best = option;
        bestGap = gap;
      }
    }
    const bestKr = toKorean(best);
    // 프리도 함께 파는 상품이면 목록에 넣습니다. 빼면 "L만 나와요" 같은 거짓말이 됩니다.
    const labels = options.map(o => `${o}(${toKorean(o)})`);
    const list = (offering.free ? ['FREE', ...labels] : labels).join(' · ');

    if (bestGap === 0) {
      return {
        badge: best,
        headline: `${bestKr} 사이즈를 추천합니다`,
        detail: `판매 사이즈는 ${list} 입니다. 이 중 회원님 체형에 맞습니다.`,
        fit: 'fits',
        offered: list,
      };
    }

    const goesUp = alphaIndex(best) > myIndex;
    const freeNote = offering.free
      ? ' 프리 사이즈도 함께 판매하니 실측을 비교해 보세요.'
      : '';
    return {
      badge: best,
      headline: `${bestKr} 사이즈를 추천합니다`,
      detail:
        `회원님 추천은 ${kr} 기준인데 이 상품의 판매 사이즈는 ${list} 입니다. ` +
        `그중 가장 가까운 ${goesUp ? '큰' : '작은'} 사이즈를 골랐습니다.${freeNote}`,
      fit: goesUp ? 'loose' : 'tight',
      offered: list,
    };
  }

  return null;
}
