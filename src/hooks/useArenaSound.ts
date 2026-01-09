import { useCallback, useRef } from 'react';

type SoundType = 'hit' | 'deploy' | 'win' | 'lose' | 'critical' | 'tower_down';

interface SoundConfig {
  enabled: boolean;
  volume: number;
}

export function useArenaSound(config: SoundConfig = { enabled: false, volume: 0.5 }) {
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  
  // Placeholder: These paths can be updated when actual audio files are added
  const soundPaths: Record<SoundType, string> = {
    hit: '/sounds/hit.mp3',
    deploy: '/sounds/deploy.mp3',
    win: '/sounds/win.mp3',
    lose: '/sounds/lose.mp3',
    critical: '/sounds/critical.mp3',
    tower_down: '/sounds/tower_down.mp3',
  };
  
  const play = useCallback((sound: SoundType) => {
    if (!config.enabled) return;
    
    // Placeholder: When audio files exist, this will play them
    console.log(`[Arena Sound] Would play: ${sound}`);
    
    // Future implementation:
    // const audio = audioRefs.current.get(sound) || new Audio(soundPaths[sound]);
    // audio.volume = config.volume;
    // audio.currentTime = 0;
    // audio.play().catch(() => {}); // Handle autoplay restrictions
    // audioRefs.current.set(sound, audio);
  }, [config.enabled, config.volume]);
  
  const preload = useCallback(() => {
    if (!config.enabled) return;
    // Future: Preload audio files for instant playback
    console.log('[Arena Sound] Preloading sounds...');
  }, [config.enabled]);
  
  return { play, preload };
}
