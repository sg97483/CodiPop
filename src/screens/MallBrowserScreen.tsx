import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';
import { captureRef } from 'react-native-view-shot';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  EXTRACT_PAGE_IMAGES_JS,
  addRecentMall,
  findMallByUrl,
  getFavoriteMallIds,
  toggleFavoriteMall,
} from '../services/mallBrowserService';
import {
  getMallDisplayName,
  normalizeMallUrl,
} from '../constants/malls';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MallBrowser'>;

const ANALYZE_API = 'https://codipop-backend.onrender.com/analyze-clothing';

// react-native-webview 타입과 RN 0.77 조합에서 props가 never로 추론되는 이슈 회피
const BrowserWebView = WebView as React.ComponentType<any>;

const MallBrowserScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const webRef = useRef<any>(null);
  const captureWrapRef = useRef<View>(null);

  const [currentUrl, setCurrentUrl] = useState(route.params.url);
  const [address, setAddress] = useState(route.params.url);
  const [title, setTitle] = useState(route.params.title || '');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  React.useEffect(() => {
    getFavoriteMallIds().then(setFavoriteIds);
  }, []);

  const matchedMall = useMemo(() => findMallByUrl(currentUrl), [currentUrl]);
  const isFavorite = matchedMall ? favoriteIds.includes(matchedMall.id) : false;

  const shopName = useMemo(
    () => getMallDisplayName(currentUrl, title || matchedMall?.name),
    [currentUrl, title, matchedMall],
  );

  const goAddress = () => {
    const next = normalizeMallUrl(address);
    if (!next) {
      return;
    }
    setCurrentUrl(next);
    setAddress(next);
  };

  const handleToggleFavorite = async () => {
    if (!matchedMall) {
      Toast.show({ type: 'info', text1: t('mallFavoriteOnlyKnown') });
      return;
    }
    setFavoriteIds(await toggleFavoriteMall(matchedMall.id));
  };

  const openScanResult = useCallback(
    (params: RootStackParamList['MallScanResult']) => {
      navigation.navigate('MallScanResult', params);
    },
    [navigation],
  );

  const handleAutoScan = () => {
    if (scanning) {
      return;
    }
    setScanning(true);
    webRef.current?.injectJavaScript(EXTRACT_PAGE_IMAGES_JS);
    setTimeout(() => setScanning(false), 8000);
  };

  const handleCapture = async () => {
    if (capturing || !captureWrapRef.current) {
      return;
    }
    try {
      setCapturing(true);
      const uri = await captureRef(captureWrapRef, {
        format: 'jpg',
        quality: 0.85,
        result: 'tmpfile',
      });

      let suggestedCategory: RootStackParamList['MallScanResult']['suggestedCategory'];
      let suggestedName: string | undefined;

      try {
        const formData = new FormData();
        formData.append('image', {
          uri,
          name: 'capture.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await fetch(ANALYZE_API, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data?.success) {
          suggestedCategory = data.category;
          suggestedName = data.productName;
        }
      } catch (analyzeError) {
        console.warn('analyze-clothing failed', analyzeError);
      }

      openScanResult({
        images: [{ uri, sourceType: 'file' }],
        productUrl: currentUrl,
        shopName,
        suggestedCategory,
        suggestedName,
        mode: 'capture',
      });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('mallCaptureFailed') });
    } finally {
      setCapturing(false);
    }
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'EXTRACT_IMAGES_ERROR') {
        setScanning(false);
        Toast.show({
          type: 'error',
          text1: t('mallScanFailed'),
          text2: payload.message,
        });
        return;
      }
      if (payload.type !== 'EXTRACT_IMAGES') {
        return;
      }
      setScanning(false);
      const images: string[] = Array.isArray(payload.images)
        ? payload.images
        : [];
      if (images.length === 0) {
        Alert.alert(t('mallScanEmptyTitle'), t('mallScanEmptyMessage'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('mallCapture'), onPress: handleCapture },
        ]);
        return;
      }
      openScanResult({
        images: images.map(uri => ({ uri, sourceType: 'url' as const })),
        productUrl: payload.pageUrl || currentUrl,
        shopName: getMallDisplayName(
          payload.pageUrl || currentUrl,
          payload.pageTitle || shopName,
        ),
        mode: 'autoScan',
      });
    } catch (error) {
      setScanning(false);
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top - 8, 0) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.urlInput}
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={goAddress}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          selectTextOnFocus
        />
        <TouchableOpacity onPress={handleToggleFavorite} hitSlop={10}>
          <Text style={[styles.star, isFavorite && styles.starOn]}>
            {isFavorite ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webWrap} ref={captureWrapRef} collapsable={false}>
        <BrowserWebView
          ref={webRef}
          source={{ uri: currentUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(navState: WebViewNavigation) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
            if (navState.url) {
              setCurrentUrl(navState.url);
              setAddress(navState.url);
              addRecentMall({
                url: navState.url,
                name: navState.title || undefined,
              });
            }
            if (navState.title) {
              setTitle(navState.title);
            }
          }}
          onMessage={onMessage}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
        {(loading || scanning || capturing) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1F1A17" />
            <Text style={styles.loadingText}>
              {capturing
                ? t('mallCapturing')
                : scanning
                  ? t('mallScanning')
                  : t('mallLoading')}
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 10) + 16 },
        ]}>
        <TouchableOpacity
          style={[styles.navBtn, !canGoBack && styles.navDisabled]}
          disabled={!canGoBack}
          onPress={() => webRef.current?.goBack()}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, !canGoForward && styles.navDisabled]}
          disabled={!canGoForward}
          onPress={() => webRef.current?.goForward()}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleAutoScan}
          disabled={scanning || capturing}>
          <Text style={styles.primaryText}>{t('mallAutoScan')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleCapture}
          disabled={scanning || capturing}>
          <Text style={styles.secondaryText}>{t('mallCapture')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  close: { fontSize: 18, color: '#333', width: 28, textAlign: 'center' },
  urlInput: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F2F2F4',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#222',
  },
  star: { fontSize: 22, color: '#CCC', width: 28, textAlign: 'center' },
  starOn: { color: '#F5A623' },
  webWrap: { flex: 1, backgroundColor: '#FFF' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { color: '#444', fontSize: 14, fontWeight: '600' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  navBtn: {
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.3 },
  navText: { fontSize: 28, color: '#333', lineHeight: 30 },
  primaryBtn: {
    flex: 1.2,
    backgroundColor: '#1F1A17',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F1A17',
  },
  secondaryText: { color: '#1F1A17', fontWeight: '700', fontSize: 14 },
});

export default MallBrowserScreen;
