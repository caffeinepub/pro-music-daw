// DAW Core Types

export type TransportState = "stopped" | "playing" | "recording" | "paused";

export interface DAWTrack {
  id: string;
  name: string;
  color: string;
  volume: number; // 0-1
  pan: number; // -1 to 1
  muted: boolean;
  soloed: boolean;
  armed: boolean;
  order: number;
  audioBuffer?: AudioBuffer;
  audioFileName?: string;
  effectsChain: FXSlot[];
  midiNotes: MidiNote[];
}

export interface MidiNote {
  id: string;
  pitch: number; // 0-127 (MIDI note number)
  startBeat: number;
  durationBeats: number;
  velocity: number; // 0-127
}

export interface FXSlot {
  id: string;
  type: FXType;
  name: string;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export type FXCategory =
  | "dynamics"
  | "eq"
  | "reverb"
  | "delay"
  | "modulation"
  | "pitch"
  | "saturation"
  | "spatial"
  | "filter";

export type FXType =
  // Dynamics
  | "compressor"
  | "limiter"
  | "gate"
  | "deesser"
  | "transient_shaper"
  | "multiband_comp"
  | "parallel_comp"
  // EQ
  | "parametric_eq"
  | "graphic_eq"
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "notch"
  // Reverb
  | "reverb"
  | "convolution_reverb"
  | "plate_reverb"
  | "spring_reverb"
  | "room_reverb"
  // Delay
  | "delay"
  | "stereo_delay"
  | "tape_delay"
  | "modulated_delay"
  // Modulation
  | "chorus"
  | "flanger"
  | "phaser"
  | "tremolo"
  | "vibrato"
  // Pitch
  | "autotune"
  | "harmony"
  | "vocal_doubler"
  | "formant_shifter"
  | "vocoder"
  | "freq_shifter"
  | "ring_mod"
  // Saturation
  | "saturation"
  | "distortion"
  | "overdrive"
  | "bitcrusher"
  // Spatial
  | "stereo_widener"
  | "auto_pan";

export interface FXDefinition {
  type: FXType;
  name: string;
  category: FXCategory;
  defaultParams: Record<string, number | string | boolean>;
  paramDefs: FXParamDef[];
}

export interface FXParamDef {
  key: string;
  label: string;
  type: "knob" | "slider" | "select" | "toggle";
  min?: number;
  max?: number;
  default: number | string | boolean;
  unit?: string;
  options?: string[];
}

export interface DAWProject {
  id: string;
  name: string;
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
}

export interface TransportPosition {
  bars: number;
  beats: number;
  ticks: number;
}

export interface LoopRegion {
  startBeat: number;
  endBeat: number;
}

export type BottomPanelTab = "mixer" | "fx" | "pianoroll" | "analyzer";

export interface AudioEngine {
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
  masterAnalyser: AnalyserNode | null;
  trackNodes: Map<
    string,
    {
      gain: GainNode;
      panner: StereoPannerNode;
      analyser: AnalyserNode;
      source?: AudioBufferSourceNode;
    }
  >;
}

// FX Definitions catalog
export const FX_CATALOG: FXDefinition[] = [
  // Dynamics
  {
    type: "compressor",
    name: "Compressor",
    category: "dynamics",
    defaultParams: {
      threshold: -24,
      ratio: 4,
      attack: 10,
      release: 100,
      knee: 5,
      makeupGain: 0,
    },
    paramDefs: [
      {
        key: "threshold",
        label: "Threshold",
        type: "knob",
        min: -60,
        max: 0,
        default: -24,
        unit: "dB",
      },
      {
        key: "ratio",
        label: "Ratio",
        type: "knob",
        min: 1,
        max: 20,
        default: 4,
      },
      {
        key: "attack",
        label: "Attack",
        type: "knob",
        min: 0,
        max: 200,
        default: 10,
        unit: "ms",
      },
      {
        key: "release",
        label: "Release",
        type: "knob",
        min: 10,
        max: 2000,
        default: 100,
        unit: "ms",
      },
      {
        key: "knee",
        label: "Knee",
        type: "knob",
        min: 0,
        max: 40,
        default: 5,
        unit: "dB",
      },
      {
        key: "makeupGain",
        label: "Gain",
        type: "knob",
        min: -12,
        max: 24,
        default: 0,
        unit: "dB",
      },
    ],
  },
  {
    type: "limiter",
    name: "Limiter",
    category: "dynamics",
    defaultParams: { threshold: -3, release: 50 },
    paramDefs: [
      {
        key: "threshold",
        label: "Ceiling",
        type: "knob",
        min: -24,
        max: 0,
        default: -3,
        unit: "dB",
      },
      {
        key: "release",
        label: "Release",
        type: "knob",
        min: 1,
        max: 500,
        default: 50,
        unit: "ms",
      },
    ],
  },
  {
    type: "gate",
    name: "Gate/Expander",
    category: "dynamics",
    defaultParams: { threshold: -40, ratio: 10, attack: 5, release: 200 },
    paramDefs: [
      {
        key: "threshold",
        label: "Threshold",
        type: "knob",
        min: -80,
        max: 0,
        default: -40,
        unit: "dB",
      },
      {
        key: "ratio",
        label: "Ratio",
        type: "knob",
        min: 1,
        max: 20,
        default: 10,
      },
      {
        key: "attack",
        label: "Attack",
        type: "knob",
        min: 0,
        max: 200,
        default: 5,
        unit: "ms",
      },
      {
        key: "release",
        label: "Release",
        type: "knob",
        min: 10,
        max: 2000,
        default: 200,
        unit: "ms",
      },
    ],
  },
  {
    type: "deesser",
    name: "De-esser",
    category: "dynamics",
    defaultParams: { frequency: 7000, threshold: -20, range: 10 },
    paramDefs: [
      {
        key: "frequency",
        label: "Freq",
        type: "knob",
        min: 2000,
        max: 16000,
        default: 7000,
        unit: "Hz",
      },
      {
        key: "threshold",
        label: "Threshold",
        type: "knob",
        min: -60,
        max: 0,
        default: -20,
        unit: "dB",
      },
      {
        key: "range",
        label: "Range",
        type: "knob",
        min: 0,
        max: 40,
        default: 10,
        unit: "dB",
      },
    ],
  },
  {
    type: "transient_shaper",
    name: "Transient Shaper",
    category: "dynamics",
    defaultParams: { attack: 0, sustain: 0, gain: 0 },
    paramDefs: [
      {
        key: "attack",
        label: "Attack",
        type: "knob",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "sustain",
        label: "Sustain",
        type: "knob",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "gain",
        label: "Gain",
        type: "knob",
        min: -24,
        max: 24,
        default: 0,
        unit: "dB",
      },
    ],
  },
  {
    type: "multiband_comp",
    name: "Multi-band Compressor",
    category: "dynamics",
    defaultParams: {
      lowThresh: -18,
      midThresh: -18,
      highThresh: -18,
      crossover1: 200,
      crossover2: 4000,
    },
    paramDefs: [
      {
        key: "lowThresh",
        label: "Low Thresh",
        type: "knob",
        min: -60,
        max: 0,
        default: -18,
        unit: "dB",
      },
      {
        key: "midThresh",
        label: "Mid Thresh",
        type: "knob",
        min: -60,
        max: 0,
        default: -18,
        unit: "dB",
      },
      {
        key: "highThresh",
        label: "High Thresh",
        type: "knob",
        min: -60,
        max: 0,
        default: -18,
        unit: "dB",
      },
      {
        key: "crossover1",
        label: "XO1",
        type: "knob",
        min: 80,
        max: 2000,
        default: 200,
        unit: "Hz",
      },
      {
        key: "crossover2",
        label: "XO2",
        type: "knob",
        min: 1000,
        max: 16000,
        default: 4000,
        unit: "Hz",
      },
    ],
  },
  {
    type: "parallel_comp",
    name: "Parallel Compression",
    category: "dynamics",
    defaultParams: { blend: 50, threshold: -24, ratio: 8 },
    paramDefs: [
      {
        key: "blend",
        label: "Blend",
        type: "knob",
        min: 0,
        max: 100,
        default: 50,
        unit: "%",
      },
      {
        key: "threshold",
        label: "Threshold",
        type: "knob",
        min: -60,
        max: 0,
        default: -24,
        unit: "dB",
      },
      {
        key: "ratio",
        label: "Ratio",
        type: "knob",
        min: 1,
        max: 20,
        default: 8,
      },
    ],
  },
  // EQ
  {
    type: "parametric_eq",
    name: "Parametric EQ",
    category: "eq",
    defaultParams: { freq: 1000, gain: 0, q: 1, type: "peaking" },
    paramDefs: [
      {
        key: "freq",
        label: "Freq",
        type: "knob",
        min: 20,
        max: 20000,
        default: 1000,
        unit: "Hz",
      },
      {
        key: "gain",
        label: "Gain",
        type: "knob",
        min: -24,
        max: 24,
        default: 0,
        unit: "dB",
      },
      { key: "q", label: "Q", type: "knob", min: 0.1, max: 18, default: 1 },
    ],
  },
  {
    type: "graphic_eq",
    name: "Graphic EQ",
    category: "eq",
    defaultParams: {
      b31: 0,
      b63: 0,
      b125: 0,
      b250: 0,
      b500: 0,
      b1k: 0,
      b2k: 0,
      b4k: 0,
      b8k: 0,
      b16k: 0,
    },
    paramDefs: [
      {
        key: "b31",
        label: "31Hz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b63",
        label: "63Hz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b125",
        label: "125Hz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b250",
        label: "250Hz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b500",
        label: "500Hz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b1k",
        label: "1kHz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b2k",
        label: "2kHz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b4k",
        label: "4kHz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b8k",
        label: "8kHz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
      {
        key: "b16k",
        label: "16kHz",
        type: "slider",
        min: -12,
        max: 12,
        default: 0,
        unit: "dB",
      },
    ],
  },
  {
    type: "lowpass",
    name: "Low-pass Filter",
    category: "eq",
    defaultParams: { frequency: 8000, q: 0.7 },
    paramDefs: [
      {
        key: "frequency",
        label: "Cutoff",
        type: "knob",
        min: 20,
        max: 20000,
        default: 8000,
        unit: "Hz",
      },
      { key: "q", label: "Q", type: "knob", min: 0.1, max: 18, default: 0.7 },
    ],
  },
  {
    type: "highpass",
    name: "High-pass Filter",
    category: "eq",
    defaultParams: { frequency: 80, q: 0.7 },
    paramDefs: [
      {
        key: "frequency",
        label: "Cutoff",
        type: "knob",
        min: 20,
        max: 20000,
        default: 80,
        unit: "Hz",
      },
      { key: "q", label: "Q", type: "knob", min: 0.1, max: 18, default: 0.7 },
    ],
  },
  {
    type: "bandpass",
    name: "Band-pass Filter",
    category: "eq",
    defaultParams: { frequency: 1000, q: 1 },
    paramDefs: [
      {
        key: "frequency",
        label: "Center",
        type: "knob",
        min: 20,
        max: 20000,
        default: 1000,
        unit: "Hz",
      },
      { key: "q", label: "Q", type: "knob", min: 0.1, max: 18, default: 1 },
    ],
  },
  {
    type: "notch",
    name: "Notch Filter",
    category: "eq",
    defaultParams: { frequency: 1000, q: 5 },
    paramDefs: [
      {
        key: "frequency",
        label: "Freq",
        type: "knob",
        min: 20,
        max: 20000,
        default: 1000,
        unit: "Hz",
      },
      { key: "q", label: "Q", type: "knob", min: 0.1, max: 100, default: 5 },
    ],
  },
  // Reverb
  {
    type: "reverb",
    name: "Reverb",
    category: "reverb",
    defaultParams: { roomSize: 0.5, damping: 0.5, wet: 0.3, predelay: 0 },
    paramDefs: [
      {
        key: "roomSize",
        label: "Size",
        type: "knob",
        min: 0.01,
        max: 0.99,
        default: 0.5,
      },
      {
        key: "damping",
        label: "Damp",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.3 },
      {
        key: "predelay",
        label: "Pre-dly",
        type: "knob",
        min: 0,
        max: 100,
        default: 0,
        unit: "ms",
      },
    ],
  },
  {
    type: "convolution_reverb",
    name: "Convolution Reverb",
    category: "reverb",
    defaultParams: { wet: 0.3, predelay: 20, irType: "hall" },
    paramDefs: [
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.3 },
      {
        key: "predelay",
        label: "Pre-dly",
        type: "knob",
        min: 0,
        max: 200,
        default: 20,
        unit: "ms",
      },
    ],
  },
  {
    type: "plate_reverb",
    name: "Plate Reverb",
    category: "reverb",
    defaultParams: { decay: 2.5, damping: 0.5, wet: 0.3 },
    paramDefs: [
      {
        key: "decay",
        label: "Decay",
        type: "knob",
        min: 0.1,
        max: 10,
        default: 2.5,
        unit: "s",
      },
      {
        key: "damping",
        label: "Damp",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.3 },
    ],
  },
  {
    type: "spring_reverb",
    name: "Spring Reverb",
    category: "reverb",
    defaultParams: { tension: 0.5, decay: 1.5, wet: 0.3 },
    paramDefs: [
      {
        key: "tension",
        label: "Tension",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
      {
        key: "decay",
        label: "Decay",
        type: "knob",
        min: 0.1,
        max: 5,
        default: 1.5,
        unit: "s",
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.3 },
    ],
  },
  {
    type: "room_reverb",
    name: "Room Reverb",
    category: "reverb",
    defaultParams: { size: 0.3, damping: 0.7, wet: 0.2 },
    paramDefs: [
      {
        key: "size",
        label: "Size",
        type: "knob",
        min: 0.01,
        max: 0.99,
        default: 0.3,
      },
      {
        key: "damping",
        label: "Damp",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.7,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.2 },
    ],
  },
  // Delay
  {
    type: "delay",
    name: "Delay/Echo",
    category: "delay",
    defaultParams: { time: 0.25, feedback: 0.4, wet: 0.3 },
    paramDefs: [
      {
        key: "time",
        label: "Time",
        type: "knob",
        min: 0.01,
        max: 2,
        default: 0.25,
        unit: "s",
      },
      {
        key: "feedback",
        label: "Feedback",
        type: "knob",
        min: 0,
        max: 0.98,
        default: 0.4,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.3 },
    ],
  },
  {
    type: "stereo_delay",
    name: "Stereo/Ping-Pong Delay",
    category: "delay",
    defaultParams: { timeL: 0.25, timeR: 0.375, feedback: 0.35, wet: 0.3 },
    paramDefs: [
      {
        key: "timeL",
        label: "Time L",
        type: "knob",
        min: 0.01,
        max: 2,
        default: 0.25,
        unit: "s",
      },
      {
        key: "timeR",
        label: "Time R",
        type: "knob",
        min: 0.01,
        max: 2,
        default: 0.375,
        unit: "s",
      },
      {
        key: "feedback",
        label: "Feedback",
        type: "knob",
        min: 0,
        max: 0.98,
        default: 0.35,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.3 },
    ],
  },
  {
    type: "tape_delay",
    name: "Tape Delay",
    category: "delay",
    defaultParams: { time: 0.4, feedback: 0.5, saturation: 0.3, wet: 0.35 },
    paramDefs: [
      {
        key: "time",
        label: "Time",
        type: "knob",
        min: 0.01,
        max: 2,
        default: 0.4,
        unit: "s",
      },
      {
        key: "feedback",
        label: "Feedback",
        type: "knob",
        min: 0,
        max: 0.98,
        default: 0.5,
      },
      {
        key: "saturation",
        label: "Saturation",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.3,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.35 },
    ],
  },
  {
    type: "modulated_delay",
    name: "Modulated Delay",
    category: "delay",
    defaultParams: {
      time: 0.25,
      feedback: 0.4,
      modRate: 0.5,
      modDepth: 0.1,
      wet: 0.3,
    },
    paramDefs: [
      {
        key: "time",
        label: "Time",
        type: "knob",
        min: 0.01,
        max: 2,
        default: 0.25,
        unit: "s",
      },
      {
        key: "feedback",
        label: "Feedback",
        type: "knob",
        min: 0,
        max: 0.98,
        default: 0.4,
      },
      {
        key: "modRate",
        label: "Mod Rate",
        type: "knob",
        min: 0.1,
        max: 10,
        default: 0.5,
        unit: "Hz",
      },
      {
        key: "modDepth",
        label: "Mod Depth",
        type: "knob",
        min: 0,
        max: 0.05,
        default: 0.01,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.3 },
    ],
  },
  // Modulation
  {
    type: "chorus",
    name: "Chorus",
    category: "modulation",
    defaultParams: { rate: 1.5, depth: 0.003, delay: 0.03, wet: 0.5 },
    paramDefs: [
      {
        key: "rate",
        label: "Rate",
        type: "knob",
        min: 0.1,
        max: 10,
        default: 1.5,
        unit: "Hz",
      },
      {
        key: "depth",
        label: "Depth",
        type: "knob",
        min: 0,
        max: 0.02,
        default: 0.003,
      },
      {
        key: "delay",
        label: "Delay",
        type: "knob",
        min: 0.005,
        max: 0.1,
        default: 0.03,
        unit: "s",
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.5 },
    ],
  },
  {
    type: "flanger",
    name: "Flanger",
    category: "modulation",
    defaultParams: { rate: 0.5, depth: 0.002, feedback: 0.5, wet: 0.5 },
    paramDefs: [
      {
        key: "rate",
        label: "Rate",
        type: "knob",
        min: 0.05,
        max: 10,
        default: 0.5,
        unit: "Hz",
      },
      {
        key: "depth",
        label: "Depth",
        type: "knob",
        min: 0,
        max: 0.01,
        default: 0.002,
      },
      {
        key: "feedback",
        label: "Feedback",
        type: "knob",
        min: -0.99,
        max: 0.99,
        default: 0.5,
      },
      { key: "wet", label: "Wet", type: "knob", min: 0, max: 1, default: 0.5 },
    ],
  },
  {
    type: "phaser",
    name: "Phaser",
    category: "modulation",
    defaultParams: { rate: 0.5, depth: 1, stages: 4, feedback: 0.5 },
    paramDefs: [
      {
        key: "rate",
        label: "Rate",
        type: "knob",
        min: 0.05,
        max: 10,
        default: 0.5,
        unit: "Hz",
      },
      {
        key: "depth",
        label: "Depth",
        type: "knob",
        min: 0,
        max: 2,
        default: 1,
      },
      {
        key: "stages",
        label: "Stages",
        type: "knob",
        min: 2,
        max: 12,
        default: 4,
      },
      {
        key: "feedback",
        label: "Feedback",
        type: "knob",
        min: 0,
        max: 0.99,
        default: 0.5,
      },
    ],
  },
  {
    type: "tremolo",
    name: "Tremolo",
    category: "modulation",
    defaultParams: { rate: 4, depth: 0.5 },
    paramDefs: [
      {
        key: "rate",
        label: "Rate",
        type: "knob",
        min: 0.1,
        max: 20,
        default: 4,
        unit: "Hz",
      },
      {
        key: "depth",
        label: "Depth",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
    ],
  },
  {
    type: "vibrato",
    name: "Vibrato",
    category: "modulation",
    defaultParams: { rate: 5, depth: 0.005 },
    paramDefs: [
      {
        key: "rate",
        label: "Rate",
        type: "knob",
        min: 0.5,
        max: 20,
        default: 5,
        unit: "Hz",
      },
      {
        key: "depth",
        label: "Depth",
        type: "knob",
        min: 0,
        max: 0.02,
        default: 0.005,
      },
    ],
  },
  // Pitch
  {
    type: "autotune",
    name: "Auto-Tune",
    category: "pitch",
    defaultParams: { correction: 0.8, key: "C", scale: "major", speed: 10 },
    paramDefs: [
      {
        key: "correction",
        label: "Correction",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.8,
      },
      {
        key: "speed",
        label: "Speed",
        type: "knob",
        min: 0,
        max: 100,
        default: 10,
        unit: "ms",
      },
    ],
  },
  {
    type: "harmony",
    name: "Harmony Generator",
    category: "pitch",
    defaultParams: { interval: 3, blend: 0.7, key: "C" },
    paramDefs: [
      {
        key: "interval",
        label: "Interval",
        type: "knob",
        min: -12,
        max: 12,
        default: 3,
        unit: "st",
      },
      {
        key: "blend",
        label: "Blend",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.7,
      },
    ],
  },
  {
    type: "vocal_doubler",
    name: "Vocal Doubler",
    category: "pitch",
    defaultParams: { spread: 0.015, detune: 5, blend: 0.7 },
    paramDefs: [
      {
        key: "spread",
        label: "Spread",
        type: "knob",
        min: 0,
        max: 0.05,
        default: 0.015,
      },
      {
        key: "detune",
        label: "Detune",
        type: "knob",
        min: 0,
        max: 50,
        default: 5,
        unit: "¢",
      },
      {
        key: "blend",
        label: "Blend",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.7,
      },
    ],
  },
  {
    type: "formant_shifter",
    name: "Formant Shifter",
    category: "pitch",
    defaultParams: { shift: 0 },
    paramDefs: [
      {
        key: "shift",
        label: "Shift",
        type: "knob",
        min: -12,
        max: 12,
        default: 0,
        unit: "st",
      },
    ],
  },
  {
    type: "vocoder",
    name: "Vocoder",
    category: "pitch",
    defaultParams: { bands: 16, attack: 5, release: 50, blend: 1 },
    paramDefs: [
      {
        key: "bands",
        label: "Bands",
        type: "knob",
        min: 4,
        max: 32,
        default: 16,
      },
      {
        key: "attack",
        label: "Attack",
        type: "knob",
        min: 0.1,
        max: 100,
        default: 5,
        unit: "ms",
      },
      {
        key: "release",
        label: "Release",
        type: "knob",
        min: 5,
        max: 500,
        default: 50,
        unit: "ms",
      },
      {
        key: "blend",
        label: "Blend",
        type: "knob",
        min: 0,
        max: 1,
        default: 1,
      },
    ],
  },
  {
    type: "freq_shifter",
    name: "Frequency Shifter",
    category: "pitch",
    defaultParams: { shift: 0, blend: 0.5 },
    paramDefs: [
      {
        key: "shift",
        label: "Shift",
        type: "knob",
        min: -1000,
        max: 1000,
        default: 0,
        unit: "Hz",
      },
      {
        key: "blend",
        label: "Blend",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
    ],
  },
  {
    type: "ring_mod",
    name: "Ring Modulator",
    category: "pitch",
    defaultParams: { frequency: 200, blend: 0.5 },
    paramDefs: [
      {
        key: "frequency",
        label: "Freq",
        type: "knob",
        min: 1,
        max: 5000,
        default: 200,
        unit: "Hz",
      },
      {
        key: "blend",
        label: "Blend",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
    ],
  },
  // Saturation
  {
    type: "saturation",
    name: "Saturation/Tape",
    category: "saturation",
    defaultParams: { drive: 5, tone: 0.5, mix: 0.3 },
    paramDefs: [
      {
        key: "drive",
        label: "Drive",
        type: "knob",
        min: 1,
        max: 50,
        default: 5,
      },
      {
        key: "tone",
        label: "Tone",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
      { key: "mix", label: "Mix", type: "knob", min: 0, max: 1, default: 0.3 },
    ],
  },
  {
    type: "distortion",
    name: "Distortion",
    category: "saturation",
    defaultParams: { amount: 50, tone: 0.5, mix: 1 },
    paramDefs: [
      {
        key: "amount",
        label: "Amount",
        type: "knob",
        min: 0,
        max: 400,
        default: 50,
      },
      {
        key: "tone",
        label: "Tone",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
      { key: "mix", label: "Mix", type: "knob", min: 0, max: 1, default: 1 },
    ],
  },
  {
    type: "overdrive",
    name: "Overdrive",
    category: "saturation",
    defaultParams: { gain: 20, tone: 0.5 },
    paramDefs: [
      {
        key: "gain",
        label: "Gain",
        type: "knob",
        min: 1,
        max: 200,
        default: 20,
      },
      {
        key: "tone",
        label: "Tone",
        type: "knob",
        min: 0,
        max: 1,
        default: 0.5,
      },
    ],
  },
  {
    type: "bitcrusher",
    name: "Bitcrusher",
    category: "saturation",
    defaultParams: { bits: 8, sampleRateReduction: 1 },
    paramDefs: [
      { key: "bits", label: "Bits", type: "knob", min: 1, max: 24, default: 8 },
      {
        key: "sampleRateReduction",
        label: "Rate Reduce",
        type: "knob",
        min: 1,
        max: 64,
        default: 1,
      },
    ],
  },
  // Spatial
  {
    type: "stereo_widener",
    name: "Stereo Widener",
    category: "spatial",
    defaultParams: { width: 1.5 },
    paramDefs: [
      {
        key: "width",
        label: "Width",
        type: "knob",
        min: 0,
        max: 3,
        default: 1.5,
      },
    ],
  },
  {
    type: "auto_pan",
    name: "Panning/Auto-Pan",
    category: "spatial",
    defaultParams: { rate: 1, depth: 1, shape: "sine" },
    paramDefs: [
      {
        key: "rate",
        label: "Rate",
        type: "knob",
        min: 0.1,
        max: 20,
        default: 1,
        unit: "Hz",
      },
      {
        key: "depth",
        label: "Depth",
        type: "knob",
        min: 0,
        max: 1,
        default: 1,
      },
    ],
  },
];

export const FX_CATEGORIES: { id: FXCategory; label: string; color: string }[] =
  [
    { id: "dynamics", label: "Dynamics", color: "#e8a23c" },
    { id: "eq", label: "EQ / Filter", color: "#4caf7d" },
    { id: "reverb", label: "Reverb", color: "#5b9cf6" },
    { id: "delay", label: "Delay", color: "#9b7de8" },
    { id: "modulation", label: "Modulation", color: "#e85bb8" },
    { id: "pitch", label: "Pitch", color: "#e85b5b" },
    { id: "saturation", label: "Saturation", color: "#e87c42" },
    { id: "spatial", label: "Spatial", color: "#42c4e8" },
  ];

export const TRACK_COLORS = [
  "#00b4d8",
  "#06d6a0",
  "#f72585",
  "#7b2d8b",
  "#f4a261",
  "#e76f51",
  "#43aa8b",
  "#577590",
];

export const DEFAULT_PROJECT_TRACKS: Omit<DAWTrack, "id">[] = [
  {
    name: "Lead Vocal",
    color: "#00b4d8",
    volume: 0.8,
    pan: 0,
    muted: false,
    soloed: false,
    armed: false,
    order: 0,
    effectsChain: [],
    midiNotes: [],
  },
  {
    name: "Harmony Vox",
    color: "#06d6a0",
    volume: 0.65,
    pan: 0.3,
    muted: false,
    soloed: false,
    armed: false,
    order: 1,
    effectsChain: [],
    midiNotes: [],
  },
  {
    name: "Guitar",
    color: "#f4a261",
    volume: 0.7,
    pan: -0.4,
    muted: false,
    soloed: false,
    armed: false,
    order: 2,
    effectsChain: [],
    midiNotes: [],
  },
  {
    name: "Bass",
    color: "#e76f51",
    volume: 0.75,
    pan: 0,
    muted: false,
    soloed: false,
    armed: false,
    order: 3,
    effectsChain: [],
    midiNotes: [],
  },
  {
    name: "Drums",
    color: "#f72585",
    volume: 0.85,
    pan: 0,
    muted: false,
    soloed: false,
    armed: false,
    order: 4,
    effectsChain: [],
    midiNotes: [],
  },
  {
    name: "Synth Lead",
    color: "#7b2d8b",
    volume: 0.6,
    pan: 0.5,
    muted: false,
    soloed: false,
    armed: false,
    order: 5,
    effectsChain: [],
    midiNotes: [],
  },
];

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function midiNoteToName(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}
