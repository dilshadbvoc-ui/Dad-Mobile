import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import axios from 'axios';
import { deviceBridge } from './DeviceBridge';

// Reuse the server URL from DeviceBridge or define it centrally
const SERVER_URL = 'https://dad-backend.onrender.com';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [status, setStatus] = useState('Disconnected');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${SERVER_URL}/api/auth/login`, {
        email,
        password
      });

      const user = response.data.user || response.data; // Adjust based on actual API response structure

      if (user && (user.id || user._id)) {
        setUserInfo(user);
        setIsLoggedIn(true);
        setStatus('Login Success. Requesting Permissions...');

        const userId = user.id || user._id;

        try {
          // Artificial delay to let UI render the status
          await new Promise(r => setTimeout(r, 500));
          await deviceBridge.init(userId);
          setStatus('Connected & Listening');
        } catch (bridgeError: any) {
          setStatus('Connection Failed');
          Alert.alert('Initialization Error', bridgeError.message);
        }

      } else {
        Alert.alert('Login Failed', 'Invalid response from server');
      }

    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || error.message || 'Login failed';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
    setEmail('');
    setPassword('');
    setStatus('Disconnected');
    // deviceBridge.disconnect(); // If you implement a disconnect method
  };

  return (
    <SafeAreaView style={styles.background}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>

        <View style={styles.header}>
          <Text style={styles.title}>CRM Device Bridge</Text>
          <Text style={styles.subtitle}>Call Recording Sync</Text>
        </View>

        {!isLoggedIn ? (
          <View style={styles.card}>
            <Text style={styles.label}>Agent Login</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={styles.buttonContainer}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#0000ff" />
              ) : (
                <Button
                  title="Login to CRM"
                  onPress={handleLogin}
                />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Welcome, {userInfo?.firstName || 'User'}</Text>
            <Text style={[styles.status, { color: status.includes('Connected') ? '#10B981' : '#EF4444' }]}>
              Status: {status}
            </Text>

            <View style={styles.info}>
              <Text style={styles.infoText}>ID: {userInfo?.userId || userInfo?.id}</Text>
              <Text style={styles.infoText}>Role: {userInfo?.role}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.instruction}>
              App is active in background.
              Calls initiated from CRM will appear here.
            </Text>

            <Button
              title="Logout"
              onPress={handleLogout}
              color="#EF4444"
            />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.footerText}>
            v1.1.0 (Login Enabled)
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#374151',
    textAlign: 'center'
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center'
  },
  instruction: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB'
  },
  buttonContainer: {
    marginTop: 8
  },
  info: {
    marginBottom: 16
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16
  },
  footerText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12
  }
});

export default App;
