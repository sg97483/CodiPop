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
 * 규칙 기반 사이즈 추천 (AI 토큰 없음).
 * 평소 사이즈를 기준으로 BMI에 따라 ±1 보정합니다.
 */
export function recommendClothingSize(
  input: SizeRecommendInput,
): SizeRecommendResult {
  const bmi = calcBmi(input.heightCm, input.weightKg);
  const base = sizeIndex(input.usualSize);
  let offset = 0;
  let fitHint: SizeRecommendResult['fitHint'] = 'similar';
  let reasonKey = 'sizeReasonUsual';
  let confidence: SizeRecommendResult['confidence'] = 'medium';

  if (bmi > 0 && bmi < 18.5) {
    offset = -1;
    fitHint = 'smaller';
    reasonKey = 'sizeReasonSlim';
    confidence = 'medium';
  } else if (bmi >= 18.5 && bmi < 23) {
    offset = 0;
    fitHint = 'similar';
    reasonKey = 'sizeReasonUsual';
    confidence = 'high';
  } else if (bmi >= 23 && bmi < 25) {
    offset = 0;
    fitHint = 'similar';
    reasonKey = 'sizeReasonBorder';
    confidence = 'medium';
  } else if (bmi >= 25) {
    offset = 1;
    fitHint = 'larger';
    reasonKey = 'sizeReasonBroad';
    confidence = 'medium';
  } else {
    confidence = 'low';
    reasonKey = 'sizeReasonUsual';
  }

  // 카테고리 약한 보정: OUTER는 여유 핏 선호
  const category = (input.category || '').toUpperCase();
  if (category === 'OUTER' && offset < 1 && bmi >= 23) {
    offset = 1;
    fitHint = 'larger';
    reasonKey = 'sizeReasonOuter';
  }

  const recommendedSize = clampSize(base + offset);
  const productSize = normalizeSizeLabel(input.productSize);

  if (productSize) {
    const diff = sizeIndex(recommendedSize) - sizeIndex(productSize);
    if (diff > 0) {
      return {
        recommendedSize,
        confidence,
        reasonKey: 'sizeReasonProductSmall',
        reasonParams: {
          productSize,
          recommendedSize,
        },
        bmi: Math.round(bmi * 10) / 10,
        fitHint: 'larger',
      };
    }
    if (diff < 0) {
      return {
        recommendedSize,
        confidence,
        reasonKey: 'sizeReasonProductLarge',
        reasonParams: {
          productSize,
          recommendedSize,
        },
        bmi: Math.round(bmi * 10) / 10,
        fitHint: 'smaller',
      };
    }
    return {
      recommendedSize,
      confidence: 'high',
      reasonKey: 'sizeReasonProductMatch',
      reasonParams: {
        productSize,
        recommendedSize,
      },
      bmi: Math.round(bmi * 10) / 10,
      fitHint: 'similar',
    };
  }

  return {
    recommendedSize,
    confidence,
    reasonKey,
    reasonParams: {
      usualSize: input.usualSize,
      recommendedSize,
    },
    bmi: Math.round(bmi * 10) / 10,
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
