import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { fetchContent, fetchProfiles, login, syncAttempts } from './api';
import {
  cacheContent,
  cacheProfiles,
  getAttemptCounts,
  getContentVersion,
  getFirstActivity,
  getPendingAttempts,
  getProfiles,
  initDb,
  markAttemptsSynced,
  saveAttempt,
} from './db';

const makeAttemptId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

export default function App() {
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pin, setPin] = useState('1234');
  const [token, setToken] = useState(null);
  const [activity, setActivity] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [statusText, setStatusText] = useState('Inicializando...');
  const [counts, setCounts] = useState({ total: 0, pending: 0 });

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      await initDb();
      const localProfiles = await getProfiles();
      setProfiles(localProfiles);
      if (localProfiles.length) setSelectedProfile(localProfiles[0]);
      setActivity(await getFirstActivity());
      setStatusText(localProfiles.length ? 'Dados locais carregados.' : 'Conecte-se para baixar os perfis.');
    } finally {
      setReady(true);
    }
  }

  async function refreshCounts(profileId = selectedProfile?.id) {
    if (!profileId) return;
    setCounts(await getAttemptCounts(profileId));
  }

  async function connectAndLogin() {
    if (!selectedProfile && profiles.length === 0) {
      try {
        const remote = await fetchProfiles();
        await cacheProfiles(remote);
        setProfiles(remote);
        setSelectedProfile(remote[0]);
        setStatusText('Perfis baixados. Toque em entrar novamente.');
      } catch (e) {
        Alert.alert('Sem conexão', 'Não foi possível baixar o perfil inicial.');
      }
      return;
    }

    const profile = selectedProfile || profiles[0];
    try {
      const auth = await login(profile.id, pin);
      setToken(auth.token);
      const version = await getContentVersion();
      const content = await fetchContent(auth.token, version);
      await cacheContent(content);
      setActivity(await getFirstActivity());
      setStatusText('Login realizado e conteúdo atualizado. Agora você pode ficar offline.');
      await refreshCounts(profile.id);
    } catch (e) {
      Alert.alert('Erro no login', e.message);
    }
  }

  async function answer(option) {
    if (!selectedProfile || !activity) return;
    setSelectedAnswer(option);
    const score = option === activity.correct_answer ? 100 : 0;
    await saveAttempt({
      attemptId: makeAttemptId(),
      studentId: selectedProfile.id,
      activityId: activity.id,
      selectedAnswer: option,
      score,
      completedAt: new Date().toISOString(),
    });
    await refreshCounts();
    setStatusText('Resposta salva no SQLite local. Pode fechar e abrir o app: o dado permanece.');
  }

  async function synchronize() {
    if (!token || !selectedProfile) {
      Alert.alert('Login necessário', 'Faça login quando estiver online antes de sincronizar.');
      return;
    }
    const pending = await getPendingAttempts(selectedProfile.id);
    if (!pending.length) {
      setStatusText('Nenhum registro pendente de sincronização.');
      return;
    }
    try {
      const result = await syncAttempts(token, selectedProfile.id, pending);
      await markAttemptsSynced(pending.map(p => p.attempt_id));
      await refreshCounts();
      setStatusText(`Sincronizado: ${result.synced_records} novo(s), ${result.duplicated_records} duplicado(s).`);
    } catch (e) {
      setStatusText('Sem conexão ou backend indisponível. Os dados continuam salvos localmente.');
    }
  }

  if (!ready) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>CRABJEU</Text>
        <Text style={styles.subtitle}>Francês acessível para todos</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Perfil do aluno</Text>
          {profiles.length === 0 ? (
            <Text style={styles.muted}>Nenhum perfil em cache.</Text>
          ) : profiles.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.profile, selectedProfile?.id === p.id && styles.profileSelected]}
              onPress={() => setSelectedProfile(p)}
            >
              <Text style={styles.profileName}>🦀 {p.name}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="PIN"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={connectAndLogin}>
            <Text style={styles.primaryText}>{profiles.length ? 'Entrar / atualizar conteúdo' : 'Baixar perfis'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Atividade offline</Text>
          {activity ? (
            <>
              <Text style={styles.question}>{activity.question_text}</Text>
              {activity.options.map(option => (
                <TouchableOpacity
                  key={option}
                  onPress={() => answer(option)}
                  style={[styles.option, selectedAnswer === option && styles.optionSelected]}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <Text style={styles.muted}>Faça login online uma vez para baixar o conteúdo.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Persistência e sincronização</Text>
          <Text style={styles.metric}>Tentativas locais: {counts.total}</Text>
          <Text style={styles.metric}>Pendentes: {counts.pending}</Text>
          <TouchableOpacity style={styles.syncButton} onPress={synchronize}>
            <Text style={styles.primaryText}>Sincronizar agora</Text>
          </TouchableOpacity>
          <Text style={styles.status}>{statusText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  container: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 34, fontWeight: '900', color: '#E86F19', letterSpacing: 1 },
  subtitle: { fontSize: 16, color: '#334155', marginBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  profile: { padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 8 },
  profileSelected: { borderColor: '#E86F19', backgroundColor: '#FFF0E5' },
  profileName: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, marginVertical: 10 },
  primaryButton: { backgroundColor: '#E86F19', borderRadius: 12, padding: 14, alignItems: 'center' },
  syncButton: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  question: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  option: { padding: 14, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 8 },
  optionSelected: { borderColor: '#E86F19', backgroundColor: '#FFF0E5' },
  optionText: { fontSize: 16 },
  metric: { fontSize: 16, marginBottom: 6 },
  status: { marginTop: 12, color: '#475569', lineHeight: 20 },
  muted: { color: '#64748B' },
});
