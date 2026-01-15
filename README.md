# Mobile CRM App

This directory contains the React Native "Device Bridge" app.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Network**:
    *   Open `DeviceBridge.js`.
    *   Change `SERVER_URL` to your computer's IP address (e.g., `http://192.168.1.50:5000`).
    *   *Note: `localhost` works for iOS Simulators but fails on Android Emulators/Devices.*

3.  **Run on Android**:
    ```bash
    npm run android
    ```
    *Ensure you have an Android Emulator running or a device connected via USB with Debugging enabled.*

## Usage
1.  Open the App.
2.  Enter your **User ID** (You can find this in the URL of your User Profile page in the Web CRM, or check the database).
3.  Click **Connect**.
4.  Go to the Web CRM -> Log Call -> **Call on Device**.
