import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { GlassSurface } from '@/components/GlassSurface';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { Artwork } from '@/components/catalog/Artwork';
import { SkeletonBlock, SkeletonPulse } from '@/components/catalog/Skeleton';
import { PlayPauseButton } from '@/components/player/PlayPauseButton';
import { SeekBar } from '@/components/player/SeekBar';
import { color, duration, layout, radius, spacing } from '@/theme';
import { bezier } from '@/lib/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FavoriteButton } from '@/features/library/FavoriteButton';
import { openTrackOptions } from '@/features/library/track-actions';
import { formatTime, spokenTime } from './format';
import { playerStore, usePlayer } from './index';
import { JUMP_SECONDS, usePlaybackProgress } from './rntp-engine';
import type { RepeatMode } from './store';

const VOLUME_STEP = 0.1;

const repeatLabel: Record<RepeatMode, string> = {
  off: 'Repetir: desligado',
  all: 'Repetir: toda a fila',
  one: 'Repetir: uma faixa',
};

/** T12 Player expandido: default, Carregando, Buffering and Erro de reprodução. */
export function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const track = usePlayer((s) => s.queue[s.index] ?? null);
  const status = usePlayer((s) => s.status);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const volume = usePlayer((s) => s.volume);
  const { position, duration: engineDuration } = usePlaybackProgress();
  const p = playerStore.getState();

  const coverSize = width - 2 * layout.screenMargin;
  const loading = status === 'loading';
  const total = engineDuration || track?.durationSeconds || 0;

  return (
    <View
      testID="screen-player"
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <View style={styles.header}>
        <IconButton icon="chevron-down" label="Minimizar player" onPress={() => router.back()} />
        <Text variant="caption" tone="secondary" accessibilityRole="header">
          Tocando agora
        </Text>
        {track ? (
          <IconButton
            icon="more"
            label="Mais opções"
            onPress={() => openTrackOptions(track)}
            testID="player-more"
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Cover cross-fades when the track changes (Reanimated skips it with Reduce Motion). */}
      <Animated.View
        key={track?.id ?? 'none'}
        entering={FadeIn.duration(duration.screen).easing(bezier('standard'))}
        exiting={FadeOut.duration(duration.micro)}
        testID="player-cover"
      >
        <Artwork
          uri={loading ? null : (track?.artworkUrl ?? null)}
          size={coverSize}
          radius={radius.xl}
        />
      </Animated.View>

      {loading || !track ? (
        <SkeletonPulse>
          <View style={styles.titleSkeleton} accessible accessibilityLabel="Carregando faixa">
            <SkeletonBlock width="55%" height={spacing.lg + spacing.xs} r={radius.sm + 2} />
            <SkeletonBlock width="33%" height={layout.skeletonTitleHeight} />
          </View>
        </SkeletonPulse>
      ) : (
        <View style={styles.titleRow}>
          <View style={styles.titles}>
            <Text variant="title" numberOfLines={2} testID="player-title">
              {track.title}
            </Text>
            <Text tone="secondary" numberOfLines={1}>
              {track.artist.name}
            </Text>
          </View>
          <FavoriteButton trackId={track.id} title={track.title} testID="player-favorite" />
        </View>
      )}

      <View style={styles.progress}>
        <SeekBar
          testID="player-seek"
          label="Posição da faixa"
          value={position}
          max={total}
          step={JUMP_SECONDS}
          valueText={`${spokenTime(position)} de ${spokenTime(total)}`}
          onSeek={(s) => void p.seek(s)}
        />
        <View style={styles.times}>
          <Text variant="caption" tone="secondary">
            {loading ? formatTime(null) : formatTime(position)}
          </Text>
          <Text variant="caption" tone="secondary">
            {loading ? formatTime(null) : formatTime(total)}
          </Text>
        </View>
        {loading ? (
          <Text variant="caption" tone="secondary" accessibilityLiveRegion="polite">
            Carregando faixa…
          </Text>
        ) : null}
        {status === 'buffering' ? (
          <Text variant="caption" tone="secondary" accessibilityLiveRegion="polite">
            Armazenando em buffer…
          </Text>
        ) : null}
      </View>

      {status === 'error' ? (
        <View style={styles.alert} testID="player-error" accessibilityLiveRegion="assertive">
          <View style={styles.alertTexts}>
            <Text variant="bodyStrong">Não foi possível reproduzir</Text>
            <Text variant="caption" tone="secondary">
              Verifique sua conexão.
            </Text>
          </View>
          <Button variant="text" label="Tentar de novo" onPress={() => void p.retry()} />
        </View>
      ) : null}

      <GlassSurface style={styles.controls}>
        <View style={styles.controlsRow}>
          <IconButton
            testID="player-shuffle"
            icon="shuffle"
            label={shuffle ? 'Ordem aleatória: ligada' : 'Ordem aleatória: desligada'}
            selected={shuffle}
            tint={shuffle ? 'action' : 'default'}
            size={layout.toggleIconSize}
            onPress={() => p.toggleShuffle()}
          />
          <IconButton
            testID="player-previous"
            icon="prev"
            filled
            label="Anterior"
            size={layout.transportIconSize}
            onPress={() => void p.previous()}
          />
          <PlayPauseButton
            testID="player-toggle"
            playing={status === 'playing' || status === 'buffering'}
            buffering={status === 'buffering'}
            onPress={() => void p.togglePlay()}
          />
          <IconButton
            testID="player-next"
            icon="next"
            filled
            label="Próxima"
            size={layout.transportIconSize}
            onPress={() => void p.next()}
          />
          <View>
            <IconButton
              testID="player-repeat"
              icon="repeat"
              label={repeatLabel[repeat]}
              selected={repeat !== 'off'}
              tint={repeat !== 'off' ? 'action' : 'default'}
              size={layout.toggleIconSize}
              onPress={() => p.cycleRepeat()}
            />
            {repeat === 'one' ? (
              <Text variant="label" style={styles.repeatOne} importantForAccessibility="no">
                1
              </Text>
            ) : null}
          </View>
        </View>
      </GlassSurface>

      <View style={styles.jumpRow}>
        <View style={styles.flex}>
          <Button
            variant="secondary"
            label={`Voltar ${JUMP_SECONDS} s`}
            onPress={() => void p.seekBy(-JUMP_SECONDS)}
          />
        </View>
        <View style={styles.flex}>
          <Button
            variant="secondary"
            label={`Avançar ${JUMP_SECONDS} s`}
            onPress={() => void p.seekBy(JUMP_SECONDS)}
          />
        </View>
        <IconButton
          testID="player-queue"
          icon="queue"
          label="Abrir fila"
          size={layout.toggleIconSize}
          onPress={() => router.push('/queue')}
        />
      </View>

      <View style={styles.volume}>
        <Text variant="caption" tone="secondary">
          Volume
        </Text>
        <View style={styles.flex}>
          <SeekBar
            testID="player-volume"
            label="Volume"
            value={volume}
            max={1}
            step={VOLUME_STEP}
            valueText={`${Math.round(volume * 100)}%`}
            onSeek={(v) => void p.setVolume(v)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
    paddingHorizontal: layout.screenMargin,
    gap: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: layout.iconSize },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titles: { flex: 1, gap: layout.iconLabelGap },
  titleSkeleton: { gap: spacing.sm },
  progress: { gap: spacing.xs + layout.iconLabelGap },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: color.bg.raised,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.state.error,
  },
  alertTexts: { flex: 1, gap: layout.iconLabelGap },
  controls: { borderRadius: radius.xl },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl - spacing.xs,
  },
  repeatOne: {
    position: 'absolute',
    right: -spacing.xs,
    top: -spacing.xs,
    color: color.action.primary,
  },
  jumpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  volume: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
