#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTComponentViewProtocol.h>
#import <Firebase.h>

// Static framework에서 Fabric 컴포넌트 심볼이 제대로 링크되도록 강제 참조
#if RCT_NEW_ARCH_ENABLED
// react-native-screens의 Fabric 컴포넌트 심볼을 강제로 링크하기 위한 extern 선언
#ifdef __cplusplus
extern "C" {
#endif

extern Class<RCTComponentViewProtocol> RNSBottomTabsCls(void) __attribute__((used));
extern Class<RCTComponentViewProtocol> RNSBottomTabsScreenCls(void) __attribute__((used));
extern Class<RCTComponentViewProtocol> RNSSafeAreaViewCls(void) __attribute__((used));
extern Class<RCTComponentViewProtocol> RNSScreenStackHostCls(void) __attribute__((used));
extern Class<RCTComponentViewProtocol> RNSSplitViewHostCls(void) __attribute__((used));
extern Class<RCTComponentViewProtocol> RNSSplitViewScreenCls(void) __attribute__((used));
extern Class<RCTComponentViewProtocol> RNSStackScreenCls(void) __attribute__((used));

#ifdef __cplusplus
}
#endif

// 심볼을 강제로 참조하여 링커가 제거하지 않도록 함
// 실제로 호출되도록 didFinishLaunchingWithOptions에서 호출
static void _forceLinkRNScreensSymbols(void) {
  // 실제로 함수를 호출하여 링커가 심볼을 찾도록 함
  Class<RCTComponentViewProtocol> _ __attribute__((unused));
  _ = RNSBottomTabsCls();
  _ = RNSBottomTabsScreenCls();
  _ = RNSSafeAreaViewCls();
  _ = RNSScreenStackHostCls();
  _ = RNSSplitViewHostCls();
  _ = RNSSplitViewScreenCls();
  _ = RNSStackScreenCls();
}
#endif

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Firebase 초기화
  [FIRApp configure];
  
#if RCT_NEW_ARCH_ENABLED
  // react-native-screens Fabric 컴포넌트 심볼을 강제로 링크
  _forceLinkRNScreensSymbols();
#endif
  
  self.moduleName = @"CodiPop";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
