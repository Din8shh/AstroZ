/// <reference lib="webworker" />
// The engine web worker. ALL astrology maths runs here (CLAUDE.md); screens use src/engine/client.ts.
import { expose } from 'comlink';
import { createEngine } from './core/engine';
import { DEFAULT_EPHEMERIS_OPTIONS, loadEphemeris } from './ephemeris';

expose(createEngine(() => loadEphemeris(DEFAULT_EPHEMERIS_OPTIONS)));
