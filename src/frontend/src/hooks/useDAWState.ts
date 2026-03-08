import { useCallback, useReducer } from "react";
import {
  type AudioClip,
  type BottomPanelTab,
  type DAWProject,
  type DAWTrack,
  DEFAULT_PROJECT_TRACKS,
  type FXSlot,
  type FXType,
  FX_CATALOG,
  type MidiNote,
  TRACK_COLORS,
} from "../types/daw";

// State
export interface DAWState {
  project: DAWProject;
  tracks: DAWTrack[];
  selectedTrackId: string | null;
  selectedClipId: string | null; // per-clip FX selection
  activeToolMode: "select" | "scissors"; // tool mode
  bottomPanelTab: BottomPanelTab;
  zoom: number; // pixels per beat
  scrollX: number;
  masterVolume: number;
  masterFXChain: FXSlot[];
  isMetronomeOn: boolean;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
}

// Actions
export type DAWAction =
  | { type: "SET_PROJECT"; project: DAWProject }
  | { type: "SET_TRACKS"; tracks: DAWTrack[] }
  | { type: "ADD_TRACK"; track: DAWTrack }
  | { type: "UPDATE_TRACK"; id: string; updates: Partial<DAWTrack> }
  | { type: "REMOVE_TRACK"; id: string }
  | { type: "SELECT_TRACK"; id: string | null }
  | { type: "SELECT_CLIP"; clipId: string | null }
  | { type: "SET_TOOL_MODE"; mode: "select" | "scissors" }
  | { type: "SET_BOTTOM_PANEL_TAB"; tab: BottomPanelTab }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_SCROLL_X"; scrollX: number }
  | { type: "SET_MASTER_VOLUME"; volume: number }
  | { type: "TOGGLE_METRONOME" }
  | { type: "SET_BPM"; bpm: number }
  | { type: "SET_TIME_SIG"; numerator: number; denominator: number }
  | { type: "ADD_FX_TO_TRACK"; trackId: string; fx: FXSlot }
  | { type: "REMOVE_FX_FROM_TRACK"; trackId: string; fxId: string }
  | {
      type: "UPDATE_FX_PARAM";
      trackId: string;
      fxId: string;
      key: string;
      value: number | string | boolean;
    }
  | { type: "TOGGLE_FX_BYPASS"; trackId: string; fxId: string }
  | { type: "ADD_FX_TO_MASTER"; fx: FXSlot }
  | { type: "REMOVE_FX_FROM_MASTER"; fxId: string }
  | {
      type: "UPDATE_MASTER_FX_PARAM";
      fxId: string;
      key: string;
      value: number | string | boolean;
    }
  | { type: "TOGGLE_MASTER_FX_BYPASS"; fxId: string }
  | { type: "ADD_MIDI_NOTE"; trackId: string; note: MidiNote }
  | { type: "REMOVE_MIDI_NOTE"; trackId: string; noteId: string }
  | {
      type: "UPDATE_MIDI_NOTE";
      trackId: string;
      noteId: string;
      updates: Partial<MidiNote>;
    }
  | { type: "SET_LOOP"; start: number; end: number; enabled: boolean }
  | {
      type: "MOVE_FX";
      trackId: string | null;
      fromIndex: number;
      toIndex: number;
    }
  // Clip actions
  | { type: "ADD_CLIP_TO_TRACK"; trackId: string; clip: AudioClip }
  | { type: "REMOVE_CLIP_FROM_TRACK"; trackId: string; clipId: string }
  | {
      type: "UPDATE_CLIP";
      trackId: string;
      clipId: string;
      updates: Partial<AudioClip>;
    }
  | { type: "SPLIT_CLIP"; trackId: string; clipId: string; atBeat: number }
  | { type: "ADD_FX_TO_CLIP"; trackId: string; clipId: string; fx: FXSlot }
  | {
      type: "REMOVE_FX_FROM_CLIP";
      trackId: string;
      clipId: string;
      fxId: string;
    }
  | {
      type: "UPDATE_CLIP_FX_PARAM";
      trackId: string;
      clipId: string;
      fxId: string;
      key: string;
      value: number | string | boolean;
    }
  | {
      type: "TOGGLE_CLIP_FX_BYPASS";
      trackId: string;
      clipId: string;
      fxId: string;
    };

function dawReducer(state: DAWState, action: DAWAction): DAWState {
  switch (action.type) {
    case "SET_PROJECT":
      return { ...state, project: action.project };
    case "SET_TRACKS":
      return { ...state, tracks: action.tracks };
    case "ADD_TRACK":
      return { ...state, tracks: [...state.tracks, action.track] };
    case "UPDATE_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.id ? { ...t, ...action.updates } : t,
        ),
      };
    case "REMOVE_TRACK":
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.id),
        selectedTrackId:
          state.selectedTrackId === action.id ? null : state.selectedTrackId,
      };
    case "SELECT_TRACK":
      return { ...state, selectedTrackId: action.id, selectedClipId: null };
    case "SELECT_CLIP":
      return { ...state, selectedClipId: action.clipId };
    case "SET_TOOL_MODE":
      return { ...state, activeToolMode: action.mode };
    case "SET_BOTTOM_PANEL_TAB":
      return { ...state, bottomPanelTab: action.tab };
    case "SET_ZOOM":
      return { ...state, zoom: Math.max(20, Math.min(400, action.zoom)) };
    case "SET_SCROLL_X":
      return { ...state, scrollX: Math.max(0, action.scrollX) };
    case "SET_MASTER_VOLUME":
      return { ...state, masterVolume: action.volume };
    case "TOGGLE_METRONOME":
      return { ...state, isMetronomeOn: !state.isMetronomeOn };
    case "SET_BPM":
      return {
        ...state,
        project: {
          ...state.project,
          bpm: Math.max(20, Math.min(300, action.bpm)),
        },
      };
    case "SET_TIME_SIG":
      return {
        ...state,
        project: {
          ...state.project,
          timeSignatureNumerator: action.numerator,
          timeSignatureDenominator: action.denominator,
        },
      };
    case "ADD_FX_TO_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? { ...t, effectsChain: [...t.effectsChain, action.fx] }
            : t,
        ),
      };
    case "REMOVE_FX_FROM_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                effectsChain: t.effectsChain.filter(
                  (f) => f.id !== action.fxId,
                ),
              }
            : t,
        ),
      };
    case "UPDATE_FX_PARAM":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                effectsChain: t.effectsChain.map((f) =>
                  f.id === action.fxId
                    ? {
                        ...f,
                        params: { ...f.params, [action.key]: action.value },
                      }
                    : f,
                ),
              }
            : t,
        ),
      };
    case "TOGGLE_FX_BYPASS":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                effectsChain: t.effectsChain.map((f) =>
                  f.id === action.fxId ? { ...f, enabled: !f.enabled } : f,
                ),
              }
            : t,
        ),
      };
    case "ADD_FX_TO_MASTER":
      return { ...state, masterFXChain: [...state.masterFXChain, action.fx] };
    case "REMOVE_FX_FROM_MASTER":
      return {
        ...state,
        masterFXChain: state.masterFXChain.filter((f) => f.id !== action.fxId),
      };
    case "UPDATE_MASTER_FX_PARAM":
      return {
        ...state,
        masterFXChain: state.masterFXChain.map((f) =>
          f.id === action.fxId
            ? { ...f, params: { ...f.params, [action.key]: action.value } }
            : f,
        ),
      };
    case "TOGGLE_MASTER_FX_BYPASS":
      return {
        ...state,
        masterFXChain: state.masterFXChain.map((f) =>
          f.id === action.fxId ? { ...f, enabled: !f.enabled } : f,
        ),
      };
    case "ADD_MIDI_NOTE":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? { ...t, midiNotes: [...t.midiNotes, action.note] }
            : t,
        ),
      };
    case "REMOVE_MIDI_NOTE":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                midiNotes: t.midiNotes.filter((n) => n.id !== action.noteId),
              }
            : t,
        ),
      };
    case "UPDATE_MIDI_NOTE":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                midiNotes: t.midiNotes.map((n) =>
                  n.id === action.noteId ? { ...n, ...action.updates } : n,
                ),
              }
            : t,
        ),
      };
    case "SET_LOOP":
      return {
        ...state,
        loopStart: action.start,
        loopEnd: action.end,
        loopEnabled: action.enabled,
      };
    case "MOVE_FX": {
      const { trackId, fromIndex, toIndex } = action;
      if (trackId === null) {
        const chain = [...state.masterFXChain];
        const [moved] = chain.splice(fromIndex, 1);
        chain.splice(toIndex, 0, moved);
        return { ...state, masterFXChain: chain };
      }
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== trackId) return t;
          const chain = [...t.effectsChain];
          const [moved] = chain.splice(fromIndex, 1);
          chain.splice(toIndex, 0, moved);
          return { ...t, effectsChain: chain };
        }),
      };
    }
    // Clip actions
    case "ADD_CLIP_TO_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? { ...t, clips: [...t.clips, action.clip] }
            : t,
        ),
      };
    case "REMOVE_CLIP_FROM_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? { ...t, clips: t.clips.filter((c) => c.id !== action.clipId) }
            : t,
        ),
        selectedClipId:
          state.selectedClipId === action.clipId ? null : state.selectedClipId,
      };
    case "UPDATE_CLIP":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === action.clipId ? { ...c, ...action.updates } : c,
                ),
              }
            : t,
        ),
      };
    case "SPLIT_CLIP": {
      const track = state.tracks.find((t) => t.id === action.trackId);
      if (!track) return state;
      const clip = track.clips.find((c) => c.id === action.clipId);
      if (!clip) return state;
      const splitBeat = action.atBeat;
      if (
        splitBeat <= clip.startBeat ||
        splitBeat >= clip.startBeat + clip.durationBeats
      )
        return state;

      const leftDuration = splitBeat - clip.startBeat;
      const rightDuration = clip.durationBeats - leftDuration;

      const leftClip: AudioClip = {
        ...clip,
        id: generateId(),
        durationBeats: leftDuration,
        effectsChain: clip.effectsChain.map((f) => ({
          ...f,
          id: generateId(),
        })),
      };
      const rightClip: AudioClip = {
        ...clip,
        id: generateId(),
        startBeat: splitBeat,
        durationBeats: rightDuration,
        bufferOffset: (clip.bufferOffset ?? 0) + leftDuration, // approximate
        effectsChain: clip.effectsChain.map((f) => ({
          ...f,
          id: generateId(),
        })),
      };

      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                clips: [
                  ...t.clips.filter((c) => c.id !== action.clipId),
                  leftClip,
                  rightClip,
                ],
              }
            : t,
        ),
      };
    }
    case "ADD_FX_TO_CLIP":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === action.clipId
                    ? { ...c, effectsChain: [...c.effectsChain, action.fx] }
                    : c,
                ),
              }
            : t,
        ),
      };
    case "REMOVE_FX_FROM_CLIP":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === action.clipId
                    ? {
                        ...c,
                        effectsChain: c.effectsChain.filter(
                          (f) => f.id !== action.fxId,
                        ),
                      }
                    : c,
                ),
              }
            : t,
        ),
      };
    case "UPDATE_CLIP_FX_PARAM":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === action.clipId
                    ? {
                        ...c,
                        effectsChain: c.effectsChain.map((f) =>
                          f.id === action.fxId
                            ? {
                                ...f,
                                params: {
                                  ...f.params,
                                  [action.key]: action.value,
                                },
                              }
                            : f,
                        ),
                      }
                    : c,
                ),
              }
            : t,
        ),
      };
    case "TOGGLE_CLIP_FX_BYPASS":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === action.clipId
                    ? {
                        ...c,
                        effectsChain: c.effectsChain.map((f) =>
                          f.id === action.fxId
                            ? { ...f, enabled: !f.enabled }
                            : f,
                        ),
                      }
                    : c,
                ),
              }
            : t,
        ),
      };
    default:
      return state;
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createDefaultTracks(): DAWTrack[] {
  return DEFAULT_PROJECT_TRACKS.map((t, i) => ({
    ...t,
    id: generateId(),
    order: i,
  }));
}

const defaultProject: DAWProject = {
  id: generateId(),
  name: "New Project",
  bpm: 120,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
};

const initialState: DAWState = {
  project: defaultProject,
  tracks: createDefaultTracks(),
  selectedTrackId: null,
  selectedClipId: null,
  activeToolMode: "select",
  bottomPanelTab: "mixer",
  zoom: 80,
  scrollX: 0,
  masterVolume: 0.85,
  masterFXChain: [],
  isMetronomeOn: false,
  loopStart: 0,
  loopEnd: 8,
  loopEnabled: false,
};

export function useDAWState() {
  const [state, dispatch] = useReducer(dawReducer, initialState);

  const addTrack = useCallback(
    (name?: string, color?: string) => {
      const colorIndex = state.tracks.length % TRACK_COLORS.length;
      const track: DAWTrack = {
        id: generateId(),
        name: name ?? `Track ${state.tracks.length + 1}`,
        color: color ?? TRACK_COLORS[colorIndex],
        volume: 0.75,
        pan: 0,
        muted: false,
        soloed: false,
        armed: false,
        order: state.tracks.length,
        effectsChain: [],
        midiNotes: [],
        clips: [],
      };
      dispatch({ type: "ADD_TRACK", track });
      return track.id;
    },
    [state.tracks.length],
  );

  const createFXSlot = useCallback((fxType: FXType): FXSlot => {
    const def = FX_CATALOG.find((d) => d.type === fxType);
    if (!def) throw new Error(`Unknown FX type: ${fxType}`);
    return {
      id: generateId(),
      type: fxType,
      name: def.name,
      enabled: true,
      params: { ...def.defaultParams },
    };
  }, []);

  return { state, dispatch, addTrack, createFXSlot, generateId };
}
