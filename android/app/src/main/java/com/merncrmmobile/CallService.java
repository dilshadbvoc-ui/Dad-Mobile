package com.merncrmmobile;

import android.telecom.Call;
import android.telecom.InCallService;
import android.content.Intent;
import android.util.Log;

public class CallService extends InCallService {
    public static CallService instance;
    public Call currentCall;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        this.currentCall = call;
        Log.d("CallService", "Call Added");

        // Notify RN via CallBridge
        if (CallBridge.instance != null) {
            String number = call.getDetails().getHandle().getSchemeSpecificPart();
            CallBridge.instance.sendEvent("CallAdded", number);
        } else {
            // Launch UI if not running
            try {
                Intent intent = new Intent(this, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                intent.putExtra("isIncomingCall", true);
                intent.putExtra("callerNumber", call.getDetails().getHandle().getSchemeSpecificPart());
                startActivity(intent);
            } catch (Exception e) {
                Log.e("CallService", "Failed to launch activity", e);
            }
        }

        call.registerCallback(new Call.Callback() {
            @Override
            public void onStateChanged(Call call, int state) {
                super.onStateChanged(call, state);
                Log.d("CallService", "Call State Changed: " + state);
                if (CallBridge.instance != null) {
                    CallBridge.instance.sendEvent("CallStateChanged", String.valueOf(state));
                }
            }
        });
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        Log.d("CallService", "Call Removed");
        this.currentCall = null;
        if (CallBridge.instance != null) {
            CallBridge.instance.sendEvent("CallRemoved", null);
        }
    }

    public void answerCall() {
        if (currentCall != null) {
            currentCall.answer(0);
        }
    }

    public void endCall() {
        if (currentCall != null) {
            currentCall.disconnect();
        }
    }
}
