export function exactPeriod(length: number, gravity: number, amplitude: number): number;
export function buildFixtures(): Record<string, string>;
export function renderCsv(study: unknown): string;
export const NOISE_AMPLITUDE_SEED: number;
export function noiseAmplitudeRows(seed: number, amplitudes?: number[], holdout?: number[]): Record<string, unknown>[];
export function inputSigmaRows(prefix: string, role: string, seed: number, lengths?: number[]): Record<string, unknown>[];
