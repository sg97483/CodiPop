import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { sendLocalNotification, scheduleDailyAttendanceReminder } from './notificationService';
import Toast from 'react-native-toast-message';

// 🎟️ 티켓 기준
//
// **티켓 1장 = 피팅 1회.** 이 규칙을 깨지 마세요.
//
// 예전에는 1회에 10장이 들고 보상은 "+3장"이라, 화면에 "보유 13장 (1회 -10장)",
// "+20장 = 2회권" 같은 표기가 섞여 무슨 뜻인지 읽히지 않았습니다.
// 광고를 4번 봐야 1회를 쓸 수 있었던 것도 이 구조 때문이었습니다.
//
// 값을 바꿀 때는 **서버의 `TICKET_COST_FITTING` 도 함께** 바꿔야 합니다.
// 한쪽만 바꾸면 서버가 더 깎거나 덜 깎습니다.
//
// **[출시 홍보 기간] 지급량을 5배로 올렸습니다.**
// 1회 비용(TICKET_COST_FITTING)은 1장 그대로 두고 **버는 쪽만** 5배로 만듭니다.
// 비용을 건드리면 서버와 어긋나고(위 주석), 화면의 "1회 1장" 표기도 전부 깨집니다.
// 홍보를 끝낼 때는 아래 5배 값을 괄호 안 원래 값으로 되돌리면 됩니다.
export const TICKET_COST_FITTING = 1;        // AI 가상 피팅 1회 = 티켓 1장 (서버와 동일해야 함)
export const TICKET_REWARD_WELCOME = 10;     // 신규 가입 (10회분, 홍보 5배 / 원래 2)
export const TICKET_REWARD_ATTENDANCE = 5;   // 매일 출석체크 (5회분, 홍보 5배 / 원래 1)
export const TICKET_REWARD_AD = 5;           // 보상형 광고 1회 시청 (5회분, 홍보 5배 / 원래 1)
export const TICKET_REWARD_POST = 5;         // 커뮤니티 코디 공유 (5회분, 홍보 5배 / 원래 1)
export const TICKET_REWARD_REFERRAL = 10;    // 친구 초대 (초대자·가입자 모두, 10회분, 홍보 5배 / 원래 2)

/**
 * 티켓 단위가 바뀐 시점을 표시합니다.
 *
 * 예전 잔액은 "1회 = 10장" 단위였습니다. 그대로 두면 13장이 13회가 되어
 * **기존 사용자 잔액이 10배로 불어납니다.** 처음 불러올 때 한 번 나눠 줍니다.
 * 내림하면 있던 것을 빼앗는 셈이라 올림합니다 (13장 → 2회).
 */
const TICKET_SCALE_VERSION = 2;
const LEGACY_TICKETS_PER_FITTING = 10;

/**
 * 출시 홍보용 5배 지급을 **이미 앱을 쓰고 있던 사람에게도** 한 번 적용합니다.
 *
 * 위의 TICKET_REWARD_* 를 5배로 올린 것만으로는 앞으로 받을 것만 늘어나고,
 * 지금 2장을 들고 있는 사람은 다음 출석까지 그대로 2장입니다.
 * 그래서 남아 있는 잔액도 한 번 5배로 올려 줍니다.
 *
 * **버전 번호를 저장해 두 번 적용되지 않게 합니다.** 저장이 빠지면
 * 앱을 켤 때마다 5배가 되어 잔액이 폭주합니다.
 */
const PROMO_BOOST_VERSION = 1;
const PROMO_BOOST_MULTIPLIER = 5;

export type TicketReason =
  | 'WELCOME_BONUS'
  | 'DAILY_ATTENDANCE'
  | 'REWARD_AD'
  | 'COMMUNITY_POST'
  | 'REFERRAL_BONUS'
  | 'AI_FITTING'
  | 'MANUAL_ADJUSTMENT';

interface TicketStorageData {
  balance: number;
  initialized: boolean;
  /** 티켓 단위 버전. 없으면 구 단위(1회=10장)라 환산이 필요합니다. */
  scaleVersion?: number;
  /** 홍보 5배 지급을 받은 버전. 없으면 아직 못 받은 잔액입니다. */
  promoBoostVersion?: number;
  lastAttendanceDate?: string; // 'YYYY-MM-DD'
  hasClaimedReferral?: boolean;
}

const STORAGE_KEY = 'codipop_style_tickets_v1';

const DEV_BYPASS_EMAILS = ['sg97483@gmail.com'];

export function isDevBypassUser(): boolean {
  const email = auth().currentUser?.email;
  return !!email && DEV_BYPASS_EMAILS.includes(email.toLowerCase());
}

/**
 * 구 단위(1회=10장) 잔액을 새 단위(1회=1장)로 환산합니다.
 * 이미 환산된 데이터는 그대로 돌려줍니다.
 */
function migrateTicketScale(data: TicketStorageData): TicketStorageData {
  if (!data || data.scaleVersion === TICKET_SCALE_VERSION) {
    return data;
  }
  const before = data.balance;
  const after = Math.ceil((Number(before) || 0) / LEGACY_TICKETS_PER_FITTING);
  console.log(
    `🎟️ [TicketService] 티켓 단위 환산: ${before}장(구) → ${after}장(신, 1장=1회)`,
  );
  return { ...data, balance: after, scaleVersion: TICKET_SCALE_VERSION };
}

/**
 * 남아 있는 잔액에 홍보 5배를 한 번만 적용합니다.
 * 이미 받은 데이터는 그대로 돌려줍니다.
 */
function applyPromoBoost(data: TicketStorageData): TicketStorageData {
  if (!data || data.promoBoostVersion === PROMO_BOOST_VERSION) {
    return data;
  }
  const before = Number(data.balance) || 0;
  const after = before * PROMO_BOOST_MULTIPLIER;
  console.log(
    `🎁 [TicketService] 출시 홍보 ${PROMO_BOOST_MULTIPLIER}배 지급: ${before}장 → ${after}장`,
  );
  return { ...data, balance: after, promoBoostVersion: PROMO_BOOST_VERSION };
}

/**
 * 저장된 데이터를 현재 규칙에 맞춥니다 (단위 환산 + 홍보 5배 지급).
 *
 * 바뀐 게 있으면 **그 자리에서 저장합니다.** 저장을 미루면 다음 실행에서
 * 같은 환산·지급이 또 일어나 잔액이 계속 깎이거나 불어납니다.
 */
async function normalizeTicketData(data: TicketStorageData): Promise<TicketStorageData> {
  const next = applyPromoBoost(migrateTicketScale(data));
  const changed =
    next.balance !== data.balance ||
    next.scaleVersion !== data.scaleVersion ||
    next.promoBoostVersion !== data.promoBoostVersion;
  if (changed) {
    await saveTicketData(next);
  }
  return next;
}

/**
 * 로컬 및 Firestore 데이터 싱크 및 로딩
 */
async function loadTicketData(): Promise<TicketStorageData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let data: TicketStorageData | null = raw ? JSON.parse(raw) : null;

    // 만약 로컬에 데이터가 없고 사용자가 로그인 상태라면 Firestore에서 불러오기 시도
    const user = auth().currentUser;
    if (user && !data) {
      try {
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        const firestoreData = userDoc.data()?.styleTickets;
        if (firestoreData) {
          data = {
            balance: typeof firestoreData.balance === 'number' ? firestoreData.balance : TICKET_REWARD_WELCOME,
            initialized: firestoreData.initialized || true,
            // 서버에 남아 있는 버전을 그대로 가져옵니다. 빠뜨리면 이미 환산·지급이
            // 끝난 잔액을 **다시 한 번** 환산하거나 5배로 만듭니다.
            scaleVersion: firestoreData.scaleVersion,
            promoBoostVersion: firestoreData.promoBoostVersion,
            lastAttendanceDate: firestoreData.lastAttendanceDate,
            hasClaimedReferral: firestoreData.hasClaimedReferral || false,
          };
          data = await normalizeTicketData(data);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          if (isDevBypassUser()) {
            data.balance = 9999;
          }
          return data;
        }
      } catch (fsErr) {
        console.warn('⚠️ [TicketService] Firestore 조회 실패 (로컬 데이터 사용):', fsErr);
      }
    }

    // 로컬도 없고 Firestore에도 없으면 초기 웰컴 보너스 지급
    if (!data || !data.initialized) {
      const initialData: TicketStorageData = {
        balance: isDevBypassUser() ? 9999 : TICKET_REWARD_WELCOME,
        initialized: true,
        scaleVersion: TICKET_SCALE_VERSION,
        // 웰컴 보너스는 이미 5배로 지급되므로 추가 지급 대상이 아닙니다.
        promoBoostVersion: PROMO_BOOST_VERSION,
      };
      await saveTicketData(initialData);
      return initialData;
    }

    data = await normalizeTicketData(data);
    if (isDevBypassUser()) {
      data.balance = 9999;
    }
    return data;
  } catch (error) {
    console.error('❌ [TicketService] loadTicketData 에러:', error);
    return {
      balance: isDevBypassUser() ? 9999 : TICKET_REWARD_WELCOME,
      initialized: true,
      scaleVersion: TICKET_SCALE_VERSION,
      promoBoostVersion: PROMO_BOOST_VERSION,
    };
  }
}

/**
 * 로컬 및 Firestore 데이터 저장
 */
async function saveTicketData(data: TicketStorageData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const user = auth().currentUser;
    if (user) {
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .set(
            {
              styleTickets: {
                balance: data.balance,
                initialized: data.initialized,
                scaleVersion: TICKET_SCALE_VERSION,
                // 기기를 바꾸거나 재설치해도 5배를 또 받지 않도록 서버에도 남깁니다.
                promoBoostVersion: data.promoBoostVersion ?? null,
                lastAttendanceDate: data.lastAttendanceDate || null,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              },
            },
            { merge: true },
          );
      } catch (fsErr) {
        console.warn('⚠️ [TicketService] Firestore 저장 실패 (로컬만 저장됨):', fsErr);
      }
    }
  } catch (error) {
    console.error('❌ [TicketService] saveTicketData 에러:', error);
  }
}

/**
 * 현재 보유 티켓 잔액 조회
 */
export async function getTicketBalance(): Promise<number> {
  if (isDevBypassUser()) {
    return 9999;
  }
  const data = await loadTicketData();
  return data.balance;
}

/**
 * 티켓 지급 (출석, 광고 시청, 게시글 업로드 등)
 */
export async function addTickets(amount: number, reason: TicketReason): Promise<number> {
  if (isDevBypassUser()) {
    return 9999;
  }
  const data = await loadTicketData();
  data.balance = Math.max(0, data.balance + amount);
  console.log(`🎟️ [TicketService] +${amount}장 지급 (이유: ${reason}) => 잔액: ${data.balance}장`);
  await saveTicketData(data);
  return data.balance;
}

/**
 * 티켓 소모 (AI 피팅 등)
 */
export async function deductTickets(
  amount: number,
  reason: TicketReason,
): Promise<{ success: boolean; balance: number }> {
  if (isDevBypassUser()) {
    console.log(`🎟️ [DEV Bypass] ${auth().currentUser?.email} 무한 피팅 (티켓 차감 없음 -${amount}장 면제)`);
    return { success: true, balance: 9999 };
  }
  const data = await loadTicketData();
  if (data.balance < amount) {
    console.log(`🎟️ [TicketService] 티켓 부족! 소모 시도: -${amount}장 (이유: ${reason}) / 현재 잔액: ${data.balance}장`);
    return { success: false, balance: data.balance };
  }

  data.balance -= amount;
  console.log(`🎟️ [TicketService] -${amount}장 소모 (이유: ${reason}) => 잔액: ${data.balance}장`);
  await saveTicketData(data);
  return { success: true, balance: data.balance };
}

/**
 * 일일 출석체크 보너스(+3장) 체크 및 자동 수령
 */
export async function checkAndClaimDailyAttendance(): Promise<{
  claimed: boolean;
  rewardAmount: number;
  balance: number;
}> {
  try {
    const data = await loadTicketData();
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    if (data.lastAttendanceDate === today) {
      // 이미 오늘 출석체크 받음
      return { claimed: false, rewardAmount: 0, balance: data.balance };
    }

    // 출석체크 보너스 지급
    data.lastAttendanceDate = today;
    data.balance += TICKET_REWARD_ATTENDANCE;
    console.log(`🎁 [TicketService] 출석체크 보너스 +${TICKET_REWARD_ATTENDANCE}장 지급! (${today}) => 잔액: ${data.balance}장`);
    await saveTicketData(data);

    // 출석체크 완료 즉시 다음 날 저녁 7시(19:00)로 리마인더 알림 자동 재예약
    await scheduleDailyAttendanceReminder();

    return {
      claimed: true,
      rewardAmount: TICKET_REWARD_ATTENDANCE,
      balance: data.balance,
    };
  } catch (error) {
    console.error('❌ [TicketService] checkAndClaimDailyAttendance 에러:', error);
    const fallbackBalance = await getTicketBalance();
    return { claimed: false, rewardAmount: 0, balance: fallbackBalance };
  }
}

/**
 * 사용자 고유 초대 코드 (UID 앞 6자리 대문자) 반환 및 Firestore 등록
 */
export async function getUserReferralCode(): Promise<string> {
  const user = auth().currentUser;
  if (!user) {
    return 'CODI20';
  }
  const code = user.uid.substring(0, 6).toUpperCase();
  try {
    // Firestore에 초대 코드 보존
    await firestore().collection('users').doc(user.uid).set(
      {
        referralCode: code,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('⚠️ [TicketService] 초대 코드 Firestore 등록 실패:', error);
  }
  return code;
}

/**
 * 사용자가 이미 초대 코드를 등록하여 보상 받았는지 확인
 */
export async function checkHasClaimedReferral(): Promise<boolean> {
  try {
    const data = await loadTicketData();
    if (data.hasClaimedReferral) {
      return true;
    }
    const user = auth().currentUser;
    if (user) {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      if (userDoc.data()?.styleTickets?.hasClaimedReferral || userDoc.data()?.hasClaimedReferral) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ [TicketService] checkHasClaimedReferral 에러:', error);
    return false;
  }
}

/**
 * 친구 초대 코드 입력 및 상호 보너스(+20장) 지급
 */
export async function claimReferralCode(inputCode: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = auth().currentUser;
    if (!user) {
      return { success: false, message: '로그인이 필요한 서비스입니다.' };
    }

    const cleanCode = inputCode.trim().toUpperCase();
    if (cleanCode.length < 5) {
      return { success: false, message: '초대 코드를 정확히 입력해 주세요.' };
    }

    // 1. 이미 입력했는지 체크
    const alreadyClaimed = await checkHasClaimedReferral();
    if (alreadyClaimed) {
      return { success: false, message: '이미 초대 코드를 입력하여 보너스를 받으셨습니다.' };
    }

    // 2. 본인 코드인지 체크
    const myCode = user.uid.substring(0, 6).toUpperCase();
    if (cleanCode === myCode) {
      return { success: false, message: '본인의 초대 코드는 입력할 수 없습니다.' };
    }

    // 3. 초대자 검색 (UID 앞자리 일치 또는 referralCode 일치)
    let inviterDocRef: any = null;
    let inviterData: any = null;

    // (1) referralCode 필드로 조회
    const refSnapshot = await firestore()
      .collection('users')
      .where('referralCode', '==', cleanCode)
      .limit(1)
      .get();

    if (!refSnapshot.empty) {
      inviterDocRef = refSnapshot.docs[0].ref;
      inviterData = refSnapshot.docs[0].data();
    } else {
      // (2) UID 접두사(앞 6자리)로 직접 문서 ID 범위 조회
      const docIdSnapshot = await firestore()
        .collection('users')
        .where(firestore.FieldPath.documentId(), '>=', cleanCode)
        .where(firestore.FieldPath.documentId(), '<=', cleanCode + '\uf8ff')
        .limit(1)
        .get();

      if (!docIdSnapshot.empty) {
        const doc = docIdSnapshot.docs[0];
        if (doc.id.substring(0, 6).toUpperCase() === cleanCode && doc.id !== user.uid) {
          inviterDocRef = doc.ref;
          inviterData = doc.data();
        }
      }
    }

    if (!inviterDocRef) {
      return { success: false, message: '존재하지 않거나 유효하지 않은 초대 코드입니다.' };
    }

    // 4. 초대한 사람에게 +20장 지급 및 상호 보상 푸시 알림 트리거 정보 기록
    try {
      const inviterTickets = inviterData?.styleTickets || { balance: TICKET_REWARD_WELCOME, initialized: true };
      const currentBalance = typeof inviterTickets.balance === 'number' ? inviterTickets.balance : 20;
      await inviterDocRef.set(
        {
          styleTickets: {
            ...inviterTickets,
            balance: currentBalance + TICKET_REWARD_REFERRAL,
          },
          referralCode: cleanCode,
          referralRewardNotification: {
            timestamp: Date.now(),
            amount: TICKET_REWARD_REFERRAL,
            read: false,
          },
        },
        { merge: true }
      );
      console.log(`🎁 [TicketService] 초대자(${inviterDocRef.id})에게 초대 보너스 +${TICKET_REWARD_REFERRAL}장 지급 완료!`);
    } catch (invErr) {
      console.error('⚠️ [TicketService] 초대자 보너스 지급 중 오류:', invErr);
    }

    // 5. 입력한 나(신규 가입자)에게 +20장 지급 및 플래그 저장
    const localData = await loadTicketData();
    localData.balance += TICKET_REWARD_REFERRAL;
    localData.hasClaimedReferral = true;
    await saveTicketData(localData);

    await firestore().collection('users').doc(user.uid).set(
      {
        hasClaimedReferral: true,
        styleTickets: {
          balance: localData.balance,
          initialized: true,
          hasClaimedReferral: true,
        },
      },
      { merge: true }
    );

    const successMsg = `🎉 초대 코드 등록 완료!\n친구와 나 모두에게 피팅 2회권(+${TICKET_REWARD_REFERRAL}장)이 적립되었습니다.`;
    sendLocalNotification('친구 초대 보너스 지급 완료!', successMsg);

    return {
      success: true,
      message: successMsg,
    };
  } catch (error) {
    console.error('❌ [TicketService] claimReferralCode 에러:', error);
    return { success: false, message: '초대 코드 등록 중 문제가 발생했습니다. 다시 시도해 주세요.' };
  }
}

/**
 * 6. 친구가 내 초대 코드를 등록하여 +20장이 지급되었을 때 실시간 감지하여 상호 보상 알림 및 잔액 동기화
 */
export function startReferralRewardListener(userId: string) {
  return firestore()
    .collection('users')
    .doc(userId)
    .onSnapshot(async doc => {
      if (!doc.exists) return;
      const data = doc.data();
      if (data?.referralRewardNotification && data.referralRewardNotification.read === false) {
        const amount = typeof data.referralRewardNotification.amount === 'number' ? data.referralRewardNotification.amount : TICKET_REWARD_REFERRAL;

        // 1) 로컬 데이터 잔액 업데이트
        const localData = await loadTicketData();
        localData.balance += amount;
        await saveTicketData(localData);

        // 2) 로컬 푸시/헤드업 알림 및 내부 토스트 표시
        sendLocalNotification(
          '친구 초대 보너스 도착! 🎉',
          `축하합니다! 친구가 회원님의 초대 코드로 가입하여 무료 피팅 티켓 +${amount}장이 즉시 지급되었습니다! 지금 바로 새로운 옷을 입어보세요!`,
        );
        Toast.show({
          type: 'success',
          text1: '💌 친구 초대 보너스 도착! 🎉',
          text2: `무료 피팅 티켓 +${amount}장이 적립되었습니다!`,
          visibilityTime: 5000,
        });

        // 3) Firestore 읽음 처리 (중복 알림 방지)
        await firestore()
          .collection('users')
          .doc(userId)
          .update({
            'referralRewardNotification.read': true,
          })
          .catch(err => console.warn('⚠️ 읽음 상태 갱신 실패:', err));
      }
    });
}
