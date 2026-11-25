import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Logo } from '../components/art';
import { MenuBackground } from '../components/backgrounds';
import { BackButton, Btn, Field, Message, Txt } from '../components/ui';
import * as session from '../session';
import { colors, radius, space } from '../theme';

const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;

export default function AuthScreen({ onAuthenticated, onEducator }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  // Resposta demorando: provavelmente o servidor (plano grátis) está acordando.
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [busy]);

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
            <Logo size={84} style={styles.logo} />
            <Txt weight="semibold" style={styles.subtitle}>
              {isRegister ? 'Crie sua conta para começar' : 'Aprenda francês brincando!'}
            </Txt>

            <Field
              label="Usuário"
              placeholder="Seu nome de usuário"
              value={username}
              onChangeText={setUsername}
              textContentType="username"
              returnKeyType="next"
            />
            <Field
              label="Senha"
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isRegister ? 'newPassword' : 'password'}
              onSubmitEditing={isRegister ? undefined : submit}
            />
            {isRegister ? (
              <Field
                label="Confirmar senha"
                placeholder="Digite a senha de novo"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                onSubmitEditing={submit}
              />
            ) : null}

            <Message text={error} />
            <Message
              kind="info"
              text={slow ? 'Acordando o servidor… pode levar até 1 minuto. Não feche o app.' : ''}
            />

            <Btn
              title={isRegister ? 'Cadastrar' : 'Entrar'}
              onPress={submit}
              loading={busy}
              style={styles.mainButton}
            />
            {!isRegister ? (
              <View style={styles.switchRow}>
                <View style={styles.divider} />
                <Txt style={styles.switchText}>Ainda não tem conta?</Txt>
                <View style={styles.divider} />
              </View>
            ) : null}
            {!isRegister ? (
              <Btn title="Cadastrar-se" variant="secondary" small onPress={() => switchMode('register')} style={styles.secondButton} />
            ) : null}
            {onEducator ? (
              <Pressable
                onPress={onEducator}
                accessibilityRole="link"
                hitSlop={8}
                style={({ pressed, focused }) => [styles.educatorLink, pressed && { opacity: 0.6 }, focused && styles.educatorFocus]}
              >
                <Txt weight="semibold" style={styles.educatorText}>Sou educador · Ver progresso dos alunos</Txt>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MenuBackground>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardGlass,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    borderBottomColor: colors.cardShadow,
    paddingHorizontal: space.xl + 4,
    paddingTop: space.xl,
    paddingBottom: space.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  logo: { marginBottom: space.xs },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: space.lg, textAlign: 'center' },
  mainButton: { alignSelf: 'stretch', marginTop: space.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: space.lg },
  divider: { flex: 1, height: 1, backgroundColor: colors.line },
  switchText: { fontSize: 13, color: colors.muted, marginHorizontal: space.sm },
  secondButton: { alignSelf: 'stretch', marginTop: space.sm },
  educatorLink: { marginTop: space.lg, paddingVertical: space.xs, paddingHorizontal: space.sm, borderRadius: radius.sm },
  educatorFocus: { outlineWidth: 2, outlineColor: colors.focus, outlineStyle: 'solid' },
  educatorText: { fontSize: 13, color: colors.orangeDark, textDecorationLine: 'underline', textAlign: 'center' },
});
