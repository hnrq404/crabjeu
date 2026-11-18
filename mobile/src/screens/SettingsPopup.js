import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarIcon } from '../components/art';
import { LogoutIcon } from '../components/icons';
import { BackButton, Btn, Field, Message, Popup, Title, Txt } from '../components/ui';
import * as session from '../session';
import { AVATARS, colors, radius, space } from '../theme';

const TABS = [
  { key: 'avatar', label: 'Avatar' },
  { key: 'name', label: 'Nome' },
  { key: 'password', label: 'Senha' },
];

export default function SettingsPopup({ user, onClose, onUserChange, onLogout }) {
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

      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => changeTab(t.key)}
              style={({ focused }) => [styles.tab, active && styles.tabActive, focused && styles.focused]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Txt weight={active ? 'bold' : 'semibold'} style={{ color: active ? colors.white : colors.ink, fontSize: 15 }}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        {tab === 'avatar' ? (
          <View style={styles.grid}>
            {AVATARS.map(a => (
              <Pressable
                key={a.key}
                onPress={() => setAvatar(a.key)}
                accessibilityRole="radio"
                accessibilityLabel={`Avatar ${a.key}`}
                accessibilityState={{ checked: avatar === a.key }}
                style={({ pressed, focused }) => [
                  styles.avatar,
                  avatar === a.key && styles.avatarSelected,
                  pressed && { transform: [{ scale: 0.93 }] },
                  focused && styles.focused,
                ]}
              >
                <AvatarIcon avatarKey={a.key} size={26} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {tab === 'name' ? (
          <View style={styles.form}>
            <Field label="Nome de usuário" value={username} onChangeText={setUsername} onSubmitEditing={save} />
            <Txt style={styles.hint}>É o nome que você usa para entrar. Precisa de internet.</Txt>
          </View>
        ) : null}

        {tab === 'password' ? (
          <View style={styles.form}>
            <Field label="Senha atual" placeholder="Digite a senha atual" value={current} onChangeText={setCurrent} secureTextEntry />
            <Field label="Nova senha" placeholder="Pelo menos 4 caracteres" value={next} onChangeText={setNext} secureTextEntry />
            <Field label="Confirmar nova senha" placeholder="Digite a nova senha de novo" value={confirm} onChangeText={setConfirm} secureTextEntry onSubmitEditing={save} />
          </View>
        ) : null}
      </View>

      <Message text={msg.text} kind={msg.kind} />
      <View style={styles.actions}>
        <Btn title="Voltar" variant="light" onPress={onClose} style={styles.actionButton} />
        <Btn title="SALVAR" onPress={save} loading={busy} style={[styles.actionButton, { minWidth: 140 }]} />
      </View>
      {onLogout ? (
        <Pressable onPress={onLogout} accessibilityRole="button" hitSlop={8} style={styles.logout}>
          <LogoutIcon size={16} color={colors.muted} />
          <Txt weight="semibold" style={styles.logoutText}>
            Sair da conta
          </Txt>
        </Pressable>
      ) : null}
    </Popup>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 3,
    marginBottom: space.lg,
  },
  tab: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.orangeDark },
  focused: { outlineWidth: 3, outlineColor: colors.focus, outlineStyle: 'solid', outlineOffset: 2 },
  body: { alignSelf: 'stretch', alignItems: 'center', minHeight: 140, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 340 },
  avatar: {
    width: 56,
    height: 56,
    margin: 5,
    borderRadius: radius.md,
    backgroundColor: '#FFF1C9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomWidth: 4,
    borderBottomColor: '#E8D59E',
  },
  avatarSelected: { backgroundColor: colors.gold, borderColor: colors.orangeDark, borderBottomColor: colors.orangeDark },
  form: { width: '100%', maxWidth: 300 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: space.sm },
  actionButton: { marginHorizontal: space.xs, marginVertical: space.xs },
  logout: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: space.xs, paddingHorizontal: space.md },
  logoutText: { color: colors.muted, fontSize: 14, marginLeft: 6, textDecorationLine: 'underline' },
});
