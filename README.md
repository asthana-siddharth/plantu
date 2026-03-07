# My Mobile App

## Overview
This project is a mobile application built using React Native. It is designed to run on both Android and iOS platforms, providing a seamless user experience across devices.

## Project Structure
The project is organized into the following main directories:

- **android**: Contains all Android-specific code and resources.
  - **app**: The main application module for Android.
    - **src**: Source code for the Android app.
      - **main**: Contains the main application code and resources.
        - **java/com/mymobileapp**: Java source files for the app.
        - **res**: Resources such as layouts, drawables, and values.
      - **debug**: Contains the AndroidManifest for the debug build variant.
    - **build.gradle**: Gradle build configuration for the Android app module.
  - **build.gradle**: Top-level Gradle build configuration for the Android project.

- **ios**: Contains all iOS-specific code and resources.
  - **mymobileapp**: The main application directory for iOS.
    - **AppDelegate.h**: Header file for the AppDelegate class.
    - **AppDelegate.m**: Implementation file for the AppDelegate class.
    - **Info.plist**: Configuration settings for the iOS app.
    - **main.m**: Entry point for the iOS app.
  - **mymobileapp.xcodeproj**: Xcode project configuration.
  - **mymobileappTests**: Contains unit tests for the iOS app.

- **src**: Contains shared React Native components and screens.
  - **components**: Contains reusable components.
    - **App.js**: Main App component.
  - **screens**: Contains screen components.
    - **HomeScreen.js**: Home screen component.
  - **App.js**: Entry point for the React Native application.

- **package.json**: Configuration file for npm, listing dependencies and scripts.
- **index.js**: Entry point for the React Native application, registering the main component.

## Getting Started
To get started with the project, follow these steps:

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd my-mobile-app
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Run the application:
   - For Android:
     ```
     npx react-native run-android
     ```
   - For iOS:
     ```
     npx react-native run-ios
     ```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Backend And Local Data Stack

The backend is in `backend/` (Node + Express) and uses:

- MySQL primary for writes (`localhost:3307`)
- MySQL secondary for reads (`localhost:3308`)
- Elasticsearch for order read APIs (`localhost:9200`)

### Start local dependencies

From project root:

```bash
docker compose up -d
```

### Configure backend env

```bash
cd backend
cp .env.example .env
```

The defaults in `.env.example` already match the Docker port mappings above.

### Start backend

```bash
cd backend
npm install
npm run start
```

Backend runs on `http://localhost:4000` by default.

### Dependency health check

```bash
curl http://localhost:4000/health/dependencies
```

Expected: `success: true` once MySQL primary/secondary and Elasticsearch are reachable.

### Stop local dependencies

From project root:

```bash
docker compose down
```