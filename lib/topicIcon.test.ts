import seed from '../db/seed.json';
import { topicKind } from './topicIcon';

describe('topicKind', () => {
  it.each([
    ['Octopus', 'sea'],
    ['Great white shark', 'sea'],
    ['Owls', 'bird'],
    ['Butterflies', 'insect'],
    ['Komodo dragons', 'animal'],
    ['Volcanoes', 'earth'],
    ['Tornadoes', 'weather'],
    ['Allergies', 'body'],
    ['Viruses', 'biology'],
    ['Black holes', 'space'],
    ['Inca Empire', 'history'],
    ['Albert Einstein', 'people'],
    ['3D printing', 'tech'],
    ['Airplanes', 'transport'],
    ['Algebra', 'math'],
    ['Etymology', 'language'],
    ['Chess', 'games'],
  ])('%s is %s', (name, kind) => {
    expect(topicKind(name)).toBe(kind);
  });

  it('lets an earlier kind win when words match several', () => {
    expect(topicKind('Ice cream')).toBe('food');
    expect(topicKind('Ice age')).toBe('history');
    expect(topicKind('Ice')).toBe('chemistry');
    expect(topicKind('Mercury planet')).toBe('space');
    expect(topicKind('Venus flytrap')).toBe('plant');
    expect(topicKind('Body language')).toBe('mind');
    expect(topicKind('Large language models')).toBe('tech');
  });

  it('ignores case and punctuation', () => {
    expect(topicKind('  SHARKS! ')).toBe('sea');
    expect(topicKind("Rubik's cube")).toBe('games');
    expect(topicKind('Wi-Fi')).toBe('tech');
  });

  it('falls back to a plain topic', () => {
    expect(topicKind('Something new')).toBe('topic');
    expect(topicKind('')).toBe('topic');
    expect(topicKind('תמנון')).toBe('topic');
  });

  it('gives every seed topic a kind', () => {
    const names = (seed as { name: string }[]).map((item) => item.name);
    expect(names.filter((name) => topicKind(name) === 'topic')).toEqual([]);
  });
});
