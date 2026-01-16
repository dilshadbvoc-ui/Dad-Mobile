import CallDetectorManager from 'react-native-call-detection';
import RNFS from 'react-native-fs';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import axios from 'axios';

// Configuration
const WATCH_DIRECTORIES = [
    `${RNFS.ExternalStorageDirectoryPath}/CallRecordings`,
    `${RNFS.ExternalStorageDirectoryPath}/Recordings/Call`,
    `${RNFS.ExternalStorageDirectoryPath}/MIUI/sound_recorder`, // Xiaomi
    `${RNFS.ExternalStorageDirectoryPath}/VoiceRecorder`, // Samsung often here
    `${RNFS.ExternalStorageDirectoryPath}/Music`, // Fallback
    `${RNFS.ExternalStorageDirectoryPath}/Download`, // Some odd devices
];
const SERVER_URL = 'https://dad-backend.onrender.com'; // Hardcoded for now, ideal to pass in

export class CallRecordingService {
    private callDetector: any;
    private userId: string | null = null;
    private token: string | null = null;
    private logCallback: (msg: string) => void = () => { };

    constructor() { }

    init(userId: string, token: string, logCallback: (msg: string) => void) {
        this.userId = userId;
        this.token = token;
        this.logCallback = logCallback;

        this.requestPermissions();
        this.startListener();
        this.logCallback('Service Initialized');
    }

    async requestPermissions() {
        if (Platform.OS === 'android') {
            try {
                const grants = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, // Sometimes needed to read
                ]);

                if (
                    grants['android.permission.READ_PHONE_STATE'] ===
                    PermissionsAndroid.RESULTS.GRANTED &&
                    grants['android.permission.READ_EXTERNAL_STORAGE'] ===
                    PermissionsAndroid.RESULTS.GRANTED
                ) {
                    this.logCallback('Permissions Granted');
                } else {
                    this.logCallback('Permissions Denied');
                    Alert.alert(
                        'Permissions Required',
                        'App needs Phone and Storage access to function.',
                    );
                }
            } catch (err) {
                console.warn(err);
            }
        }
    }

    startListener() {
        this.callDetector = new CallDetectorManager(
            (event: string, phoneNumber: string) => {
                this.logCallback(`Call Event: ${event} (${phoneNumber})`);

                if (event === 'Disconnected') {
                    // Call Ended. Wait a moment for file to be saved, then scan.
                    this.logCallback('Call Ended. Waiting for file save...');
                    setTimeout(() => {
                        this.scanAndUpload(phoneNumber);
                    }, 3000); // 3 seconds delay
                }
            },
            true, // readPhoneNumberAndroid
            () => { }, // permissionDenied callback
            {
                title: 'Phone State Permission',
                message:
                    'This app needs access to your phone state to detect when a call ends.',
            },
        );
    }

    async scanAndUpload(phoneNumber: string) {
        this.logCallback('Scanning for new recording...');

        let newestFile: any = null;
        let newestTime = 0;

        // Check all potential directories
        for (const dir of WATCH_DIRECTORIES) {
            try {
                if (await RNFS.exists(dir)) {
                    const files = await RNFS.readDir(dir);

                    for (const file of files) {
                        if (file.isFile()) {
                            const stat = await RNFS.stat(file.path);
                            // Check modification time (mtime) - if created in last 2 minutes
                            // Handle mtime being date or number (e.g. Unix timestamp)
                            // Handle mtime being date or number (e.g. Unix timestamp)
                            const fileTime = new Date(stat.mtime).getTime();
                            const now = Date.now();

                            // 2 minute window (120000 ms)
                            if (now - fileTime < 120000) {
                                if (fileTime > newestTime) {
                                    newestTime = fileTime;
                                    newestFile = file;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                // Ignore read errors for inaccessible folders
            }
        }

        if (newestFile) {
            this.logCallback(`Found File: ${newestFile.name}`);
            await this.uploadFile(newestFile, phoneNumber, newestTime);
        } else {
            this.logCallback('No recent recording found.');
        }
    }

    async uploadFile(file: any, phoneNumber: string, timestamp: number) {
        if (!this.token) {
            return;
        }

        const formData = new FormData();
        formData.append('file', {
            uri: `file://${file.path}`,
            type: 'audio/mp4', // Common fallback, multer detects actual
            name: file.name,
        });
        formData.append('phoneNumber', phoneNumber || 'Unknown');
        formData.append('timestamp', timestamp.toString());
        formData.append('duration', '0'); // Unknown duration without parsing

        try {
            this.logCallback('Uploading...');
            const response = await axios.post(
                `${SERVER_URL}/api/upload/call-recording`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${this.token}`,
                    },
                },
            );
            this.logCallback(`Success: ${response.data.message}`);
            Alert.alert('Upload Success', `Recording uploaded for ${phoneNumber}`);
        } catch (error: any) {
            this.logCallback(`Upload Failed: ${error.message}`);
            console.error(error);
        }
    }

    stop() {
        if (this.callDetector) {
            // dispose not always available on wrapper, but good practice if exists
            // this.callDetector && this.callDetector.dispose();
        }
    }
}

export const callRecordingService = new CallRecordingService();
