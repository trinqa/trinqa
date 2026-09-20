import { useEffect, useRef, useState } from 'react';

import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';

import { welcomePalette as palette } from '@/features/onboarding/welcomePalette';
import { welcomeSlides, WELCOME_SLIDE_MS, type WelcomeSlide } from '@/features/onboarding/welcomeSlides';

/**
 * One slide's artwork. Every slide stays mounted and is cross-faded, rather than
 * swapped: remounting would restart the video each time the deck came back to it,
 * and a hard swap is the "sert geçiş" this is meant to avoid.
 */
function SlideMedia({ slide, isActive }: { slide: WelcomeSlide; isActive: boolean }) {
  if (slide.media.kind === 'image') {
    return <Image source={slide.media.source} style={styles.art} resizeMode="contain" />;
  }
  return <SlideVideo source={slide.media.source} isActive={isActive} />;
}

function SlideVideo({ source, isActive }: { source: number; isActive: boolean }) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.audioMixingMode = 'mixWithOthers';
  });

  // The clip runs exactly as long as the slide holds, so it restarts from the top
  // every time the slide is shown rather than resuming from wherever it was left.
  useEffect(() => {
    if (isActive) {
      player.currentTime = 0;
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={styles.art}
      contentFit="contain"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

function Slide({ slide, isActive }: { slide: WelcomeSlide; isActive: boolean }) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    // A short rise on the way in. Small enough to read as settling, not as a slide.
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  return (
    <Animated.View style={[styles.slide, style]} pointerEvents={isActive ? 'auto' : 'none'}>
      <SlideMedia slide={slide} isActive={isActive} />
    </Animated.View>
  );
}

function SlideText({ slide, isActive }: { slide: WelcomeSlide; isActive: boolean }) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: 460,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Animated.Text style={styles.title}>{slide.title}</Animated.Text>
      <Animated.Text style={styles.body}>{slide.body}</Animated.Text>
    </Animated.View>
  );
}

export function useWelcomeDeck() {
  const [index, setIndex] = useState(0);
  const isLast = index === welcomeSlides.length - 1;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The deck advances on its own, but stops on the last slide so the call to
  // action stays put instead of the deck looping away from it.
  useEffect(() => {
    if (isLast) return;
    timer.current = setTimeout(() => setIndex((i) => i + 1), WELCOME_SLIDE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, isLast]);

  return {
    index,
    isLast,
    slide: welcomeSlides[index],
    advance: () => setIndex((i) => Math.min(i + 1, welcomeSlides.length - 1)),
    goTo: (next: number) => setIndex(next),
  };
}

export function WelcomeDeckMedia({ index }: { index: number }) {
  return (
    <View style={styles.stage}>
      {welcomeSlides.map((slide, i) => (
        <Slide key={slide.id} slide={slide} isActive={i === index} />
      ))}
    </View>
  );
}

export function WelcomeDeckText({ index }: { index: number }) {
  return (
    <View style={styles.textStage}>
      {welcomeSlides.map((slide, i) => (
        <SlideText key={slide.id} slide={slide} isActive={i === index} />
      ))}
    </View>
  );
}

export function WelcomeDots({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (next: number) => void;
}) {
  return (
    <View style={styles.dots}>
      {welcomeSlides.map((slide, i) => (
        <Dot key={slide.id} isActive={i === index} onPress={() => onSelect(i)} />
      ))}
    </View>
  );
}

function Dot({ isActive, onPress }: { isActive: boolean; onPress: () => void }) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, progress]);

  const style = useAnimatedStyle(() => ({
    width: 6 + progress.value * 16,
    opacity: 0.32 + progress.value * 0.68,
  }));

  return (
    <View onTouchEnd={onPress} style={styles.dotHit}>
      <Animated.View style={[styles.dot, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
  },
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  textStage: {
    height: 132,
  },
  title: {
    color: palette.title,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  body: {
    color: palette.body,
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 11,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotHit: {
    paddingVertical: 14,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.title,
  },
});
