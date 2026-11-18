import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radius, space } from '../theme';
import { AlertIcon, BackIcon, CheckIcon, CoinIcon } from './icons';

const NATIVE_DRIVER = Platform.OS !== 'web';

export function Txt({ style, weight = 'regular', ...props }) {
  return <Text {...props} style={[styles.text, { fontFamily: fonts[weight] }, style]} />;
}

export function Title({ children, style }) {
  return (
    <Txt weight="bold" accessibilityRole="header" style={[styles.title, style]}>
      {children}
    </Txt>
  );
}

/** Valor em moedas com o ícone da moeda ao lado. */
export function Coins({ value, size = 16, style, textStyle, weight = 'bold', prefix = '' }) {
  return (
    <View style={[styles.coins, style]}>
      <Txt weight={weight} style={[{ fontSize: size }, textStyle]}>
        {prefix}
        {value}
      </Txt>
      <CoinIcon size={size + 2} style={{ marginLeft: 4 }} />
    </View>
  );
}

/** true quando o aparelho pede menos animação (acessibilidade). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(v => alive && setReduced(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', v => setReduced(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

// Botões "3D": a borda inferior em tom mais escuro funciona como sombra sólida
// e "afunda" ao pressionar, como um botão de verdade.
const BUTTON_VARIANTS = {
  primary: { bg: colors.orangeDark, edge: colors.orangeShadow, text: colors.white },
  menu: { bg: colors.white, edge: colors.whiteShadow, text: colors.ink, minWidth: 240, fontSize: 18 },
  light: { bg: colors.white, edge: colors.whiteShadow, text: colors.ink, border: colors.line },
  secondary: { bg: colors.white, edge: colors.whiteShadow, text: colors.orangeDark, border: colors.orangeDark },
  success: { bg: colors.correctDark, edge: '#145F29', text: colors.white },
  danger: { bg: colors.wrongDark, edge: '#7F1010', text: colors.white },
};

const EDGE = 4;

export function Btn({ title, onPress, variant = 'primary', disabled, loading, style, textStyle, small, icon, accessibilityLabel }) {
  const v = BUTTON_VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ focused }) => [styles.buttonOuter, { minWidth: v.minWidth }, focused && styles.focused, inactive && styles.disabled, style]}
    >
      {({ pressed, hovered }) => {
        const down = pressed && !inactive;
        return (
          <>
            <View style={[styles.buttonEdge, { backgroundColor: v.edge }]} />
            <View
              style={[
                styles.button,
                small && styles.buttonSmall,
                { backgroundColor: v.bg, borderColor: v.border ?? v.bg, borderWidth: v.border ? 1.5 : 0 },
                hovered && !inactive && !down && styles.hovered,
                down && styles.pressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={v.text} />
              ) : (
                <View style={styles.buttonRow}>
                  {icon ? <View style={styles.buttonIcon}>{icon(v.text)}</View> : null}
                  <Txt weight="bold" style={[styles.buttonText, { color: v.text, fontSize: small ? 14 : v.fontSize ?? 16 }, textStyle]}>
                    {title}
                  </Txt>
                </View>
              )}
            </View>
          </>
        );
      }}
    </Pressable>
  );
}

export function Field({ label, error, style, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Txt weight="semibold" style={styles.label}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholder="Toque para digitar"
        placeholderTextColor="#8A8A8A"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label || inputProps.placeholder}
        {...inputProps}
        onFocus={e => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          { fontFamily: fonts.regular },
          focused && styles.inputFocused,
          error && { borderColor: colors.wrong },
          Platform.OS === 'web' && { outlineStyle: 'none' },
        ]}
      />
    </View>
  );
}

export function BackButton({ onPress, color = colors.ink, style, label = 'Voltar' }) {
  const onDark = color === colors.white;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, focused }) => [
        styles.back,
        { backgroundColor: onDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.06)' },
        pressed && { transform: [{ scale: 0.92 }] },
        focused && styles.focused,
        style,
      ]}
    >
      <BackIcon size={24} color={color} strokeWidth={2.8} />
    </Pressable>
  );
}

/** Pop-up centralizado sobre a tela (funciona igual no app e na web). */
export function Popup({ visible = true, children, style }) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    anim.setValue(reduced ? 1 : 0);
    if (!reduced) {
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: NATIVE_DRIVER }).start();
    }
  }, [visible, reduced, anim]);

  if (!visible) return null;
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <Animated.View style={[styles.overlay, { opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }) }]}>
      <Animated.View accessibilityViewIsModal style={[styles.popup, { transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export function Message({ text, kind = 'error', style }) {
  if (!text) return null;
  const error = kind === 'error';
  const color = error ? colors.wrongDark : colors.correctDark;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.message, { backgroundColor: error ? '#FDECEC' : '#E7F6EC', borderColor: error ? '#F5B5B5' : '#A8DDB8' }, style]}
    >
      {error ? <AlertIcon size={16} color={color} /> : <CheckIcon size={16} color={color} strokeWidth={3} />}
      <Txt weight="semibold" style={[styles.messageText, { color }]}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.ink, fontSize: 15 },
  title: { fontSize: 22, textAlign: 'center', letterSpacing: 0.5 },
  coins: { flexDirection: 'row', alignItems: 'center' },
  buttonOuter: { borderRadius: radius.pill, paddingBottom: EDGE },
  buttonEdge: { position: 'absolute', left: 0, right: 0, top: EDGE, bottom: 0, borderRadius: radius.pill },
  button: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 40, paddingVertical: 7, paddingHorizontal: 18 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonIcon: { marginRight: space.sm },
  buttonText: { letterSpacing: 0.5, textAlign: 'center' },
  hovered: { transform: [{ translateY: -1 }] },
  pressed: { transform: [{ translateY: EDGE - 1 }] },
  focused: { outlineWidth: 3, outlineColor: colors.focus, outlineStyle: 'solid', outlineOffset: 2 },
  disabled: { opacity: 0.5 },
  field: { width: '100%', marginBottom: space.md },
  label: { color: colors.label, fontSize: 14, marginBottom: space.xs, marginLeft: 2 },
  input: {
    minHeight: 46,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.sm + 2,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
  },
  inputFocused: { borderColor: colors.orange, backgroundColor: colors.cream },
  back: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    zIndex: 50,
  },
  popup: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    borderBottomColor: colors.cardShadow,
    paddingTop: space.xl,
    paddingBottom: space.xl - 2,
    paddingHorizontal: space.xl,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginVertical: space.sm,
  },
  messageText: { fontSize: 14, marginLeft: space.sm, flexShrink: 1 },
});
