/**
 * @jest-environment node
 */
import { readRunConfig, UNKNOWN_DEVICE, LAPTOP_VIEWPORT } from './run-config';
import { RUN_B_THROTTLE } from './throttle-profiles';

const appDir = '/repo/app';
const today = new Date('2026-09-16T10:00:00Z');

describe('readRunConfig', () => {
    it('fills run A defaults and names the unknowns in the required wording', () => {
        const config = readRunConfig({ BENCHMARK_RUN: 'a' }, appDir, today);
        expect(config.run).toBe('A');
        expect(config.label).toBe('before');
        expect(config.repetitions).toBe(5);
        expect(config.baseUrl).toBe('http://localhost:3000');
        expect(config.device).toBe(UNKNOWN_DEVICE);
        expect(config.connection).toMatch(/^Unknown — to be confirmed by the product owner/);
        expect(config.date).toBe('2026-09-16');
        expect(config.throttle).toBeNull();
        expect(config.viewport).toEqual(LAPTOP_VIEWPORT);
        expect(config.headless).toBe(true);
        expect(config.outputDir).toBe('/repo/docs/benchmarks');
        expect(config.cdnOrProxy).toBe('none');
    });

    it('applies the fixed throttle profile to run B', () => {
        const config = readRunConfig({ BENCHMARK_RUN: 'B', BENCHMARK_DEVICE: ' Dell XPS 13 ' }, appDir, today);
        expect(config.throttle).toBe(RUN_B_THROTTLE);
        expect(config.device).toBe('Dell XPS 13');
        expect(config.connection).toContain('Slow 4G');
    });

    it('requires a remote-debugging endpoint for run C and leaves the phone viewport alone', () => {
        expect(() => readRunConfig({ BENCHMARK_RUN: 'C' }, appDir, today)).toThrow(/BENCHMARK_CDP_ENDPOINT/);
        const config = readRunConfig({ BENCHMARK_RUN: 'C', BENCHMARK_CDP_ENDPOINT: 'http://127.0.0.1:9222' }, appDir, today);
        expect(config.viewport).toBeNull();
        expect(config.cdpEndpoint).toBe('http://127.0.0.1:9222');
    });

    it('rejects an unknown run, label, repetition count or date', () => {
        expect(() => readRunConfig({}, appDir, today)).toThrow(/BENCHMARK_RUN/);
        expect(() => readRunConfig({ BENCHMARK_RUN: 'A', BENCHMARK_LABEL: 'during' }, appDir, today)).toThrow(/BENCHMARK_LABEL/);
        expect(() => readRunConfig({ BENCHMARK_RUN: 'A', BENCHMARK_REPETITIONS: '0' }, appDir, today)).toThrow(/BENCHMARK_REPETITIONS/);
        expect(() => readRunConfig({ BENCHMARK_RUN: 'A', BENCHMARK_DATE: '16/09/2026' }, appDir, today)).toThrow(/BENCHMARK_DATE/);
    });

    it('honours explicit overrides', () => {
        const config = readRunConfig({
            BENCHMARK_RUN: 'A',
            BENCHMARK_LABEL: 'after',
            BENCHMARK_BASE_URL: 'http://192.168.1.10:3000/',
            BENCHMARK_REPETITIONS: '2',
            BENCHMARK_DATE: '2026-10-20',
            BENCHMARK_HEADED: '1',
            BENCHMARK_OUTPUT_DIR: '/tmp/bench',
            BENCHMARK_PROXY: 'nginx reverse proxy on the VM'
        }, appDir, today);
        expect(config.cdnOrProxy).toBe('nginx reverse proxy on the VM');
        expect(config.label).toBe('after');
        expect(config.baseUrl).toBe('http://192.168.1.10:3000');
        expect(config.repetitions).toBe(2);
        expect(config.date).toBe('2026-10-20');
        expect(config.headless).toBe(false);
        expect(config.outputDir).toBe('/tmp/bench');
    });
});
