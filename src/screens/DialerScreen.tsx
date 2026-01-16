import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

const KEYPAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
];

export const DialerScreen = () => {
    const [number, setNumber] = useState('');

    const handlePress = (key: string) => {
        setNumber(prev => prev + key);
    };

    const handleCall = () => {
        if (!number) return;
        Linking.openURL(`tel:${number}`);
    };

    const handleBackspace = () => {
        setNumber(prev => prev.slice(0, -1));
    };

    return (
        <View style={styles.container}>
            <View style={styles.display}>
                <Text style={styles.number}>{number}</Text>
            </View>

            <View style={styles.keypad}>
                {KEYPAD.map((row, i) => (
                    <View key={i} style={styles.row}>
                        {row.map(key => (
                            <TouchableOpacity key={key} style={styles.key} onPress={() => handlePress(key)}>
                                <Text style={styles.keyText}>{key}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </View>

            <View style={styles.actions}>
                <View style={styles.spacer} />
                <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                    <Text style={styles.callBtnText}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backspaceBtn} onPress={handleBackspace}>
                    <Text style={styles.backspaceText}>⌫</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', paddingBottom: 40 },
    display: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    number: { fontSize: 40, color: '#1e293b', fontWeight: '500' },
    keypad: { paddingHorizontal: 40 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    key: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    keyText: { fontSize: 28, color: '#334155' },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 60, marginTop: 20 },
    callBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
    callBtnText: { fontSize: 30, color: 'white' },
    backspaceBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    backspaceText: { fontSize: 24, color: '#64748b' },
    spacer: { width: 50 }
});
