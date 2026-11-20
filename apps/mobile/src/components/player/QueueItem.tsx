import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type { Track } from '@sonora/shared';
import { color, elevation, layout, radius, spacing } from '@/theme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { TrackRow } from '../catalog/TrackRow';

/** Width of the revealed "Remover" action (T13 "Remover (deslizar)"). */
const ACTION_WIDTH = layout.listRowHeight + spacing['2xl'];
/** Horizontal travel that starts a swipe instead of a scroll. */
const SWIPE_SLOP = spacing.sm + spacing.xs / 2;

export interface QueueItemProps {
  track: Track;
  position: number;
  count: number;
  /** Vertical offset while this item is being dragged (null when idle). */
  dragOffset: number | null;
  onDragStart(): void;
  onDragMove(dy: number): void;
  onDragEnd(): void;
  onMove(direction: -1 | 1): void;
  onRemove(): void;
  onPlay(): void;
}

/** "Item da fila": drag handle + track row; swipe left to reveal "Remover". */
export function QueueItem(props: QueueItemProps) {
  const { track, dragOffset } = props;
  const [shift, setShift] = useState(0);
  const start = useRef({ x: 0, y: 0 });
  const point = (e: GestureResponderEvent) => ({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });

  const dragging = dragOffset !== null;
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${track.title}, ${track.artist.name}, posição ${props.position} de ${props.count}`}
      accessibilityHint="Ações disponíveis: tocar, mover e remover"
      accessibilityActions={[
        { name: 'activate', label: 'Tocar' },
        { name: 'moveUp', label: 'Mover para cima' },
        { name: 'moveDown', label: 'Mover para baixo' },
        { name: 'remove', label: 'Remover da fila' },
      ]}
      onAccessibilityAction={(e) => {
        const a = e.nativeEvent.actionName;
        if (a === 'activate') props.onPlay();
        if (a === 'moveUp') props.onMove(-1);
        if (a === 'moveDown') props.onMove(1);
        if (a === 'remove') props.onRemove();
      }}
    >
      <View style={styles.action}>
        <Pressable
          testID={`queue-remove-${track.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${track.title} da fila`}
          onPress={props.onRemove}
          style={styles.actionButton}
        >
          <Icon name="close" tint="onAction" />
          <Text variant="caption" style={styles.actionLabel}>
            Remover
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.row,
          { transform: [{ translateX: shift }, { translateY: dragOffset ?? 0 }] },
          dragging && styles.lifted,
        ]}
        onMoveShouldSetResponder={(e) => {
          const p = point(e);
          return !dragging && Math.abs(p.x - start.current.x) > SWIPE_SLOP;
        }}
        onStartShouldSetResponderCapture={(e) => {
          start.current = point(e);
          return false;
        }}
        onResponderMove={(e) => {
          const dx = point(e).x - start.current.x;
          setShift(Math.max(-ACTION_WIDTH, Math.min(0, dx + (shift < 0 ? -ACTION_WIDTH : 0))));
        }}
        onResponderRelease={() => setShift((s) => (s < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0))}
        onResponderTerminate={() => setShift(0)}
      >
        <View
          testID={`queue-handle-${track.id}`}
          style={styles.handle}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            start.current = point(e);
            props.onDragStart();
          }}
          onResponderMove={(e) => props.onDragMove(point(e).y - start.current.y)}
          onResponderRelease={props.onDragEnd}
          onResponderTerminate={props.onDragEnd}
          importantForAccessibility="no-hide-descendants"
        >
          {[0, 1, 2].map((r) => (
            <View key={r} style={styles.dotRow}>
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          ))}
        </View>
        <View style={styles.flex} importantForAccessibility="no-hide-descendants">
          <TrackRow track={track} onPress={props.onPlay} testID={`queue-track-${track.id}`} />
        </View>
      </View>
    </View>
  );
}

/** Handle dot size from Figma "Alça de arrastar" (3 pt dots on a 24 pt grid). */
const DOT = layout.progressTrackHeight - 1;

const styles = StyleSheet.create({
  container: { minHeight: layout.listRowHeight },
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: color.state.error,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionButton: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionLabel: { color: color.text.onAction },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    backgroundColor: color.bg.base,
  },
  lifted: {
    backgroundColor: color.bg.overlay,
    borderRadius: radius.md,
    borderWidth: layout.borderControl,
    borderColor: color.action.primary,
    shadowColor: elevation.overlay.shadowColor,
    shadowOpacity: elevation.overlay.opacity,
    shadowRadius: elevation.overlay.blur / 2,
    shadowOffset: { width: 0, height: elevation.overlay.offsetY },
    elevation: elevation.overlay.offsetY,
    zIndex: 1,
  },
  handle: {
    width: layout.iconSize,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT + 2,
  },
  dotRow: { flexDirection: 'row', gap: DOT * 2 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: color.text.secondary },
  flex: { flex: 1 },
});
