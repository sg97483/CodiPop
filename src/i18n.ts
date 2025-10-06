// src/i18n.ts

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {getLocales} from 'react-native-localize';

import en from './locales/en.json';
import ko from './locales/ko.json';

const resources = {
  en: en,
  ko: ko,
};

// 기기의 언어 설정 목록의 첫 번째 언어 코드를 가져옵니다. (예: 'ko' 또는 'en')
const deviceLanguageCode = getLocales()[0].languageCode;

// 우리 앱이 지원하는 언어 목록
const supportedLanguages = Object.keys(resources);

// 기기의 언어가 우리 앱에서 지원되는지 확인합니다.
// 지원되면 해당 언어를 사용하고, 아니면 영어(en)를 기본값으로 사용합니다.
const initialLanguage = supportedLanguages.includes(deviceLanguageCode)
  ? deviceLanguageCode
  : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage, // 앱이 시작될 때 사용할 언어를 여기서 지정합니다.
  fallbackLng: 'en', // 만약 lng 언어에 대한 번역이 없을 경우, 영어로 대체합니다.
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
