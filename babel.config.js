const moduleResolver = [
  'babel-plugin-module-resolver',
  {
    root: ['./src'],
    alias: {
      '~screens': './src/screens',
      '~navigators': './src/navigators',
      '~components': './src/components',
      // 나중에 필요할 폴더들도 미리 추가해둡니다.
      '~assets': './src/assets',
      '~utils': './src/utils',
      '~': './src',
    },
    extensions: [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.android.js',
      '.android.tsx',
      '.ios.js',
      '.ios.tsx',
    ],
  },
];

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    moduleResolver,
    // react-native-reanimated/plugin은 항상 plugins 배열의 마지막에 있어야 합니다.
    'react-native-reanimated/plugin',
  ],
};
