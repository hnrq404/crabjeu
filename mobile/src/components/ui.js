import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts } from '../theme';

export function Txt({ style, weight = 'regular', ...props }) {
  return <Text {...props} style={[styles.text, { fontFamily: fonts[weight] }, style]} />;
}

export function Title({ children, style }) {
  return (
    <Txt weight="bold" style={[styles.title, style]}>
      {children}
    </Txt>
  );
}

const BUTTON_VARIANTS = {
  primary: { box: { backgroundColor: colors.orangeDark }, text: { color: colors.white } },
  menu: { box: { backgroundColor: colors.white, minWidth: 220 }, text: { color: colors.ink, fontSize: 18 } },
  light: { box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, text: { color: colors.ink } },
  muted: { box: { backgroundColor: '#D9967A' }, text: { color: colors.white } },
};

export function Btn({ title, onPress, variant = 'primary', disabled, loading, style, textStyle, small }) {
  const v = BUTTON_VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        v.box,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <Txt weight="bold" style={[styles.buttonText, small && { fontSize: 13 }, v.text, textStyle]}>
          {title}
        </Txt>
      )}
    </Pressable>
  );
}

export function Field({ label, error, style, ...inputProps }) {
  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Txt weight="semibold" style={styles.label}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholder="Toque para digitar"
        placeholderTextColor="#9A9A9A"
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
        style={[styles.input, { fontFamily: fonts.regular }, error && { borderColor: colors.wrong }]}
      />
    </View>
  );
}

export function BackButton({ onPress, color = colors.ink, style }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityLabel="Voltar" style={[styles.back, style]}>
      <Txt weight="bold" style={[styles.backText, { color }]}>
        ↩
      </Txt>
    </Pressable>
  );
}

/** Pop-up centralizado sobre a tela (funciona igual no app e na web). */
export function Popup({ visible = true, children, style }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={[styles.popup, style]}>{children}</View>
    </View>
  );
}

export function Message({ text, kind = 'error' }) {
  if (!text) return null;
  return (
    <Txt weight="semibold" style={[styles.message, { color: kind === 'error' ? colors.wrong : '#1E8E3E' }]}>
      {text}
    </Txt>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.ink, fontSize: 15 },
  title: { fontSize: 22, textAlign: 'center', letterSpacing: 0.5 },
  button: {
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buttonSmall: { paddingVertical: 6, paddingHorizontal: 16 },
  buttonText: { fontSize: 15, letterSpacing: 0.4 },
  field: { width: '100%', marginBottom: 10 },
  label: { color: colors.label, fontSize: 14, marginBottom: 4 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 15,
    color: colors.ink,
  },
  back: { position: 'absolute', top: 10, left: 12, zIndex: 5 },
  backText: { fontSize: 30, lineHeight: 34 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 50,
  },
  popup: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  message: { textAlign: 'center', marginVertical: 6, fontSize: 14 },
});
