import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  ToastAndroid,
  Linking,
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import RNFS from 'react-native-fs';
import { DialerScreen } from './src/screens/DialerScreen';
// import { SERVER_URL } from './src/config'; // Config might not exist

const SERVER_URL_CONST = 'https://mern-crm-server-fo68.onrender.com';

function App(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [callState, setCallState] = useState<string>('Idle');
  const [recordingPath, setRecordingPath] = useState<string>('/storage/emulated/0/Recordings/Call');
  const socketRef = useRef<any>(null);

  // Use Refs for values accessed inside the closure of CallDetector
  const recordingPathRef = useRef(recordingPath);
  const lastCallStartRef = useRef<number | null>(null);

  useEffect(() => {
    recordingPathRef.current = recordingPath;
  }, [recordingPath]);

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  // Socket Connection Effect
  useEffect(() => {
    if (token && userId) {
      console.log('Initializing Socket for', userId);
      socketRef.current = io(SERVER_URL_CONST);

      socketRef.current.on('connect', () => {
        console.log('Socket Connected:', socketRef.current.id);
        socketRef.current.emit('join_room', userId);
        ToastAndroid.show('Connected to CRM', ToastAndroid.SHORT);
      });

      socketRef.current.on('dial_request', (data: any) => {
        console.log('Received Dial Request:', data);
        const { phoneNumber } = data;
        if (phoneNumber) {
          ToastAndroid.show(`Dialing ${phoneNumber}...`, ToastAndroid.LONG);
          Linking.openURL(`tel:${phoneNumber}`);
        }
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [token, userId]);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedToken) setToken(storedToken);
      if (storedUserId) setUserId(storedUserId);
    } catch (e) { console.warn('Auth check failed', e); }
  };

  // ... loadSettings ...

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL_CONST}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        if (data.id) {
          await AsyncStorage.setItem('userId', data.id);
          setUserId(data.id);
        }
        setToken(data.token);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      // Demo mode fallback
      if (email === 'demo' && password === 'demo') {
        setToken('demo-token');
        setUserId('demo-user');
      } else {
        Alert.alert('Login Error', 'Failed to login. using offline mode for demo.');
        setToken('demo-token');
        setUserId('demo-user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const uploadRecording = async (file: any) => {
    if (!token) {
      Alert.alert('Upload Failed', 'Not logged in');
      return;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: `file://${file.path}`,
      type: 'audio/mp4',
      name: file.name,
    });

    try {
      ToastAndroid.show('Uploading to CRM...', ToastAndroid.SHORT);
      const response = await fetch(`${SERVER_URL_CONST}/api/upload/recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        ToastAndroid.show('Upload Successful!', ToastAndroid.LONG);
      } else {
        console.warn('Upload Failed:', response.status);
        ToastAndroid.show('Upload Failed', ToastAndroid.LONG);
      }
    } catch (e: any) {
      console.error('Upload Network Error', e);
      ToastAndroid.show(`Upload Network Error: ${e?.message}`, ToastAndroid.LONG);
    }
  };

  const scanAndUploadLatestRecording = async () => {
    const currentPath = recordingPathRef.current;
    if (!currentPath) {
      ToastAndroid.show('No recording path set!', ToastAndroid.LONG);
      return;
    }

    console.log(`Scanning directory: ${currentPath}`);
    try {
      const result = await RNFS.readDir(currentPath);
      console.log(`Found ${result.length} files.`);

      const callStart = lastCallStartRef.current;

      const recentFiles = result.filter(file => {
        if (!file.isFile()) return false;
        // Handle mtime safely
        const mtime = file.mtime ? new Date(file.mtime).getTime() : 0;
        // Check if file is newer than call start time (minus buffer)
        return callStart && mtime > (callStart - 10000);
      });

      recentFiles.sort((a, b) => {
        const timeA = a.mtime ? new Date(a.mtime).getTime() : 0;
        const timeB = b.mtime ? new Date(b.mtime).getTime() : 0;
        return timeB - timeA;
      });

      if (recentFiles.length > 0) {
        const targetFile = recentFiles[0];
        console.log(`New Recording Found: ${targetFile.path}`);
        ToastAndroid.show(`Found: ${targetFile.name}`, ToastAndroid.LONG);
        uploadRecording(targetFile);
      } else {
        console.log('No new recording found in target folder.');
        ToastAndroid.show('No new recording found. Check Path settings.', ToastAndroid.SHORT);
      }
    } catch (err: any) {
      console.error('Scan Error:', err);
      ToastAndroid.show(`Scan Error: Verify Path permission`, ToastAndroid.LONG);
    }
  };

  useEffect(() => {
    let callListener: any;

    const requestPermissions = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ]);
        }
        startCallListener();
      } catch (err) {
        console.warn(err);
      }
    };

    const startCallListener = () => {
      // Start the native listener
      try {
        NativeModules.CallDetection.startListener();
      } catch (e) {
        console.warn('Native CallDetection init failed', e);
      }

      callListener = DeviceEventEmitter.addListener('PhoneStateChanged', (event: string) => {
        console.log('Call Event:', event);
        setCallState(event);

        if (event === 'Incoming' || event === 'Offhook') {
          lastCallStartRef.current = Date.now();
        } else if (event === 'Disconnected') {
          console.log('Call Ended. Scanning for recordings...');
          // Wait 3 seconds for the system recorder to finish
          setTimeout(() => scanAndUploadLatestRecording(), 3000);
        }
      });
    };

    requestPermissions();

    return () => {
      if (callListener) callListener.remove();
      try {
        NativeModules.CallDetection.stopListener();
      } catch (e) { }
    };
  }, []);

  return (
    <SafeAreaView style={styles.background}>
      {!token ? (
        <View style={styles.container}>
          <Text style={styles.title}>MERN CRM Login</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <Button title="Login" onPress={handleLogin} />
            )}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>📂 Auto-Fetch Mode</Text>
              <Text style={styles.subText}>
                App will scan folder after call ends.
              </Text>
              <Text style={styles.statusText}>Call State: {callState}</Text>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.label}>Recordings Folder Path:</Text>
              <TextInput
                style={styles.pathInput}
                value={recordingPath}
                onChangeText={setRecordingPath}
                placeholder="/storage/emulated/0/..."
              />
              <Button
                title="Save Path"
                onPress={() => saveSettings(recordingPath)}
              />
              <Text style={styles.hint}>
                Common: /storage/emulated/0/Recordings/Call{'\n'}
                Xiaomi: /storage/emulated/0/MIUI/sound_recorder/call_rec
              </Text>
            </View>

            <DialerScreen />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  settingsCard: {
    backgroundColor: 'white',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    elevation: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  pathInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
    marginBottom: 10,
    borderRadius: 5,
    fontSize: 12,
  },
  infoBanner: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#90caf9',
  },
  infoText: { fontWeight: 'bold', color: '#1565c0' },
  subText: { fontSize: 12, color: '#0d47a1', textAlign: 'center' },
  statusText: { fontSize: 10, color: '#666', marginTop: 5 },
  label: { fontWeight: 'bold', marginBottom: 5 },
  hint: { fontSize: 10, color: '#888', marginTop: 10, fontStyle: 'italic' },
});

export default App;
