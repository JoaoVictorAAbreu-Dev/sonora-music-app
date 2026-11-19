import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { color, duration, layout, spacing } from '@/theme';
import { bezier } from '@/lib/motion';
import { FieldError } from './FieldError';
import { Text } from './Text';

const travel =
  layout.switchWidth - layout.switchKnob - 2 * ((layout.switchHeight - layout.switchKnob) / 2);

/** "Interruptor" row from T03: label, state caption ("Ligado"/"Desligado"), 52×30 switch. */
export function SwitchRow({
  label,
  value,
  onValueChange,
  error,
  disabled = false,
  testID,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  error?: string;
  disabled?: boolean;
  testID?: string;
}) {
  const knob = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(value ? travel : 0, {
          duration: duration.micro,
          easing: bezier('standard'),
        }),
      },
    ],
  }));
  return (
    <View>
      <Pressable
        testID={testID}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onValueChange(!value)}
        style={styles.row}
      >
        <View style={styles.texts}>
          <Text>{label}</Text>
          <Text variant="caption" tone="tertiary">
            {value ? 'Ligado' : 'Desligado'}
          </Text>
        </View>
        <View
          style={[
            styles.track,
            value
              ? { backgroundColor: color.action.primary, borderColor: color.action.primary }
              : { borderColor: error ? color.state.error : color.border.control },
          ]}
        >
          <Animated.View style={[styles.knob, knob]} />
        </View>
      </Pressable>
      <View style={styles.error}>
        <FieldError message={error} testID={testID ? `${testID}-error` : undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.hairline,
    minHeight: layout.minTouchTarget,
  },
  texts: { flex: 1, gap: layout.iconLabelGap },
  track: {
    width: layout.switchWidth,
    height: layout.switchHeight,
    borderRadius: layout.switchHeight / 2,
    borderWidth: layout.borderControl,
    padding: (layout.switchHeight - layout.switchKnob) / 2 - layout.borderControl,
    justifyContent: 'center',
  },
  knob: {
    width: layout.switchKnob,
    height: layout.switchKnob,
    borderRadius: layout.switchKnob / 2,
    backgroundColor: color.text.primary,
  },
  error: { paddingTop: spacing.xs },
});
