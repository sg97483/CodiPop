import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MockStatusBar, MockTabBar, MockPill } from './PhoneFrame';
import { ShareIcon, DownloadIcon, RefreshIcon } from '../icons';

/**
 * 온보딩 슬라이드 5장의 '폰 안쪽' 그림.
 *
 * **앱의 실제 부품을 그대로 흉내 냅니다.** 예쁜 일러스트를 새로 그리는 것보다
 * 사용자가 곧 만날 화면을 보여주는 편이 온보딩의 목적에 맞습니다.
 * 그래서 색·둥근 정도·문구를 실제 화면에서 가져왔습니다.
 *
 * 사진만 에셋입니다(`assets/images/onboarding/parts`). 옷·모델 사진은 코드로 그릴 수 없어
 * **실기기 스크린샷에서 UI 를 잘라내고 사진만 남겼습니다.**
 *
 * 잘라낼 때 배운 것: **사진 위에 얹힌 배지는 단색으로 덮으면 안 됩니다.**
 * 대리석 벽처럼 평평해 보이는 배경도 결이 있어 사각형이 그대로 드러납니다.
 * 배지가 피사체와 겹치지 않는 카드(옷장)는 잘라내고, 겹치는 카드(코디북의 날짜·하트)는
 * **그냥 둡니다** — 어차피 실제 코디북 화면에 있는 것이라 남아 있는 편이 더 정확합니다.
 */

const PHOTO = {
  fitting: require('../../assets/images/onboarding/parts/fitting_result.jpg'),
  /**
   * 쇼핑몰 상품 사진. 기획자가 따로 준 컷입니다.
   *
   * 앞의 사진은 옷이 프레임에 꽉 차게 찍혀 있어 **양옆이 잘려 보였습니다.**
   * 이 컷은 사진 안에 이미 여백이 있어, 칸을 크게 비우지 않아도 자연스럽습니다
   * (그래서 `mallStage` 의 좌우 여백을 56 → 24 로 줄였습니다).
   *
   * 원본은 3084×4276(3.8MB)이라 **폭 640 으로 줄여** 넣었습니다 —
   * 목업에서 실제로 그려지는 폭은 200pt 남짓이라 그 이상은 앱 용량만 먹습니다.
   */
  mall: require('../../assets/images/onboarding/parts/mall_product.jpg'),
  community: require('../../assets/images/onboarding/parts/community_photo.jpg'),
  /** 커뮤니티 글쓴이(푸르스름이). '나'와 다른 사람으로 보여야 합니다. */
  avatar: require('../../assets/images/onboarding/parts/community_avatar.jpg'),
  /** 피팅룸 좌상단 '내 사진'. 30px 원이라 전신 대신 얼굴 쪽을 잘라 씁니다. */
  personThumb: require('../../assets/images/onboarding/parts/person_thumb.jpg'),
  closet: [
    require('../../assets/images/onboarding/parts/closet_1.jpg'),
    require('../../assets/images/onboarding/parts/closet_2.jpg'),
    require('../../assets/images/onboarding/parts/closet_3.jpg'),
    require('../../assets/images/onboarding/parts/closet_4.jpg'),
    require('../../assets/images/onboarding/parts/closet_5.jpg'),
    require('../../assets/images/onboarding/parts/closet_6.jpg'),
  ],
  codi: [
    require('../../assets/images/onboarding/parts/codi_1.jpg'),
    require('../../assets/images/onboarding/parts/codi_2.jpg'),
    require('../../assets/images/onboarding/parts/codi_3.jpg'),
    require('../../assets/images/onboarding/parts/codi_4.jpg'),
    require('../../assets/images/onboarding/parts/codi_5.jpg'),
    require('../../assets/images/onboarding/parts/codi_6.jpg'),
  ],
};

/** 결과 화면의 원형 아이콘 버튼 — 실제 `CircleIconButton` 을 축소해 옮긴 것입니다. */
const MiniCircleButton: React.FC<{ caption: string; children: React.ReactNode }> = ({
  caption,
  children,
}) => (
  <View style={s.circleWrap}>
    <View style={s.circleBtn}>{children}</View>
    <Text style={s.circleCaption}>{caption}</Text>
  </View>
);

const CLOSET_TABS = ['ALL', 'TOPS', 'BOTTOMS', 'SHOES', 'OUTER'];

/**
 * 1. 피팅룸 — **옷장을 펼친 상태**입니다.
 *
 * 첫 장의 문구가 "내 사진과 옷 사진만 준비하세요" 라서,
 * 결과만 덩그러니 띄우는 것보다 **고를 옷이 깔려 있는 화면**이 문구와 맞습니다.
 * 실제 앱에서 옷을 고르는 중일 때 보이는 그대로입니다 — 패널이 올라오고,
 * 아직 고른 게 없으니 버튼도 '(0개 선택)' 입니다.
 */
export const FittingScene = () => (
  <View style={s.fill}>
    <MockStatusBar />
    <View style={s.headerRow}>
      <View style={s.ticketBadge}>
        <Text style={s.ticketText}>
          보유 티켓 <Text style={s.ticketNum}>10장</Text>
        </Text>
      </View>
      <Text style={s.ticketAction}>티켓 5장 받기</Text>
    </View>

    <View style={s.stageShort}>
      <Image source={PHOTO.fitting} style={s.stagePhoto} resizeMode="cover" />

      {/* 좌상단 내 사진 · 우상단 피팅 버튼 — 서로 겹치지 않게 양 끝으로 갈라 둡니다. */}
      <Image source={PHOTO.personThumb} style={s.personThumb} />
      <LinearGradient
        colors={['#FF6B9D', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.tryOnPill}>
        <Text style={s.tryOnText}>피팅 시작 (0개 선택)</Text>
      </LinearGradient>
    </View>

    <View style={s.closetPanel}>
      <View style={s.peekHandle} />
      <Text style={s.peekLabel}>내 옷장</Text>
      <View style={s.closetTabs}>
        {CLOSET_TABS.map((label, i) => (
          <View key={label} style={s.closetTabItem}>
            <Text style={[s.closetTabText, i === 0 && s.closetTabTextOn]}>{label}</Text>
            {i === 0 ? <View style={s.closetTabUnderline} /> : null}
          </View>
        ))}
      </View>
      <View style={s.panelGrid}>
        {/* 첫 칸은 실제 앱과 같이 '옷 추가' 자리입니다. */}
        <View style={s.panelAdd}>
          <Text style={s.panelAddMark}>+</Text>
        </View>
        {Array.from({ length: 19 }, (_, i) => (
          <Image
            key={i}
            source={PHOTO.closet[i % PHOTO.closet.length]}
            style={s.panelCell}
            resizeMode="cover"
          />
        ))}
      </View>
    </View>

    <MockTabBar active="fitting" />
  </View>
);

/**
 * 결과 화면의 원형 조작 버튼. 지금 슬라이드 구성에서는 쓰지 않지만
 * (1번이 '옷 고르는 중' 상태로 바뀌었습니다) **지우지 않습니다** —
 * 결과 화면을 다시 보여주게 되면 그대로 필요합니다.
 */
export const ResultActionsPreview = () => (
  <View style={s.resultActions}>
    <MiniCircleButton caption="공유">
      <ShareIcon size={13} />
    </MiniCircleButton>
    <MiniCircleButton caption="저장">
      <DownloadIcon size={13} />
    </MiniCircleButton>
    <MiniCircleButton caption="다른 옷">
      <RefreshIcon size={13} />
    </MiniCircleButton>
  </View>
);

/** 2. 내 옷장 — 담아 둔 옷이 쌓이는 곳. */
export const ClosetScene = () => (
  <View style={s.fill}>
    <MockStatusBar />
    <View style={s.plainHeader}>
      <Text style={s.plainTitle}>내 옷장</Text>
      <Text style={s.plainCount}>16/30개</Text>
    </View>
    <View style={s.chipRow}>
      <MockPill label="All" bg="#8B5CF6" color="#FFFFFF" small />
      <MockPill label="Tops" bg="#F2F2F6" color="#8A8A93" small />
      <MockPill label="Bottoms" bg="#F2F2F6" color="#8A8A93" small />
      <MockPill label="Shoes" bg="#F2F2F6" color="#8A8A93" small />
    </View>
    <View style={s.closetGrid}>
      {PHOTO.closet.map((src, i) => (
        <View key={i} style={s.closetCard}>
          <Image source={src} style={s.closetImg} resizeMode="cover" />
        </View>
      ))}
    </View>
    <MockTabBar active="closet" />
  </View>
);

/** 3. 쇼핑몰 — 자동 스캔·캡쳐로 옷을 가져오는 화면. 탭바 대신 스캔 바가 붙습니다. */
export const MallScene = () => (
  <View style={s.fill}>
    <MockStatusBar />
    <View style={s.browserBar}>
      <Text style={s.browserChevron}>‹</Text>
      <View style={s.urlPill}>
        <Text style={s.urlText}>shop.co.kr</Text>
      </View>
    </View>
    {/* 상품을 칸 끝까지 채우면 목업이 '바지 사진 한 장'으로 보입니다.
        여백을 주고 아래에 상품 정보를 붙여야 **쇼핑몰 상품 페이지**로 읽힙니다. */}
    <View style={s.mallStage}>
      <Image source={PHOTO.mall} style={s.mallPhoto} resizeMode="contain" />
    </View>
    <View style={s.mallInfo}>
      <Text style={s.mallBrand}>데일리 데님</Text>
      <Text style={s.mallName}>와이드 스트레이트 데님 팬츠</Text>
      <Text style={s.mallPrice}>39,000원</Text>
    </View>
    <View style={s.buyRow}>
      <View style={s.likeCol}>
        <Text style={s.likeHeart}>♡</Text>
        <Text style={s.likeCount}>10</Text>
      </View>
      <View style={s.buyButton}>
        <Text style={s.buyText}>구매하기</Text>
      </View>
    </View>
    {/* 이 두 버튼이 코디팝이 얹는 부분입니다. 그래서 아래에서 가장 눈에 띄어야 합니다. */}
    <View style={s.scanBar}>
      <LinearGradient
        colors={['#FF6B9D', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.scanPrimary}>
        <Text style={s.scanPrimaryText}>자동 스캔</Text>
      </LinearGradient>
      <View style={s.scanSecondary}>
        <Text style={s.scanSecondaryText}>캡쳐</Text>
      </View>
    </View>
  </View>
);

/** 4. 커뮤니티 — 남의 코디를 그 자리에서 입어보는 '따라입기'. */
export const CommunityScene = () => (
  <View style={s.fill}>
    <MockStatusBar />
    <View style={s.plainHeader}>
      <Text style={s.plainTitle}>커뮤니티</Text>
      <MockPill label="코디 자랑하기" bg="#8B5CF6" color="#FFFFFF" small />
    </View>
    <View style={s.chipRow}>
      <MockPill label="최신" bg="#F0E8FF" color="#7C3AED" small />
      <MockPill label="저장" bg="#F2F2F6" color="#8A8A93" small />
    </View>
    <View style={s.postCard}>
      <View style={s.postHead}>
        <Image source={PHOTO.avatar} style={s.postAvatar} />
        <View>
          <Text style={s.postName}>푸르스름이</Text>
          <Text style={s.postSub}>코디 자랑</Text>
        </View>
      </View>
      <Image source={PHOTO.community} style={s.postPhoto} resizeMode="cover" />
      <View style={s.postFoot}>
        <Text style={s.postMeta}>좋아요 12 · 저장 4</Text>
        <Text style={s.postCta}>따라입기</Text>
      </View>
    </View>
    <MockTabBar active="community" />
  </View>
);

/** 5. 코디북 — 입어본 것이 쌓입니다. 마지막 장이라 '결과가 남는다'를 보여줍니다. */
export const CodiBookScene = () => (
  <View style={s.fill}>
    <MockStatusBar />
    <View style={s.plainHeader}>
      <Text style={s.plainTitle}>코디북</Text>
      <Text style={s.plainCount}>28벌</Text>
    </View>
    <View style={s.chipRow}>
      <MockPill label="최신순" bg="#8B5CF6" color="#FFFFFF" small />
      <MockPill label="일별" bg="#F2F2F6" color="#8A8A93" small />
      <MockPill label="월별" bg="#F2F2F6" color="#8A8A93" small />
    </View>
    {/* 3열 3행으로 꽉 채웁니다 — 마지막 장의 메시지가 '쌓인다'라서
        빈 줄이 남으면 정반대로 읽힙니다. 사진 6장을 돌려 씁니다. */}
    <View style={s.codiGrid}>
      {Array.from({ length: 9 }, (_, i) => (
        <Image
          key={i}
          source={PHOTO.codi[i % PHOTO.codi.length]}
          style={s.codiCell}
          resizeMode="cover"
        />
      ))}
    </View>
    <MockTabBar active="codibook" />
  </View>
);

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#FFFFFF' },

  // ── 공통 헤더 ────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 7,
  },
  ticketBadge: {
    backgroundColor: '#F6EEFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
  },
  ticketText: { fontSize: 9, color: '#5B5B66', fontWeight: '600' },
  ticketNum: { color: '#7C3AED', fontWeight: '800' },
  ticketAction: { fontSize: 9.5, color: '#7C3AED', fontWeight: '800' },
  plainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 8,
  },
  plainTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A22' },
  plainCount: { fontSize: 9.5, color: '#9A9AA4', fontWeight: '600' },
  chipRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 9,
  },

  // ── 1. 피팅룸 ────────────────────────────────
  // 사진 칸은 고정 높이입니다. flex 로 두면 옷장 그리드가 밀려
  // "고를 옷이 깔려 있다"는 이 슬라이드의 요지가 사라집니다.
  stageShort: { height: 218, position: 'relative', backgroundColor: '#EDEDF2' },
  stagePhoto: { width: '100%', height: '100%' },
  personThumb: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tryOnPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tryOnText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  resultActions: {
    position: 'absolute',
    right: 9,
    bottom: 46,
    alignItems: 'center',
    gap: 9,
  },
  circleWrap: { alignItems: 'center', gap: 2 },
  circleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    // 사진 위에 흰 원을 얹으면 밝은 부분에서 원 자체가 사라집니다.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  circleCaption: {
    // 목업 배율(약 45%)에서 7pt 는 글자가 뭉개져 그림자만 남습니다.
    // 앱의 캡션은 지우지 않고(19항의 이유가 그대로 유효) 읽히게만 키웠습니다.
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 3,
  },
  closetPanel: {
    flex: 1,
    marginTop: -14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    paddingTop: 6,
    gap: 5,
  },
  peekHandle: {
    width: 34,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#CFCFD8',
  },
  peekLabel: { fontSize: 10, fontWeight: '800', color: '#1A1A22' },
  closetTabs: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF3',
  },
  closetTabItem: { flex: 1, alignItems: 'center', paddingBottom: 5 },
  closetTabText: { fontSize: 8, fontWeight: '700', color: '#A0A0A9' },
  closetTabTextOn: { color: '#1A1A22', fontWeight: '800' },
  closetTabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 26,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1A1A22',
  },
  panelGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    paddingHorizontal: 9,
    paddingTop: 5,
    gap: 5,
  },
  panelCell: {
    width: 48,
    height: 48,
    borderRadius: 7,
    backgroundColor: '#F5F5F7',
  },
  panelAdd: {
    width: 48,
    height: 48,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#DCDCE2',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelAddMark: { fontSize: 16, color: '#B6B6BE', fontWeight: '300' },

  // ── 2. 내 옷장 ───────────────────────────────
  closetGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  closetCard: {
    width: '47.5%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#F7F7F9',
    overflow: 'hidden',
  },
  closetImg: { width: '100%', height: '100%' },

  // ── 3. 쇼핑몰 ────────────────────────────────
  browserBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  browserChevron: { fontSize: 15, color: '#8A8A93', fontWeight: '700' },
  urlPill: {
    flex: 1,
    backgroundColor: '#F2F2F6',
    borderRadius: 999,
    paddingVertical: 4,
    alignItems: 'center',
  },
  urlText: { fontSize: 9, color: '#7A7A83', fontWeight: '600' },
  mallStage: {
    flex: 1,
    // 상품 사진의 배경색과 맞춥니다. 다르면 사진 경계가 네모로 드러납니다.
    backgroundColor: '#F2F2F2',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  mallPhoto: { width: '100%', height: '100%' },
  mallInfo: { paddingHorizontal: 14, paddingTop: 10, gap: 2 },
  mallBrand: { fontSize: 8.5, color: '#9A9AA4', fontWeight: '700' },
  mallName: { fontSize: 11, color: '#1A1A22', fontWeight: '700' },
  mallPrice: { fontSize: 12, color: '#1A1A22', fontWeight: '800' },
  buyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  likeCol: { alignItems: 'center' },
  likeHeart: { fontSize: 13, color: '#1A1A22' },
  likeCount: { fontSize: 8, color: '#6A6A73', fontWeight: '600' },
  buyButton: {
    flex: 1,
    backgroundColor: '#15151A',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  buyText: { fontSize: 10.5, color: '#FFFFFF', fontWeight: '800' },
  scanBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFEFF3',
  },
  scanPrimary: {
    flex: 1.4,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
  scanPrimaryText: { fontSize: 10.5, color: '#FFFFFF', fontWeight: '800' },
  scanSecondary: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#D6D6DE',
  },
  scanSecondaryText: { fontSize: 10.5, color: '#3A3A44', fontWeight: '700' },

  // ── 4. 커뮤니티 ──────────────────────────────
  postCard: { flex: 1, backgroundColor: '#FAFAFC' },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  postAvatar: { width: 26, height: 26, borderRadius: 13 },
  postName: { fontSize: 10.5, fontWeight: '800', color: '#1A1A22' },
  postSub: { fontSize: 8.5, color: '#9A9AA4' },
  postPhoto: { flex: 1, width: '100%' },
  postFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  postMeta: { fontSize: 9, color: '#6A6A73', fontWeight: '600' },
  postCta: { fontSize: 10, color: '#7C3AED', fontWeight: '800' },

  // ── 5. 코디북 ────────────────────────────────
  codiGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    paddingHorizontal: 12,
    gap: 6,
  },
  codiCell: {
    width: '31.6%',
    height: 144,
    borderRadius: 8,
    backgroundColor: '#EDEDF2',
  },
});
