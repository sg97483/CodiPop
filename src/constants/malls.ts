export type MallEntry = {
  id: string;
  name: string;
  url: string;
  host: string;
};

export const DEFAULT_MALLS: MallEntry[] = [
  { id: 'uniqlo', name: '유니클로', url: 'https://www.uniqlo.com/kr/ko/', host: 'uniqlo.com' },
  { id: 'musinsa', name: '무신사', url: 'https://www.musinsa.com/', host: 'musinsa.com' },
  { id: 'ably', name: '에이블리', url: 'https://m.a-bly.com/', host: 'a-bly.com' },
  { id: 'zigzag', name: '지그재그', url: 'https://zigzag.kr/', host: 'zigzag.kr' },
  { id: 'spao', name: '스파오', url: 'https://www.spao.com/', host: 'spao.com' },
  { id: 'hm', name: 'H&M', url: 'https://www2.hm.com/ko_kr/index.html', host: 'hm.com' },
  { id: 'zara', name: 'ZARA', url: 'https://www.zara.com/kr/', host: 'zara.com' },
  { id: 'adidas', name: '아디다스', url: 'https://www.adidas.co.kr/', host: 'adidas.co.kr' },
  { id: 'nike', name: '나이키', url: 'https://www.nike.com/kr/', host: 'nike.com' },
  { id: 'coupang', name: '쿠팡', url: 'https://www.coupang.com/', host: 'coupang.com' },
  { id: 'ssg', name: 'SSG닷컴', url: 'https://www.ssg.com/', host: 'ssg.com' },
  { id: 'lotteon', name: '롯데ON', url: 'https://www.lotteon.com/', host: 'lotteon.com' },
  { id: 'brandi', name: '브랜디', url: 'https://www.brandi.co.kr/', host: 'brandi.co.kr' },
  { id: 'attrangs', name: '아뜨랑스', url: 'https://www.attrangs.co.kr/', host: 'attrangs.co.kr' },
  { id: 'naning9', name: '난닝구', url: 'https://www.naning9.com/', host: 'naning9.com' },
  { id: 'blackup', name: '블랙업', url: 'https://black-up.kr/', host: 'black-up.kr' },
  { id: 'xexymix', name: '젝시믹스', url: 'https://www.xexymix.com/', host: 'xexymix.com' },
  { id: 'thisisneverthat', name: '디스이즈네버댓', url: 'https://www.thisisneverthat.com/', host: 'thisisneverthat.com' },
  { id: 'gmarket', name: 'G마켓', url: 'https://www.gmarket.co.kr/', host: 'gmarket.co.kr' },
  { id: 'shein', name: 'Shein', url: 'https://m.shein.com/', host: 'shein.com' },
  { id: '29cm', name: '29CM', url: 'https://www.29cm.co.kr/', host: '29cm.co.kr' },
  { id: 'wconcept', name: 'W 컨셉', url: 'https://display.wconcept.co.kr/', host: 'wconcept.co.kr' },
  { id: 'naver-shopping', name: '네이버 쇼핑', url: 'https://shopping.naver.com/ns/home', host: 'shopping.naver.com' },
  { id: '8seconds', name: '에잇세컨즈', url: 'https://www.ssfshop.com/', host: 'ssfshop.com' },
  { id: 'cos', name: 'COS', url: 'https://www.cos.com/ko-kr/', host: 'cos.com' },
  { id: 'hmall', name: '현대Hmall', url: 'https://www.hmall.com/', host: 'hmall.com' },
  { id: '11st', name: '11번가', url: 'https://www.11st.co.kr/', host: '11st.co.kr' },
  { id: 'topten', name: '탑텐몰', url: 'https://display-topten10.goodwearmall.com/', host: 'goodwearmall.com' },
  { id: '4910', name: '4910', url: 'https://4910.kr/', host: '4910.kr' },
  { id: 'lfmall', name: 'LF몰', url: 'https://www.lfmall.co.kr/', host: 'lfmall.co.kr' },
  { id: 'sivillage', name: 'S.I.VILLAGE', url: 'https://www.sivillage.com/', host: 'sivillage.com' },
  { id: 'thehandsome', name: '더한섬닷컴', url: 'https://www.thehandsome.com/', host: 'thehandsome.com' },
  { id: 'vanillashu', name: '바닐라슈', url: 'https://vanillashu.co.kr/', host: 'vanillashu.co.kr' },
  { id: 'covernat', name: '커버낫', url: 'https://covernat.net/', host: 'covernat.net' },
  { id: 'kolonmall', name: '코오롱몰', url: 'https://www.kolonmall.com/', host: 'kolonmall.com' },
  { id: 'hfashionmall', name: 'H패션몰', url: 'https://www.hfashionmall.com/', host: 'hfashionmall.com' },
  { id: 'gooutstore', name: '고아웃스토어', url: 'https://gooutstore.co.kr/', host: 'gooutstore.co.kr' },
  { id: 'glowny', name: '글로니', url: 'https://glowny.co.kr/', host: 'glowny.co.kr' },
  { id: 'nain', name: '나인', url: 'https://nain.co.kr/', host: 'nain.co.kr' },
  { id: 'nerdy', name: '널디', url: 'https://whoisnerdy.com/', host: 'whoisnerdy.com' },
  { id: 'diamondlayla', name: '다이아몬드 레이라', url: 'https://diamondlayla.com/', host: 'diamondlayla.com' },
  { id: 'thebarnnet', name: '더바넷', url: 'https://thebarnnet.com/', host: 'thebarnnet.com' },
  { id: 'dailylook', name: '데일리룩', url: 'https://dailylook.kr/', host: 'dailylook.kr' },
  { id: 'drawfit', name: '드로우핏', url: 'https://draw-fit.com/', host: 'draw-fit.com' },
  { id: 'likeyou', name: '라이크유', url: 'https://like-you.kr/', host: 'like-you.kr' },
  { id: 'rexmonde', name: '렉스몬드', url: 'https://www.rexmonde.com/', host: 'rexmonde.com' },
  { id: 'lemouton', name: '르무통', url: 'https://lemouton.co.kr/', host: 'lemouton.co.kr' },
  { id: 'liphop', name: '립합', url: 'https://liphop.co.kr/', host: 'liphop.co.kr' },
  { id: 'mardimercredi', name: '마르디 메크르디', url: 'https://mardimercredi.com/', host: 'mardimercredi.com' },
  { id: 'midasb', name: '마이더스비', url: 'https://midasb.co.kr/', host: 'midasb.co.kr' },
  { id: 'miamasvin', name: '미아마스빈', url: 'https://miamasvin.co.kr/', host: 'miamasvin.co.kr' },
  { id: 'milkcocoa', name: '밀크코코아', url: 'https://www.milkcocoa.co.kr/', host: 'milkcocoa.co.kr' },
  { id: 'babathe', name: '바바더닷컴', url: 'https://babathe.com/', host: 'babathe.com' },
  { id: 'badblood', name: '배드블러드', url: 'https://badblood.co.kr/', host: 'badblood.co.kr' },
  { id: 'benito', name: '베니토', url: 'https://benito.co.kr/', host: 'benito.co.kr' },
  { id: 'sappun', name: '사뿐', url: 'https://sappun.co.kr/', host: 'sappun.co.kr' },
  { id: 'salomon', name: '살로몬 코리아', url: 'https://salomon.co.kr/', host: 'salomon.co.kr' },
  { id: 'style24', name: '스타일24', url: 'https://www.style24.com/', host: 'style24.com' },
  { id: 'storynine', name: '스토리나인', url: 'https://storynine.co.kr/', host: 'storynine.co.kr' },
  { id: 'annanblue', name: '안나앤블루', url: 'https://annanblue.com/', host: 'annanblue.com' },
  { id: 'uptownholic', name: '업타운홀릭', url: 'https://uptownholic.com/', host: 'uptownholic.com' },
  { id: 'enter6', name: '엔터식스몰', url: 'https://enter6.co.kr/', host: 'enter6.co.kr' },
  { id: 'umer', name: '유메르', url: 'https://umer.co.kr/', host: 'umer.co.kr' },
  { id: '66girls', name: '육육걸즈', url: 'https://66girls.co.kr/', host: '66girls.co.kr' },
  { id: 'elandmall', name: '이랜드몰', url: 'https://elandmall.com/', host: 'elandmall.com' },
  { id: 'xeroxero', name: '제로', url: 'https://xeroxero.co.kr/', host: 'xeroxero.co.kr' },
  { id: 'gentlemonster', name: '젠틀몬스터', url: 'https://www.gentlemonster.com/', host: 'gentlemonster.com' },
  { id: 'joamom', name: '조아맘', url: 'https://joamom.co.kr/', host: 'joamom.co.kr' },
  { id: 'chuu', name: '츄 (CHUU)', url: 'https://chuu.co.kr/', host: 'chuu.co.kr' },
  { id: 'canmart', name: '캔마트', url: 'https://canmart.co.kr/', host: 'canmart.co.kr' },
  { id: 'coor', name: '쿠어', url: 'https://coor.kr/', host: 'coor.kr' },
  { id: 'queenit', name: '퀸잇', url: 'https://queenit.kr/', host: 'queenit.kr' },
  { id: 'kream', name: '크림', url: 'https://kream.co.kr/', host: 'kream.co.kr' },
  { id: 'trenbe', name: '트렌비', url: 'https://www.trenbe.com/', host: 'trenbe.com' },
  { id: 'partimento', name: '파르티멘토', url: 'https://partimento.com/', host: 'partimento.com' },
  { id: 'personalpack', name: '퍼스널팩', url: 'https://personal-pack.com/', host: 'personal-pack.com' },
  { id: 'beginning', name: '프롬비기닝', url: 'https://beginning.kr/', host: 'beginning.kr' },
  { id: 'plac', name: '플랙', url: 'https://plac-official.com/', host: 'plac-official.com' },
  { id: 'hiver', name: '하이버', url: 'https://www.hiver.co.kr/', host: 'hiver.co.kr' },
  { id: 'halfclub', name: '하프클럽', url: 'https://halfclub.com/', host: 'halfclub.com' },
  { id: 'hotping', name: '핫핑', url: 'https://hotping.co.kr/', host: 'hotping.co.kr' },
];

export const MALL_FAVORITES_KEY = '@codipop/mall_favorites';
export const MALL_RECENT_KEY = '@codipop/mall_recent';
export const MAX_MALL_RECENT = 20;

export function normalizeMallUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getMallDisplayName(url: string, fallback?: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const known = DEFAULT_MALLS.find(m => host.includes(m.host));
    return known?.name || fallback || host;
  } catch {
    return fallback || url;
  }
}
