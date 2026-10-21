import { getElevenLabsSpeed, getPlaybackRates } from '@/lib/utils/ttsConfig';

describe('Thai voice speed', () => {
  it('generates a little faster than the learner floor', () => {
    expect(getElevenLabsSpeed('th')).toBe(0.85);
    expect(getElevenLabsSpeed('th')).toBeGreaterThan(getElevenLabsSpeed('vi'));
  });

  it('speeds up both speaker clicks and keeps the second click slower', () => {
    const { normal, slow } = getPlaybackRates('th');
    expect(normal).toBe(1.1);
    expect(slow).toBe(0.75);
    expect(slow).toBeLessThan(normal);
    expect(normal).toBeGreaterThan(getPlaybackRates('ja').normal);
    expect(slow).toBeGreaterThan(getPlaybackRates('ja').slow);
  });
});
