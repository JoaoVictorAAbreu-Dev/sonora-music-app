import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMotion } from '@/hooks/useMotion';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { TrackRow } from '@/components/catalog/TrackRow';
import { QueueItem } from '@/components/player/QueueItem';
import { color, duration, layout, radius, spacing } from '@/theme';
import { playerStore, usePlayer } from './index';

/** T13 Fila: now playing, "A seguir" with drag-to-reorder and swipe-to-remove, empty state. */
export function QueueScreen() {
  const insets = useSafeAreaInsets();
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const status = usePlayer((s) => s.status);
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  const p = playerStore.getState();

  const current = queue[index];
  const upcoming = queue.slice(index + 1);
  const rowHeight = layout.listRowHeight;
  const target = drag
    ? Math.min(queue.length - 1, Math.max(index + 1, drag.from + Math.round(drag.dy / rowHeight)))
    : null;
  const motion = useMotion();

  return (
    <View testID="screen-queue" style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconButton icon="chevron-left" label="Voltar ao player" onPress={() => router.back()} />
          <Text variant="display" accessibilityRole="header">
            Fila
          </Text>
        </View>
        {upcoming.length > 0 ? (
          <Button
            variant="text"
            label="Limpar"
            onPress={() => p.clearUpcoming()}
            testID="queue-clear"
          />
        ) : null}
      </View>

      {!current ? (
        <EmptyState
          testID="queue-empty"
          icon="queue"
          title="Sua fila está vazia"
          description="Toque em ••• em uma música e escolha “Adicionar à fila”."
          action={{
            label: 'Explorar música',
            onPress: () => {
              router.dismissAll();
              router.navigate('/search');
            },
          }}
        />
      ) : (
        <ScrollView
          scrollEnabled={drag === null}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
        >
          <Text variant="caption" tone="secondary" style={styles.label}>
            TOCANDO AGORA
          </Text>
          <TrackRow
            track={current}
            state={status === 'playing' || status === 'buffering' ? 'playing' : 'default'}
          />

          <Text
            variant="caption"
            tone="secondary"
            style={styles.label}
            testID="queue-upcoming-label"
          >
            {`A SEGUIR · ${upcoming.length} ${upcoming.length === 1 ? 'MÚSICA' : 'MÚSICAS'}`}
          </Text>
          {upcoming.length === 0 ? (
            <Text tone="secondary" style={styles.note}>
              Nada a seguir. Quando esta música acabar, a reprodução para.
            </Text>
          ) : null}
          {upcoming.map((t, i) => {
            const at = index + 1 + i;
            return (
              <Animated.View
                key={`${t.id}-${at}`}
                layout={motion.listLayout()}
                exiting={motion.fadeOut(duration.standard)}
              >
                {target === at && drag && drag.from !== at ? (
                  <View style={styles.dropIndicator} testID="queue-drop-indicator" />
                ) : null}
                <QueueItem
                  track={t}
                  position={i + 1}
                  count={upcoming.length}
                  dragOffset={drag?.from === at ? drag.dy : null}
                  onDragStart={() => setDrag({ from: at, dy: 0 })}
                  onDragMove={(dy) => setDrag({ from: at, dy })}
                  onDragEnd={() => {
                    if (target !== null) p.moveInQueue(at, target);
                    setDrag(null);
                  }}
                  onMove={(dir) => p.moveInQueue(at, Math.max(index + 1, at + dir))}
                  onRemove={() => void p.removeFromQueue(at)}
                  onPlay={() => void p.playList(queue, at)}
                />
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenMargin,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { paddingHorizontal: layout.screenMargin, paddingVertical: spacing.sm },
  note: { paddingHorizontal: layout.screenMargin },
  dropIndicator: {
    height: layout.progressTrackHeight - 1,
    marginHorizontal: layout.screenMargin,
    borderRadius: radius.sm / 4,
    backgroundColor: color.action.primary,
  },
});
