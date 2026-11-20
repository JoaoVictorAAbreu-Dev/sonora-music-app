import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinkRow } from '@/components/LinkRow';
import { PageHeader } from '@/components/PageHeader';
import { Text } from '@/components/Text';
import { color, layout, spacing } from '@/theme';
import ossLicenses from './oss-licenses.json';

/** Creative Commons families used by Jamendo artists; each track's exact version is in the player. */
export const CC_LICENSES = [
  { code: 'by', label: 'Creative Commons BY' },
  { code: 'by-sa', label: 'Creative Commons BY-SA' },
  { code: 'by-nd', label: 'Creative Commons BY-ND' },
  { code: 'by-nc', label: 'Creative Commons BY-NC' },
  { code: 'by-nc-sa', label: 'Creative Commons BY-NC-SA' },
  { code: 'by-nc-nd', label: 'Creative Commons BY-NC-ND' },
] as const;

const deedUrl = (code: string) => `https://creativecommons.org/licenses/${code}/4.0/deed.pt-br`;

export const appVersion = () => Constants.expoConfig?.version ?? '';

/** T19 Sobre e licenças. */
export function AboutScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID="screen-about">
      <PageHeader title="Sobre e licenças" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}>
        <Text tone="secondary" style={styles.margin} testID="about-intro">
          {`Sonora ${appVersion()} · Catálogo de músicas licenciadas em Creative Commons, fornecido pelo Jamendo.`}
        </Text>
        <View style={styles.list}>
          {CC_LICENSES.map((l) => (
            <LinkRow
              key={l.code}
              label={l.label}
              hint="Abre o resumo da licença no navegador"
              onPress={() => void Linking.openURL(deedUrl(l.code))}
              testID={`license-${l.code}`}
            />
          ))}
          <LinkRow
            label="Bibliotecas de código aberto"
            onPress={() => router.push('/about/open-source')}
            testID="about-oss"
          />
        </View>
        <Text variant="caption" tone="secondary" style={styles.note}>
          A licença de cada faixa aparece no player.
        </Text>
      </ScrollView>
    </View>
  );
}

/** "Bibliotecas de código aberto": runtime dependencies with version and license. */
export function OpenSourceScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID="screen-oss">
      <PageHeader title="Código aberto" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}>
        <Text tone="secondary" style={styles.margin}>
          O Sonora é feito com estas bibliotecas. Obrigado a quem as mantém.
        </Text>
        <View style={styles.list}>
          {ossLicenses.map((p) => (
            <View
              key={p.name}
              style={styles.oss}
              accessible
              accessibilityLabel={`${p.name}, versão ${p.version}, licença ${p.license}`}
            >
              <Text variant="bodyStrong">{p.name}</Text>
              <Text variant="caption" tone="secondary">{`${p.version} · ${p.license}`}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
  margin: { paddingHorizontal: layout.screenMargin },
  list: { paddingTop: spacing.md },
  note: { paddingHorizontal: layout.screenMargin, paddingTop: spacing.lg },
  oss: {
    paddingHorizontal: layout.screenMargin,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.hairline,
  },
});
