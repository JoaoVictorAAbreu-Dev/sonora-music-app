import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { SwitchRow } from '@/components/SwitchRow';
import { Text } from '@/components/Text';
import { showToast } from '@/features/ui/toast';
import { authStore, useAuth } from '@/lib/auth/store';
import { API_URL } from '@/lib/config';
import { color, layout, spacing } from '@/theme';
import { useSettings } from './store';

export const PRIVACY_POLICY_URL = `${API_URL}/privacy`;

/** T18 Configurações: playback, accessibility overrides, privacy and account deletion. */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const email = useAuth((s) => s.user?.email);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const deleteAccount = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await authStore.getState().deleteAccount();
      setConfirm(false);
      showToast('Sua conta foi excluída');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID="screen-settings">
      <PageHeader title="Configurações" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}>
        <Section title="Reprodução" />
        <Row>
          <SwitchRow
            testID="setting-continuous"
            label="Reprodução contínua"
            value={settings.continuousPlayback}
            onValueChange={(v) => settings.set('continuousPlayback', v)}
          />
        </Row>

        <Section title="Acessibilidade" />
        <Row>
          <SwitchRow
            testID="setting-transparency"
            label="Reduzir transparência"
            value={settings.reduceTransparency}
            onValueChange={(v) => settings.set('reduceTransparency', v)}
          />
          <SwitchRow
            testID="setting-motion"
            label="Reduzir movimento"
            value={settings.reduceMotion}
            onValueChange={(v) => settings.set('reduceMotion', v)}
          />
        </Row>
        <Text variant="caption" tone="tertiary" style={styles.note}>
          As preferências do sistema também são respeitadas.
        </Text>

        <Section title="Privacidade" />
        <LinkRow
          label="Política de privacidade"
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        />
        <LinkRow
          label="Excluir minha conta"
          onPress={() => setConfirm(true)}
          testID="setting-delete-account"
        />

        <View style={styles.account}>
          {email ? (
            <Text variant="caption" tone="tertiary" testID="signed-in-as">
              {`Conectado como ${email}`}
            </Text>
          ) : null}
          <Button
            variant="secondary"
            label="Sair da conta"
            onPress={() => void authStore.getState().signOut()}
            testID="sign-out"
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirm}
        title="Excluir conta?"
        message={
          failed
            ? 'Não foi possível excluir agora. Verifique sua conexão e tente de novo.'
            : 'Seus favoritos, playlists e histórico serão apagados. Essa ação não pode ser desfeita.'
        }
        confirmLabel="Excluir conta"
        busy={busy}
        onConfirm={() => void deleteAccount()}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text variant="bodyStrong" accessibilityRole="header" style={styles.section}>
      {title}
    </Text>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.rows}>{children}</View>;
}

function LinkRow({ label, onPress, testID }: { label: string; onPress(): void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.flex}>{label}</Text>
      <Text variant="title" tone="secondary" importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
  section: {
    paddingHorizontal: layout.screenMargin,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  rows: { paddingHorizontal: layout.screenMargin },
  note: { paddingHorizontal: layout.screenMargin, paddingTop: spacing.sm },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.fieldHeight,
    paddingHorizontal: layout.screenMargin,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.hairline,
  },
  pressed: { backgroundColor: color.bg.raised },
  flex: { flex: 1 },
  account: { gap: spacing.sm, padding: layout.screenMargin, paddingTop: spacing['2xl'] },
});
