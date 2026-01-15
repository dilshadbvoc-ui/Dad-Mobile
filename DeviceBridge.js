import io from 'socket.io-client';
import { Linking, Platform, PermissionsAndroid, Alert } from 'react-native';
import CallDetectorManager from 'react-native-call-detection';
import RNFS from 'react-native-fs';
import axios from 'axios';

// IMPORTANT: Replace this with your computer's local IP address if testing on a real device.
// localhost (10.0.2.2 for Android Emulator) works, but real devices need the IP.
const SERVER_URL = 'https://dad-backend.onrender.com';

class DeviceBridge {
    constructor() {
        this.socket = null;
        this.callDetector = null;
        this.currentCallId = null;
        this.isMonitoring = false;
        this.userId = null;
    }

    async init(userId) {
        if (this.userId === userId) return; // Already initialized

        console.log('Initializing DeviceBridge for user:', userId);
        this.userId = userId;

        const permissionsGranted = await this.requestPermissions();
        if (!permissionsGranted) {
            throw new Error('Permissions (Phone/Storage) were denied. Please enable them in settings.');
        }

        try {
            this.connectSocket();
            this.startCallListener();
        } catch (error) {
            console.error('Initialization error:', error);
            Alert.alert('Error', 'Failed to initialize services: ' + error.message);
        }
    }

    async requestPermissions() {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
                    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                ]);

                const isGranted =
                    granted[PermissionsAndroid.PERMISSIONS.CALL_PHONE] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;

                console.log('Permissions State:', granted);
                return isGranted;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true; // iOS or other
    }

    connectSocket() {
        if (this.socket) this.socket.disconnect();

        this.socket = io(SERVER_URL, {
            query: { userId: this.userId }
        });

        this.socket.on('connect', () => {
            console.log('Mobile Bridge Connected to', SERVER_URL);
            this.socket.emit('join_room', this.userId);
        });

        this.socket.on('disconnect', () => {
            console.log('Mobile Bridge Disconnected');
        });

        this.socket.on('dial_request', ({ phoneNumber, callId }) => {
            console.log('Received Dial Request:', phoneNumber, callId);
            this.currentCallId = callId;
            this.makeCall(phoneNumber);
        });
    }

    makeCall(phoneNumber) {
        if (Platform.OS === 'android') {
            // Initiate the native call
            Linking.openURL(`tel:${phoneNumber}`);
        }
    }

    startCallListener() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        try {
            this.callDetector = new CallDetectorManager((event, phoneNumber) => {
                console.log('Call Detector Event:', event);

                // 'Disconnected' or 'Missed' implies call ended
                if (event === 'Disconnected' && this.currentCallId) {
                    console.log('Call ended. Waiting for recording file...');
                    // Wait 3 seconds for the file system to update
                    setTimeout(() => this.findAndUploadRecording(), 3000);
                }
            },
                true,
                () => { console.log('Permission Denied for Call State'); },
                {
                    title: 'Phone State Permission',
                    message: 'This app needs access to your phone state to detect call end.'
                });
        } catch (error) {
            console.error('Failed to start Call Detector:', error);
            this.isMonitoring = false;
        }
    }

    async findAndUploadRecording() {
        try {
            console.log('Scanning for recent recordings...');

            // Paths depend heavily on the specific Android Manufacturer
            const potentialPaths = [
                RNFS.ExternalStorageDirectoryPath + '/Music/Call Recordings',
                RNFS.ExternalStorageDirectoryPath + '/Recordings',
                RNFS.ExternalStorageDirectoryPath + '/MIUI/sound_recorder/call_rec',
                RNFS.ExternalStorageDirectoryPath + '/VoiceRecorder',
                // Add Samsung/Pixel specific paths here if known
            ];

            let latestFile = null;
            let latestTime = 0;
            const TWO_MINUTES = 120 * 1000;

            for (const path of potentialPaths) {
                if (await RNFS.exists(path)) {
                    const files = await RNFS.readDir(path);

                    files.forEach(file => {
                        // Look for audio files created in the last 2 minutes
                        if (file.isFile()) {
                            // Note: RNFS stat might be needed for mtime if readDir doesn't provide it reliably on all versions
                            // readDir usually returns mtime.
                            const mtime = file.mtime ? new Date(file.mtime).getTime() : 0;

                            if (mtime > latestTime && (Date.now() - mtime) < TWO_MINUTES) {
                                latestTime = mtime;
                                latestFile = file;
                            }
                        }
                    });
                }
            }

            if (latestFile) {
                console.log('Found recording file:', latestFile.path);
                this.uploadRecording(latestFile);
            } else {
                console.log('No recording found within the last 2 minutes.');
                Alert.alert('Sync Failed', 'Could not finding a matching recording file.');
            }

        } catch (error) {
            console.error('Error scanning files:', error);
        }
    }

    async uploadRecording(file) {
        if (!this.currentCallId) return;

        const formData = new FormData();
        formData.append('recording', {
            uri: 'file://' + file.path,
            type: 'audio/mp4', // This MIME type might need to accept general audio
            name: file.name
        });
        formData.append('status', 'completed');

        // Approximate duration or leave backend to calculate from metadata
        formData.append('duration', '0');

        try {
            console.log('Uploading...', `${SERVER_URL}/api/calls/${this.currentCallId}/complete`);
            const response = await axios.post(`${SERVER_URL}/api/calls/${this.currentCallId}/complete`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('Recording Uploaded Successfully!', response.data);
            Alert.alert('Success', 'Call recording uploaded to CRM.');
            this.currentCallId = null; // Clear state

        } catch (error) {
            console.error('Upload failed', error.response ? error.response.data : error.message);
            Alert.alert('Upload Failed', 'Could not upload recording to server.');
        }
    }
}

export const deviceBridge = new DeviceBridge();
