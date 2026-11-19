import { StyleSheet } from 'react-native';
import { color } from '@/theme';
import { Text } from './Text';

/** Inline error under a control (Figma "Mensagem de erro"); announced politely on Android. */
export function FieldError({ message, testID }: { message?: string; testID?: string }) {
  if (!message) return null;
  return (
    <Text
      testID={testID}
      variant="caption"
      style={styles.error}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      {`⚠ ${message}`}
    </Text>
  );
}

const styles = StyleSheet.create({ error: { color: color.state.error } });
