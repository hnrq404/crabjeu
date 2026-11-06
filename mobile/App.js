import { Fredoka_400Regular, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';

import { initDb } from './src/db';
import AuthScreen from './src/screens/AuthScreen';
import GameScreen from './src/screens/GameScreen';
import HomeScreen from './src/screens/HomeScreen';
import * as session from './src/session';
import { colors } from './src/theme';

const SYNC_INTERVAL_MS = 60 * 1000;
const EMPTY_STATS = { coins: 0, level: 0, into: 0, needed: 20, remaining: 20, pending: 0, hasContent: false };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Fredoka_400Regular, Fredoka_600SemiBold, Fredoka_700Bold });
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home'); // 'home' | 'game'
  const [difficulty, setDifficulty] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [sync, setSync] = useState(null);
  const userRef = useRef(null);
  userRef.current = user;

  const refresh = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    setStats(await session.loadStats(u.id));
  }, []);

  const runSync = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    setSync({ state: 'syncing' });
    const result = await session.syncNow(u.id);
    if (userRef.current?.id !== u.id) return; // usuário saiu durante a sincronização
    setSync(result);
    const fresh = await session.currentUser();
    if (fresh) setUser(fresh);
    await refresh();
  }, [refresh]);

  // Inicialização: banco local + sessão salva (entra direto, mesmo offline).
  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const saved = await session.currentUser();
        if (saved) {
          userRef.current = saved;
          setUser(saved);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Sincronização automática: ao entrar, periodicamente, quando a internet volta
  // e quando o app volta ao primeiro plano.
  useEffect(() => {
    if (!user?.id) return undefined;
    refresh();
    runSync();
    const timer = setInterval(runSync, SYNC_INTERVAL_MS);
    const appState = AppState.addEventListener('change', s => s === 'active' && runSync());
    const onOnline = () => runSync();
    if (Platform.OS === 'web') window.addEventListener('online', onOnline);
    return () => {
      clearInterval(timer);
      appState.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', onOnline);
    };
  }, [user?.id, refresh, runSync]);

  function handleAuthenticated(u, { offline }) {
    userRef.current = u;
    setSync(offline ? { state: 'offline' } : null);
    setScreen('home');
    setUser(u);
  }

  async function handleLogout() {
    await session.logout();
    userRef.current = null;
    setUser(null);
    setStats(EMPTY_STATS);
    setSync(null);
  }

  function handleExitGame() {
    setScreen('home');
    setDifficulty(null);
    refresh();
    runSync();
  }

  if (!ready || !(fontsLoaded || fontError)) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {!user ? (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      ) : screen === 'game' ? (
        <GameScreen user={user} difficulty={difficulty} onExit={handleExitGame} />
      ) : (
        <HomeScreen
          user={user}
          stats={stats}
          sync={sync}
          onStart={d => {
            setDifficulty(d);
            setScreen('game');
          }}
          onLogout={handleLogout}
          onUserChange={u => {
            setUser(u);
            runSync();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.jungle },
  center: { alignItems: 'center', justifyContent: 'center' },
});
