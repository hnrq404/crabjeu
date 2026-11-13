import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Crab } from '../components/art';
import { MenuBackground } from '../components/backgrounds';
import { BackButton, Btn, Field, Message, Txt } from '../components/ui';
import * as session from '../session';
import { colors } from '../theme';

const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;

function Logo() {
  return (
    <View style={styles.logo}>
      <Crab size={84} color="#E0431B" />
      <Txt weight="bold" style={styles.logoText}>
        CRABJEU
      </Txt>
    </View>
  );
}

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  function switchMode(next) {
    setMode(next);
    setError('');
    setPassword('');
    setConfirm('');
  }

  async function submit() {
    setError('');
    if (!username.trim() || !password) {
      setError('Preencha usuário e senha.');
      return;
    }
    if (isRegister) {
      if (!USERNAME_RE.test(username.trim())) {
        setError('O usuário deve ter de 3 a 20 letras, números, "_" ou ".".');
        return;
      }
      if (password.length < 4) {
        setError('A senha precisa ter pelo menos 4 caracteres.');
        return;
      }
      if (password !== confirm) {
        setError('As senhas não são iguais.');
        return;
      }
    }

    setBusy(true);
    try {
      if (isRegister) {
        onAuthenticated(await session.register(username, password, 'crab'), { offline: false });
      } else {
        const { user, offline } = await session.login(username, password);
        onAuthenticated(user, { offline });
      }
    } catch (e) {
      setError(e.status === 401 ? 'Usuário ou senha inválidos.' : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MenuBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {isRegister ? <BackButton onPress={() => switchMode('login')} color={colors.orange} /> : null}
            <Logo />

            <Field
              label="Usuário"
              value={username}
              onChangeText={setUsername}
              textContentType="username"
              returnKeyType="next"
            />
            <Field
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isRegister ? 'newPassword' : 'password'}
              onSubmitEditing={isRegister ? undefined : submit}
            />
            {isRegister ? (
              <Field
                label="Confirmar senha"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                onSubmitEditing={submit}
              />
            ) : null}

            <Message text={error} />

            <Btn
              title={isRegister ? 'Cadastrar' : 'Entrar'}
              onPress={submit}
              loading={busy}
              style={styles.mainButton}
            />
            {!isRegister ? (
              <Btn title="Cadastrar-se" variant="muted" small onPress={() => switchMode('register')} style={styles.secondButton} />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MenuBackground>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.cardGlass,
    borderRadius: 6,
    paddingHorizontal: 28,
    paddingVertical: 20,
    alignItems: 'center',
  },
  logo: { alignItems: 'center', marginBottom: 8 },
  logoText: { color: colors.orangeDark, fontSize: 18, letterSpacing: 2, marginTop: 2 },
  mainButton: { alignSelf: 'stretch', borderRadius: 4, marginTop: 6 },
  secondButton: { marginTop: 10, borderRadius: 4 },
});
