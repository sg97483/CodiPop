# CodiPop

A React Native mobile application for virtual fitting and travel preferences with Firebase authentication and multi-language support.

## Description

CodiPop is a mobile application built with React Native that provides virtual fitting capabilities and travel preference management. The app features:

- Firebase authentication with Google Sign-In and Apple authentication
- Multi-language support (English and Korean)
- Virtual fitting screen functionality
- Travel preferences management
- Personal touch customization
- Onboarding flow for new users
- Post-login onboarding for returning users

## How to Run

### Prerequisites

- Node.js (>=18)
- React Native development environment
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Install iOS dependencies:
```bash
npm run pod
# or
yarn pod
```

### Running the App

#### iOS
```bash
# Run on iOS Simulator (iPhone 15)
npm run i
# or
yarn i

# Run on iOS Simulator
npm run ios
# or
yarn ios

# Run on physical device (Debug mode)
npm run iosd
# or
yarn iosd

# Run on physical device (Release mode)
npm run iosr
# or
yarn iosr
```

#### Android
```bash
# Run on Android
npm run a
# or
yarn a
```

#### Metro Bundler
```bash
# Start Metro bundler
npm start
# or
yarn start

# Clean Metro cache and restart
npm run metclean
# or
yarn metclean
```

### Building for Production

#### Android APK
```bash
npm run apk
# or
yarn apk
```

#### Android AAB (Google Play Store)
```bash
npm run aab
# or
yarn aab
```

## How to Test

### Running Tests
```bash
# Run all tests
npm test
# or
yarn test

# Run tests with coverage
npm test -- --coverage
# or
yarn test -- --coverage
```

### Linting and Formatting
```bash
# Run ESLint
npm run lint
# or
yarn lint

# Format code with Prettier
npm run format
# or
yarn format
```

### Clean Build
```bash
# Clean Android build
npm run clean:android
# or
yarn clean:android
```

## Project Structure

```
src/
├── assets/           # Images and icons
├── components/       # Reusable components
├── locales/         # Internationalization files
├── navigators/      # Navigation configuration
└── screens/         # Screen components
    ├── HomeScreen.tsx
    ├── LoginScreen.tsx
    ├── OnboardingScreen.tsx
    ├── PersonalTouchScreen.tsx
    ├── SignUpSuccessScreen.tsx
    ├── TravelPreferencesScreen.tsx
    └── VirtualFittingScreen.tsx
```

## Key Features

- **Authentication**: Firebase Auth with Google and Apple Sign-In
- **Internationalization**: Support for English and Korean
- **Navigation**: React Navigation with stack navigators
- **State Management**: AsyncStorage for persistent data
- **UI Components**: Custom screens for onboarding and user preferences
- **Platform Support**: Both iOS and Android

## Dependencies

### Core Dependencies
- React Native 0.74.2
- React Navigation 6.x
- Firebase SDK
- AsyncStorage
- React Native BootSplash

### Development Dependencies
- TypeScript
- ESLint
- Prettier
- Jest for testing

## Python Scripts

### Running Python Scripts

To run the main Python script:
```bash
python main.py
```

### Testing Python Scripts

To run the Python tests:
```bash
pytest test_main.py
```

## Environment Setup

Make sure you have the following configured:
- Firebase project with authentication enabled
- Google Services configuration files
- iOS provisioning profiles (for device testing)
- Android signing configuration (for release builds)