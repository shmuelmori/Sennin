import { activeCountLabel, filterItems, sortItems } from './itemList';

type Row = { id: number; name: string; removed: boolean };

const row = (id: number, name: string, removed = false): Row => ({ id, name, removed });

describe('sortItems', () => {
  it('sorts by name, ignoring case', () => {
    const sorted = sortItems([row(1, 'volcanoes'), row(2, 'Black holes'), row(3, 'iron')]);
    expect(sorted.map((r) => r.name)).toEqual(['Black holes', 'iron', 'volcanoes']);
  });

  it('breaks ties by ID', () => {
    expect(sortItems([row(5, 'Iron'), row(2, 'iron')]).map((r) => r.id)).toEqual([2, 5]);
  });
});

describe('filterItems', () => {
  const items = [row(1, 'Black holes'), row(2, 'Iron'), row(3, 'White holes')];

  it('keeps names containing the search, ignoring case', () => {
    expect(filterItems(items, ' HOLE ').map((r) => r.id)).toEqual([1, 3]);
  });

  it('keeps everything for an empty search', () => {
    expect(filterItems(items, '  ')).toHaveLength(3);
  });
});

describe('activeCountLabel', () => {
  it('counts the items that are not removed', () => {
    expect(activeCountLabel([row(1, 'a'), row(2, 'b', true), row(3, 'c')])).toBe('2 of 3 active');
  });

  it('uses thousands separators', () => {
    const many = Array.from({ length: 1200 }, (_, n) => row(n, 'x'));
    expect(activeCountLabel(many)).toBe('1,200 of 1,200 active');
  });
});
