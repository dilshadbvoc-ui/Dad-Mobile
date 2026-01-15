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
  Alert
} from 'react-native';

import { deviceBridge } from './DeviceBridge';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  // Hardcoded for demo - ideally this comes from a Login Screen
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('Disconnected');

  const handleConnect = () => {
    if (!userId) {
      Alert.alert('Error', 'Please enter your User ID');
      return;
    }
    deviceBridge.init(userId);
    setStatus('Connected & Listening');
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

        <View style={styles.card}>
          <Text style={styles.label}>Connect to CRM</Text>
          <Text style={styles.status}>Status: {status}</Text>

          <Text style={styles.instruction}>
            Enter your User ID from the CRM to pair this device.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter User ID (e.g. 65a...)"
            value={userId}
            onChangeText={setUserId}
          />

          <Button
            title="Connect Bridge"
            onPress={handleConnect}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            1. Keep this app running in the background.
          </Text>
          <Text style={styles.infoText}>
            2. Initiate calls from your Web CRM.
          </Text>
          <Text style={styles.infoText}>
            3. Recordings will auto-upload when finished.
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  status: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    marginBottom: 24,
  },
  instruction: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  info: {
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  }
});

export default App;
