import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Project {
    id: string;
    bpm: bigint;
    timeSignatureDenominator: bigint;
    name: string;
    createdAt: bigint;
    updatedAt: bigint;
    timeSignatureNumerator: bigint;
}
export interface Track {
    id: string;
    pan: number;
    muted: boolean;
    soloed: boolean;
    order: bigint;
    name: string;
    color: string;
    volume: number;
    projectId: string;
    effectsChain: string;
}
export interface backendInterface {
    addTrack(projectId: string, name: string, color: string): Promise<Track>;
    createProject(name: string, bpm: bigint, timeSignatureNumerator: bigint, timeSignatureDenominator: bigint): Promise<Project>;
    deleteProject(id: string): Promise<boolean>;
    deleteTrack(trackId: string): Promise<boolean>;
    getProject(id: string): Promise<Project | null>;
    getTracksForProject(projectId: string): Promise<Array<Track>>;
    listProjects(): Promise<Array<Project>>;
    updateProject(id: string, name: string, bpm: bigint, timeSigNum: bigint, timeSigDen: bigint): Promise<Project>;
    updateTrack(trackId: string, name: string, color: string, volume: number, pan: number, muted: boolean, soloed: boolean, effectsChain: string, order: bigint): Promise<Track>;
}
