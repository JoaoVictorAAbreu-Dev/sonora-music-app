import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import { color, layout, opacity, radius, spacing, textStyle } from '@/theme';
import { FieldError } from './FieldError';
import { IconButton } from './IconButton';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholder' | 'editable'> {
  /** Placeholder and accessible name (Figma fields have no external label). */
  label: string;
  error?: string;
  disabled?: boolean;
  /** Renders the show/hide password toggle. */
  password?: boolean;
}

/** "Campo de texto": Padrão, Foco (ring), Erro (+ message), Desabilitado (40%). */
export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, disabled = false, password = false, testID, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? color.state.error : focused ? color.focus.ring : color.border.control;
  const borderWidth = error || focused ? layout.borderEmphasis : layout.borderControl;

  return (
    <View style={[styles.wrapper, disabled && styles.disabled]}>
      <View style={[styles.box, { borderColor, borderWidth }]}>
        <TextInput
          ref={ref}
          testID={testID}
          placeholder={label}
          placeholderTextColor={color.text.secondary}
          accessibilityLabel={label}
          accessibilityHint={error}
          accessibilityState={{ disabled }}
          editable={!disabled}
          secureTextEntry={password && hidden}
          maxFontSizeMultiplier={layout.maxFontScale}
          selectionColor={color.action.primary}
          cursorColor={color.action.primary}
          style={[textStyle('body'), styles.input]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...input}
        />
        {password ? (
          <IconButton
            testID={testID ? `${testID}-toggle` : undefined}
            icon={hidden ? 'eye' : 'eye-off'}
            label={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            onPress={() => setHidden((h) => !h)}
          />
        ) : null}
      </View>
      <FieldError message={error} testID={testID ? `${testID}-error` : undefined} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  disabled: { opacity: opacity.disabled },
  box: {
    minHeight: layout.fieldHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: color.bg.raised,
  },
  input: {
    flex: 1,
    color: color.text.primary,
    paddingVertical: spacing.md,
  },
});
