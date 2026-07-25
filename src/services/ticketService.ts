import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { sendLocalNotification, scheduleDailyAttendanceReminder } from './notificationService';
import Toast from 'react-native-toast-message';

// 🎟️ 티켓 소모 및 지급 기준 설정 (2단계 경제 구조 설계)
export const TICKET_COST_FITTING = 10;      // AI 가상 피팅 1회 소모 티켓
export const TICKET_REWARD_WELCOME = 20;    // 신규 가입/최초 접속 웰컴 보너스 티켓 (무료 2회분)
export const TICKET_REWARD_ATTENDANCE = 3;  // 매일 출석체크 보너스 티켓
export const TICKET_REWARD_AD = 3;          // 보상형 광고 1회 시청 보상 티켓
export const TICKET_REWARD_POST = 2;        // 커뮤니티 코디 공유 업로드 보상 티켓
export const TICKET_REWARD_REFERRAL = 20;   // 친구 초대 시 (초대자/가입자 모두) 보너스 티켓

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
            lastAttendanceDate: firestoreData.lastAttendanceDate,
            hasClaimedReferral: firestoreData.hasClaimedReferral || false,
          };
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
      };
      await saveTicketData(initialData);
      return initialData;
    }

    if (isDevBypassUser()) {
      data.balance = 9999;
    }
    return data;
  } catch (error) {
    console.error('❌ [TicketService] loadTicketData 에러:', error);
    return { balance: isDevBypassUser() ? 9999 : TICKET_REWARD_WELCOME, initialized: true };
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
