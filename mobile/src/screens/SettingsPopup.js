import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarIcon } from '../components/art';
import { BackButton, Btn, Field, Message, Popup, Title, Txt } from '../components/ui';
import * as session from '../session';
import { AVATARS, colors } from '../theme';

const TABS = [
  { key: 'avatar', label: 'Avatar' },
  { key: 'name', label: 'Nome' },
  { key: 'password', label: 'Senha' },
];

export default function SettingsPopup({ user, onClose, onUserChange }) {
  const [tab, setTab] = useState('avatar');
  const [avatar, setAvatar] = useState(user.avatar_key || 'crab');
  const [username, setUsername] = useState(user.username);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState({ text: '', kind: 'error' });
  const [busy, setBusy] = useState(false);

  function changeTab(key) {
    setTab(key);
    setMsg({ text: '' });
  }

  async function save() {
    setMsg({ text: '' });
    setBusy(true);
    try {
      if (tab === 'avatar') {
        onUserChange(await session.changeAvatar(user.id, avatar));
        setMsg({ text: 'Avatar salvo!', kind: 'ok' });
      } else if (tab === 'name') {
        if (!/^[A-Za-z0-9_.]{3,20}$/.test(username.trim())) {
          throw new Error('Use de 3 a 20 letras, números, "_" ou ".".');
        }
        onUserChange(await session.changeUsername(user.id, username));
        setMsg({ text: 'Nome salvo!', kind: 'ok' });
      } else {
        if (next.length < 4) throw new Error('A nova senha precisa ter pelo menos 4 caracteres.');
        if (next !== confirm) throw new Error('As senhas novas não são iguais.');
        await session.changePassword(user.id, current, next);
        setCurrent('');
        setNext('');
        setConfirm('');
        setMsg({ text: 'Senha alterada!', kind: 'ok' });
      }
    } catch (e) {
      setMsg({ text: e.message, kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popup style={{ alignItems: 'center', maxWidth: 480 }}>
      <BackButton onPress={onClose} />
      <Title style={{ marginBottom: 12 }}>CONFIGURAÇÕES</Title>

      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <Pressable
            key={t.key}
            onPress={() => changeTab(t.key)}
            style={[styles.tab, i > 0 && styles.tabDivider]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Txt weight={tab === t.key ? 'bold' : 'regular'} style={{ color: tab === t.key ? colors.orange : colors.ink }}>
              {t.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      <View style={styles.body}>
        {tab === 'avatar' ? (
          <View style={styles.grid}>
            {AVATARS.map(a => (
              <Pressable
                key={a.key}
                onPress={() => setAvatar(a.key)}
                accessibilityLabel={`Avatar ${a.key}`}
                style={[styles.avatar, avatar === a.key && styles.avatarSelected]}
              >
                <AvatarIcon avatarKey={a.key} size={24} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {tab === 'name' ? (
          <View style={styles.form}>
            <Field label="Nome de usuário ✎" value={username} onChangeText={setUsername} onSubmitEditing={save} />
            <Txt style={styles.hint}>É o nome que você usa para entrar. Precisa de internet.</Txt>
          </View>
        ) : null}

        {tab === 'password' ? (
          <View style={styles.form}>
            <Field placeholder="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry />
            <Field placeholder="Nova senha" value={next} onChangeText={setNext} secureTextEntry />
            <Field placeholder="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry onSubmitEditing={save} />
          </View>
        ) : null}
      </View>

      <Message text={msg.text} kind={msg.kind} />
      <Btn title="SALVAR" onPress={save} loading={busy} style={{ minWidth: 140 }} />
      <Btn title="Voltar ao jogo" variant="light" small onPress={onClose} style={{ marginTop: 8 }} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center' },
  tabDivider: { borderLeftWidth: 1, borderLeftColor: colors.line },
  body: { alignSelf: 'stretch', alignItems: 'center', minHeight: 120, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 330 },
  avatar: {
    width: 54,
    height: 42,
    margin: 5,
    borderRadius: 12,
    backgroundColor: '#FFF1C9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: { backgroundColor: colors.gold, borderColor: colors.orangeDark },
  form: { width: '100%', maxWidth: 280 },
  hint: { fontSize: 11, color: colors.muted, textAlign: 'center' },
});
