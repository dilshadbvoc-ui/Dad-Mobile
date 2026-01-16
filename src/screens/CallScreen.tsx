import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { CallBridgeService } from '../services/CallBridge';
// import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');

interface CallScreenProps {
    callerNumber: string;
    callState: string;
    onDismiss: () => void;
}

export const CallScreen: React.FC<CallScreenProps> = ({ callerNumber, callState, onDismiss }) => {
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        // Auto-start recording on active call if desired, or manual
        if (callState === "4") { // Active
            // startRecording();
        }
    }, [callState]);

    const handleAnswer = () => {
        CallBridgeService.answerCall();
    };

    const handleHangup = () => {
        CallBridgeService.endCall();
        onDismiss();
    };

    const toggleRecording = async () => {
        if (isRecording) {
            CallBridgeService.stopRecording();
            setIsRecording(false);
        } else {
            // const path = `${RNFS.DocumentDirectoryPath}/call_${Date.now()}.mp4`; // RNFS needed
            const path = `/storage/emulated/0/Music/call_${Date.now()}.m4a`; // Simplest public path for test
            try {
                await CallBridgeService.startRecording(path);
                setIsRecording(true);
            } catch (err) {
                console.error("Failed to record", err);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.number}>{callerNumber}</Text>
                <Text style={styles.status}>{getStatusText(callState)}</Text>
            </View>

            <View style={styles.controls}>
                {/* Incoming Ringing State = 2 */}
                {callState === '2' ? (
                    <TouchableOpacity style={[styles.btn, styles.btnAnswer]} onPress={handleAnswer}>
                        <Text style={styles.btnText}>Answer</Text>
                    </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={[styles.btn, styles.btnHangup]} onPress={handleHangup}>
                    <Text style={styles.btnText}>Hangup</Text>
                </TouchableOpacity>
            </View>

            {callState === '4' && ( // Active
                <TouchableOpacity style={[styles.btn, isRecording ? styles.btnRecActive : styles.btnRec]} onPress={toggleRecording}>
                    <Text style={styles.btnText}>{isRecording ? "Stop Rec" : "Record"}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

function getStatusText(state: string) {
    switch (state) {
        case '2': return 'Incoming...';
        case '4': return 'Active'; // STATE_ACTIVE
        case '1': return 'Dialing...';
        case '7': return 'Disconnected';
        default: return `State: ${state}`;
    }
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0f172a',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
        elevation: 10,
    },
    header: { alignItems: 'center', marginTop: 50 },
    number: { fontSize: 32, color: 'white', fontWeight: 'bold' },
    status: { fontSize: 18, color: '#94a3b8', marginTop: 10 },
    controls: { flexDirection: 'row', gap: 40, marginBottom: 50 },
    btn: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center',
    },
    btnAnswer: { backgroundColor: '#22c55e' },
    btnHangup: { backgroundColor: '#ef4444' },
    btnRec: { backgroundColor: '#3b82f6', width: 60, height: 60, borderRadius: 30, marginTop: 20 },
    btnRecActive: { backgroundColor: '#ef4444', width: 60, height: 60, borderRadius: 30, marginTop: 20 },
    btnText: { color: 'white', fontWeight: 'bold' }
});
