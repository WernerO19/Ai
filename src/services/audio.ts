import { DotId } from '../types/swarm';

class SwarmAudioEngine {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private soundEffectsMuted: boolean = false;
  private onSpeakingChangeCallbacks: Set<(dotId: DotId | null, isSpeaking: boolean) => void> = new Set();
  public currentSpeakingDot: DotId | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Subscribe to speaking events for avatar animations
  public subscribeSpeaking(cb: (dotId: DotId | null, isSpeaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.add(cb);
    return () => {
      this.onSpeakingChangeCallbacks.delete(cb);
    };
  }

  private notifySpeaking(dotId: DotId | null, isSpeaking: boolean) {
    this.currentSpeakingDot = isSpeaking ? dotId : null;
    this.onSpeakingChangeCallbacks.forEach(cb => cb(dotId, isSpeaking));
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.stop();
    }
  }

  public setSfxMute(muted: boolean) {
    this.soundEffectsMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.notifySpeaking(null, false);
  }

  // Clean text so TTS doesn't read markdown ticks or code blocks verbatim
  private sanitizeForTTS(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, ' [Code module executed] ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#*_~>]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .slice(0, 280); // Keep voice snippets punchy and conversational
  }

  public speak(text: string, dotId: DotId, pitch = 1.0, rate = 1.0) {
    if (this.isMuted || !this.synth) return;

    this.stop();

    const clean = this.sanitizeForTTS(text);
    if (!clean.trim()) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    this.currentUtterance = utterance;

    // Dot-specific personality acoustics
    switch (dotId) {
      case 'spark':
        utterance.pitch = pitch || 1.35;
        utterance.rate = rate || 1.15;
        break;
      case 'nova':
        utterance.pitch = pitch || 0.82;
        utterance.rate = rate || 1.0;
        break;
      case 'aura':
        utterance.pitch = pitch || 1.25;
        utterance.rate = rate || 1.05;
        break;
      case 'echo':
        utterance.pitch = pitch || 0.95;
        utterance.rate = rate || 0.95;
        break;
    }

    // Try finding an English voice
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      if (enVoices.length > 0) {
        if (dotId === 'spark') utterance.voice = enVoices[0];
        else if (dotId === 'nova') utterance.voice = enVoices[Math.min(1, enVoices.length - 1)];
        else if (dotId === 'aura') utterance.voice = enVoices[Math.min(2, enVoices.length - 1)];
        else utterance.voice = enVoices[Math.min(3, enVoices.length - 1)];
      }
    }

    utterance.onstart = () => {
      this.notifySpeaking(dotId, true);
      this.playChirp('chirp');
    };

    utterance.onend = () => {
      this.notifySpeaking(null, false);
    };

    utterance.onerror = () => {
      this.notifySpeaking(null, false);
    };

    this.synth.speak(utterance);
  }

  // Futuristic synth sound effects via Web Audio API
  public playChirp(type: 'chirp' | 'success' | 'alert' | 'consensus' | 'terminal') {
    if (this.soundEffectsMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'chirp') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'consensus') {
        // Holographic chord chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.42);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(250, now + 0.1);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'terminal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.035);
      }
    } catch {
      // AudioContext could be blocked by autoplay policies
    }
  }
}

export const audioService = new SwarmAudioEngine();
