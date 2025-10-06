package com.mk.codipop

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.zoontek.rnbootsplash.RNBootSplash // bootsplash import
import com.mk.codipop.R // 1. R 클래스 import 추가

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "CodiPop"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    // 2. 스플래시 화면 초기화 (권장 순서: super 이후)
    RNBootSplash.init(this, R.style.BootTheme)
  }
}