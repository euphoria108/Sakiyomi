import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../src/presentation/components/AuthContext';
import { login } from '../../src/infrastructure/authRepository';
import { registerPushToken } from '../../src/infrastructure/notificationService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) return Alert.alert('エラー', 'メールとパスワードを入力してください');
    setLoading(true);
    try {
      const res = await login({ email, password });
      setAuth(res.token, res.user);
      await registerPushToken().catch(() => {});
      router.replace('/(tabs)/articles');
    } catch (e) {
      Alert.alert('ログイン失敗', e instanceof Error ? e.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sakiyomi</Text>
      <TextInput style={styles.input} placeholder="メールアドレス" value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="パスワード" value={password} onChangeText={setPassword}
        secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ログイン</Text>}
      </TouchableOpacity>
      <Link href="/(auth)/register" style={styles.link}>アカウントを作成</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: '#4F86C6' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: '#4F86C6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 16, color: '#4F86C6' },
});
