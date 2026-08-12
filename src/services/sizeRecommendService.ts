import {
  CLOTHING_SIZE_LABELS,
  type BodySizeProfile,
  type ClothingSizeLabel,
  type SizeRecommendInput,
  type SizeRecommendResult,
} from '../types/bodySize';

function sizeIndex(size: ClothingSizeLabel): number {
  return CLOTHING_SIZE_LABELS.indexOf(size);
}

function clampSize(index: number): ClothingSizeLabel {
  const max = CLOTHING_SIZE_LABELS.length - 1;
  const safe = Math.max(0, Math.min(max, index));
  return CLOTHING_SIZE_LABELS[safe];
}

export function normalizeSizeLabel(value?: string): ClothingSizeLabel | null {
  if (!value) {
    return null;
  }
  const raw = value.trim().toUpperCase().replace(/\s+/g, '');
  if (raw === 'XXL이상' || raw === 'XXL+' || raw === 'XXXL') {
    return 'XXL+';
  }
  if ((CLOTHING_SIZE_LABELS as readonly string[]).includes(raw)) {
    return raw as ClothingSizeLabel;
  }
  return null;
}

export function calcBmi(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) {
    return 0;
  }
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * 체형(키·몸무게)으로 사이즈를 정합니다.
 *
 * **같은 체형이면 항상 같은 사이즈가 나옵니다.**
 *
 * 예전에는 "평소 사이즈 ± BMI 보정" 이었습니다. 그래서 165cm·50kg 인 같은 사람이
 * 평소 M 을 고르면 S, 평소 S 를 고르면 XS 가 나왔습니다.
 * 화면은 "AI 핏 가이드가 **체형에 맞는** 사이즈를 찾아 드릴게요"라고 약속하는데
 * 실제로는 평소 사이즈가 기준점이었던 것이라, 약속과 동작이 어긋나 있었습니다.
 *
 * 이제 평소 사이즈는 **핏 취향**을 읽는 데만 씁니다 — 추천 사이즈를 바꾸지 않습니다.
 * (평소가 체형 기준보다 크면 넉넉한 핏 선호로 보고 문구로 안내)
 *
 * 웹 위젯·데모(`demo-mall/size-recommend.js`)와 **같은 답을 내야 합니다.**
 * 한쪽만 고치지 마세요.
 */

/** BMI 구간 → 사이즈. 국내 여성복 호수(44·55·66·77·88)에 대응합니다. */
const BMI_SIZE_BANDS: ReadonlyArray<{ max: number; size: ClothingSizeLabel }> = [
  { max: 17.5, size: 'XS' },   // 44
  { max: 19.5, size: 'S' },    // 55
  { max: 22.0, size: 'M' },    // 66
  { max: 24.5, size: 'L' },    // 77
  { max: 27.0, size: 'XL' },   // 88
  { max: 30.0, size: 'XXL' },  // 99
  { max: Infinity, size: 'XXL+' },
];

function sizeFromBmi(bmi: number): ClothingSizeLabel {
  for (const band of BMI_SIZE_BANDS) {
    if (bmi < band.max) {
      return band.size;
    }
  }
  return 'XXL+';
}

/** 구간 경계에 가까우면 확신을 낮춥니다 — 경계에서는 브랜드 핏에 따라 갈립니다. */
function confidenceFromBmi(bmi: number): SizeRecommendResult['confidence'] {
  if (bmi <= 0) {
    return 'low';
  }
  for (const band of BMI_SIZE_BANDS) {
    if (bmi < band.max) {
      return band.max - bmi < 0.6 ? 'medium' : 'high';
    }
  }
  return 'medium';
}

export function recommendClothingSize(
  input: SizeRecommendInput,
): SizeRecommendResult {
  const bmi = calcBmi(input.heightCm, input.weightKg);
  const roundedBmi = Math.round(bmi * 10) / 10;

  let recommendedSize = sizeFromBmi(bmi);
  let confidence = confidenceFromBmi(bmi);

  // 카테고리 보정 — 옷의 성질이지 사람의 성질이 아니므로 체형 일관성을 깨지 않습니다.
  // 아우터는 안에 겹쳐 입으므로 여유가 필요합니다.
  const category = (input.category || '').toUpperCase();
  const isOuter = category === 'OUTER';
  if (isOuter) {
    recommendedSize = clampSize(sizeIndex(recommendedSize) + 1);
  }

  const usualSize = input.usualSize;
  const diffFromUsual = usualSize
    ? sizeIndex(recommendedSize) - sizeIndex(usualSize)
    : 0;

  let reasonKey: string;
  let fitHint: SizeRecommendResult['fitHint'] = 'similar';

  if (isOuter) {
    reasonKey = 'sizeReasonOuter';
  } else if (!usualSize) {
    reasonKey = 'sizeReasonBodyOnly';
  } else if (diffFromUsual === 0) {
    reasonKey = 'sizeReasonBodyMatch';
  } else if (diffFromUsual < 0) {
    // 체형 기준이 평소보다 작다 = 평소에 넉넉하게 입는 편
    reasonKey = 'sizeReasonBodySmaller';
    fitHint = 'smaller';
  } else {
    reasonKey = 'sizeReasonBodyLarger';
    fitHint = 'larger';
  }

  const productSize = normalizeSizeLabel(input.productSize);

  if (productSize) {
    const diff = sizeIndex(recommendedSize) - sizeIndex(productSize);
    if (diff > 0) {
      return {
        recommendedSize,
        confidence,
        reasonKey: 'sizeReasonProductSmall',
        reasonParams: { productSize, recommendedSize },
        bmi: roundedBmi,
        fitHint: 'larger',
      };
    }
    if (diff < 0) {
      return {
        recommendedSize,
        confidence,
        reasonKey: 'sizeReasonProductLarge',
        reasonParams: { productSize, recommendedSize },
        bmi: roundedBmi,
        fitHint: 'smaller',
      };
    }
    return {
      recommendedSize,
      confidence: 'high',
      reasonKey: 'sizeReasonProductMatch',
      reasonParams: { productSize, recommendedSize },
      bmi: roundedBmi,
      fitHint: 'similar',
    };
  }

  return {
    recommendedSize,
    confidence,
    reasonKey,
    reasonParams: {
      usualSize: usualSize || '',
      recommendedSize,
      bmi: roundedBmi,
    },
    bmi: roundedBmi,
    fitHint,
  };
}

export function isValidBodySizeProfile(
  profile: Partial<BodySizeProfile> | null | undefined,
): profile is BodySizeProfile {
  if (!profile) {
    return false;
  }
  return (
    typeof profile.heightCm === 'number' &&
    profile.heightCm >= 120 &&
    profile.heightCm <= 230 &&
    typeof profile.weightKg === 'number' &&
    profile.weightKg >= 30 &&
    profile.weightKg <= 200 &&
    !!profile.usualSize &&
    (CLOTHING_SIZE_LABELS as readonly string[]).includes(profile.usualSize)
  );
}
