package com.merncrmmobile;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import android.telecom.TelecomManager;
import android.content.Context;
import android.content.Intent;

public class CallBridge extends ReactContextBaseJavaModule {
    public static CallBridge instance;
    private final ReactApplicationContext reactContext;

    public CallBridge(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        instance = this;
    }

    @Override
    public String getName() {
        return "CallBridge";
    }

    @ReactMethod
    public void requestDefaultDialer(Promise promise) {
        // Kept for future use, but not strictly needed for Speakerphone mode
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            Intent intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
            intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, reactContext.getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                reactContext.startActivity(intent);
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("ERROR", "Failed to launch content: " + e.getMessage());
            }
        } else {
            promise.reject("UNSUPPORTED", "Not supported on this Android version");
        }
    }

    public void sendEvent(String eventName, String data) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, data);
        }
    }

    @ReactMethod
    public void answerCall() {
        // No-op: We are not InCallService anymore
    }

    @ReactMethod
    public void endCall() {
        // No-op: We are not InCallService anymore
    }

    @ReactMethod
    public void startRecording(String path, Promise promise) {
        if (RecordingService.instance != null) {
            boolean success = RecordingService.instance.startRecording(path);
            if (success) {
                promise.resolve(true);
            } else {
                promise.reject("RECORDING_FAILED", "Failed to start recording");
            }
        } else {
            promise.reject("SERVICE_NOT_CONNECTED",
                    "RecordingService is not active. Please enable Accessibility Service.");
        }
    }

    @ReactMethod
    public void getCurrentCall(Promise promise) {
        promise.resolve(null);
    }

    @ReactMethod
    public void stopRecording() {
        if (RecordingService.instance != null) {
            RecordingService.instance.stopRecording();
        }
    }
}
