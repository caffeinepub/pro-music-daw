# Pro Music DAW

## Current State
New project. No backend or frontend logic exists yet. Only scaffold files are present.

## Requested Changes (Diff)

### Add
- Full-featured DAW (Digital Audio Workstation) web app using Web Audio API
- Multi-track recording/playback interface with waveform display per track
- Piano roll / MIDI editor panel
- Mixer panel: per-track volume faders, panning knobs, mute/solo buttons
- Master effects chain and per-track effects chain
- 30+ professional FX plugins: EQ, Compressor, Limiter, Gate/Expander, De-esser, Reverb, Delay/Echo, Chorus, Flanger, Phaser, Tremolo, Vibrato, Auto-Tune/Pitch Correction, Harmony Generator, Vocal Doubler, Saturation/Tape, Distortion, Overdrive, Bitcrusher, Ring Modulator, Frequency Shifter, Stereo Widener, Panning/Auto-Pan, Transient Shaper, Multi-band Compressor, Parallel Compression, Convolution Reverb, Plate Reverb, Spring Reverb, Room Reverb, Delay (Stereo/Ping-Pong), Tape Delay, Modulated Delay, Formant Shifter, Vocoder, Low-pass Filter, High-pass Filter, Band-pass Filter, Notch Filter, Graphic EQ
- Transport controls: play, stop, record, rewind, loop
- BPM/tempo and time signature controls
- Track timeline with zoom in/out
- Drag and drop audio file import
- Export/render project to audio file
- Metronome with click track
- Real-time VU meters and spectrum analyzer
- Dark professional DAW-style UI theme

### Modify
- Nothing (new project)

### Remove
- Nothing

## Implementation Plan

### Backend (Motoko)
- Project storage: save/load project metadata (tracks, BPM, time signature, effects chain config)
- Track metadata: name, color, volume, pan, mute, solo, effects list with parameter values
- Project export metadata: store render job state
- Minimal API: createProject, getProject, updateProject, listProjects

### Frontend (React + Web Audio API)
1. **App layout**: Three-panel DAW layout — top toolbar, left track headers + center timeline, bottom mixer/piano-roll/effects tabs
2. **Audio engine**: Web Audio API context, per-track AudioBufferSourceNode/MediaStreamSourceNode, gain nodes, pan nodes, analyser nodes for VU/spectrum
3. **Transport bar**: Play, Stop, Record, Rewind, Loop toggle; BPM input; time signature selector; metronome toggle; position display (bars:beats:ticks)
4. **Track lane**: Waveform canvas rendering, drag-and-drop audio import, timeline ruler with zoom
5. **Mixer panel**: Per-track channel strip (volume fader, pan knob, mute, solo, VU meter); master channel strip
6. **Effects chain UI**: Draggable FX slot list per track and master; 30+ FX plugin UIs with parameter knobs/sliders
7. **Piano roll**: MIDI note grid editor with note creation/deletion/resize, velocity lane
8. **Spectrum analyzer**: Canvas-based FFT frequency display
9. **Project persistence**: Save/load to backend canister
10. **Export**: OfflineAudioContext render to WAV, download via Blob URL
