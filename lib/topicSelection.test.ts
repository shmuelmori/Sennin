import { canAddChannel, toggleTopic, topicOptions } from './topicSelection';

describe('toggleTopic', () => {
  it('picks a first topic', () => {
    expect(toggleTopic([], 'ww2')).toEqual(['ww2']);
    expect(toggleTopic([], 'claude-code')).toEqual(['claude-code']);
  });

  it('adds a second topic in the order of lib/topics.ts', () => {
    expect(toggleTopic(['claude-code'], 'ww2')).toEqual(['ww2', 'claude-code']);
    expect(toggleTopic(['ww2'], 'claude-code')).toEqual(['ww2', 'claude-code']);
  });

  it('removes a topic when another one stays', () => {
    expect(toggleTopic(['ww2', 'claude-code'], 'ww2')).toEqual(['claude-code']);
    expect(toggleTopic(['ww2', 'claude-code'], 'claude-code')).toEqual(['ww2']);
  });

  it("refuses to remove the only topic left (F3)", () => {
    expect(toggleTopic(['ww2'], 'ww2')).toBeNull();
    expect(toggleTopic(['claude-code'], 'claude-code')).toBeNull();
  });

  it('drops duplicates in the input', () => {
    expect(toggleTopic(['ww2', 'ww2'], 'claude-code')).toEqual(['ww2', 'claude-code']);
  });

  it("doesn't change the array it was given", () => {
    const selected = ['ww2' as const];
    toggleTopic(selected, 'claude-code');
    expect(selected).toEqual(['ww2']);
  });
});

describe('topicOptions', () => {
  it('lists every topic with its name and whether it is picked', () => {
    expect(topicOptions(['claude-code'])).toEqual([
      { id: 'ww2', name: 'World War II', selected: false },
      { id: 'claude-code', name: 'Claude Code', selected: true },
    ]);
  });

  it('lists every topic as not picked for an empty selection', () => {
    expect(topicOptions([]).map((option) => option.selected)).toEqual([false, false]);
  });
});

describe('canAddChannel', () => {
  it('needs input and at least one topic', () => {
    expect(canAddChannel('@3blue1brown', ['ww2'])).toBe(true);
    expect(canAddChannel('@3blue1brown', [])).toBe(false);
    expect(canAddChannel('', ['ww2'])).toBe(false);
  });

  it('treats blank input as empty', () => {
    expect(canAddChannel('   ', ['ww2'])).toBe(false);
  });
});
