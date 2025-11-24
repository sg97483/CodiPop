package com.mk.codipop

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions



class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:

            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // React Native 0.76: SoLoader 초기화 및 so-merging 매핑 등록
    // OpenSourceMergedSoMapping을 전달하여 hermes_executor -> hermestooling 매핑 활성화
    SoLoader.init(this, OpenSourceMergedSoMapping)
    // Firebase 기본 앱을 명시적으로 초기화하여 JS에서 바로 사용할 수 있도록 보장
    if (FirebaseApp.getApps(this).isEmpty()) {
      val options = FirebaseOptions.fromResource(this)
      if (options != null) {
        FirebaseApp.initializeApp(this, options)
        Log.i("MainApplication", "FirebaseApp initialized from resources.")
      } else {
        val manualOptions =
            FirebaseOptions.Builder()
                .setApplicationId("1:19675128705:android:e79c1c2b8605b7dbd7be80")
                .setApiKey("AIzaSyBVqZBCp00kaYlzl3aBfMuMnZ5BwMmh_iY")
                .setProjectId("codipop-63c0d")
                .setGcmSenderId("19675128705")
                .setStorageBucket("codipop-63c0d.firebasestorage.app")
                .build()
        FirebaseApp.initializeApp(this, manualOptions)
        Log.w("MainApplication", "FirebaseApp initialized with manual constants fallback.")
      }
    }
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }
}