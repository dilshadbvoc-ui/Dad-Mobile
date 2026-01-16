import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallBridge } = NativeModules;
const eventEmitter = CallBridge ? new NativeEventEmitter(CallBridge) : { addListener: () => ({ remove: () => { } }) } as any;

export interface CallBridgeInterface {
    answerCall: () => void;
    endCall: () => void;
    startRecording: (path: string) => Promise<boolean>;
    stopRecording: () => void;
    getCurrentCall: () => Promise<{ number: string, state: number } | null>;
    requestDefaultDialer: () => Promise<boolean>;

    // Event Listeners
    subscribeToCallEvents: (
        onCallAdded: (number: string) => void,
        onCallRemoved: () => void,
        onCallStateChanged: (state: string) => void
    ) => () => void;
}

export const CallBridgeService: CallBridgeInterface = {
    answerCall: () => {
        if (Platform.OS === 'android' && CallBridge) {
            CallBridge.answerCall();
        }
    },
    endCall: () => {
        if (Platform.OS === 'android' && CallBridge) {
            CallBridge.endCall();
        }
    },
    startRecording: async (path: string) => {
        if (Platform.OS === 'android' && CallBridge) {
            return CallBridge.startRecording(path);
        }
        return false;
    },
    stopRecording: () => {
        if (Platform.OS === 'android' && CallBridge) {
            CallBridge.stopRecording();
        }
    },
    getCurrentCall: async () => {
        if (Platform.OS === 'android' && CallBridge) {
            try {
                return await CallBridge.getCurrentCall();
            } catch (e) {
                console.warn("CallBridge.getCurrentCall failed", e);
            }
        }
        return null;
    },
    requestDefaultDialer: async () => {
        if (Platform.OS === 'android' && CallBridge) {
            try {
                return await CallBridge.requestDefaultDialer();
            } catch (e) {
                console.warn("CallBridge.requestDefaultDialer failed", e);
            }
        }
        return false;
    },

    subscribeToCallEvents: (onCallAdded, onCallRemoved, onCallStateChanged) => {
        if (Platform.OS !== 'android' || !CallBridge) return () => { };

        try {
            const sub1 = eventEmitter.addListener('CallAdded', onCallAdded);
            const sub2 = eventEmitter.addListener('CallRemoved', onCallRemoved);
            const sub3 = eventEmitter.addListener('CallStateChanged', onCallStateChanged);

            return () => {
                sub1.remove();
                sub2.remove();
                sub3.remove();
            };
        } catch (e) {
            console.warn("Error subscribing to call events", e);
            return () => { };
        }
    }
};
