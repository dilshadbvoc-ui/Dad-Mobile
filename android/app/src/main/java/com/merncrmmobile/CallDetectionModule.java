package com.merncrmmobile;

import android.content.Context;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class CallDetectionModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private TelephonyManager telephonyManager;
    private PhoneStateListener phoneStateListener;

    public CallDetectionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "CallDetection";
    }

    @ReactMethod
    public void startListener() {
        if (phoneStateListener != null) {
            return;
        }

        telephonyManager = (TelephonyManager) reactContext.getSystemService(Context.TELEPHONY_SERVICE);
        phoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String incomingNumber) {
                String stateString = "N/A";
                switch (state) {
                    case TelephonyManager.CALL_STATE_IDLE:
                        stateString = "Disconnected";
                        break;
                    case TelephonyManager.CALL_STATE_OFFHOOK:
                        stateString = "Offhook";
                        break;
                    case TelephonyManager.CALL_STATE_RINGING:
                        stateString = "Incoming";
                        break;
                }
                sendEvent("PhoneStateChanged", stateString);
            }
        };

        reactContext.runOnUiQueueThread(new Runnable() {
            @Override
            public void run() {
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
            }
        });
    }

    @ReactMethod
    public void stopListener() {
        if (telephonyManager != null && phoneStateListener != null) {
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
            phoneStateListener = null;
        }
    }

    @ReactMethod
    public void makeCall(String phoneNumber) {
        try {
            android.widget.Toast
                    .makeText(reactContext, "Native Calling: " + phoneNumber, android.widget.Toast.LENGTH_LONG).show(); // DEBUG
                                                                                                                        // TOAST

            // ACTION_DIAL is more reliable than ACTION_CALL as it doesn't strictly require
            // CALL_PHONE permission to just open the keypad, and is less likely to be
            // blocked.
            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_DIAL);
            intent.setData(android.net.Uri.parse("tel:" + phoneNumber));
            intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
        } catch (Exception e) {
            sendEvent("CallError", e.getMessage());
        }
    }

    private void sendEvent(String eventName, String state) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, state);
        }
    }
}
