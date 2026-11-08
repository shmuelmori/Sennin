import type { RejectedVideo } from './filterRules';
import {
  decodeItemReports,
  decodeRejections,
  encodeItemReports,
  encodeRejections,
  isFeedStatus,
  type ItemReport,
} from './records';

const rejected: RejectedVideo[] = [
  { videoId: 'abc', rule: 'length', detail: '240 s' },
  { videoId: 'def', rule: 'queryMatch', detail: 'no word from "octopus"' },
  { videoId: 'ghi', rule: 'blockedWord', detail: 'מם "reacts to"' },
];

describe('encodeRejections and decodeRejections', () => {
  it('round-trips a list, including Hebrew and quotes', () => {
    expect(decodeRejections(encodeRejections(rejected))).toEqual(rejected);
  });

  it('round-trips an empty list', () => {
    expect(encodeRejections([])).toBe('[]');
    expect(decodeRejections('[]')).toEqual([]);
  });

  it('stores only videoId, rule and detail', () => {
    const extra = [{ ...rejected[0], title: 'not stored' }];
    expect(JSON.parse(encodeRejections(extra))).toEqual([rejected[0]]);
  });

  it('rejects text that is not JSON', () => {
    expect(decodeRejections('')).toBeNull();
    expect(decodeRejections('length: abc')).toBeNull();
  });

  it('rejects JSON that is not a list', () => {
    expect(decodeRejections('{}')).toBeNull();
    expect(decodeRejections('null')).toBeNull();
    expect(decodeRejections('"abc"')).toBeNull();
  });

  it('rejects a list with a bad entry', () => {
    expect(decodeRejections('[null]')).toBeNull();
    expect(decodeRejections('[{"videoId":"a","rule":"length"}]')).toBeNull();
    expect(decodeRejections('[{"videoId":1,"rule":"length","detail":""}]')).toBeNull();
    expect(decodeRejections('[{"videoId":"a","rule":"tooLong","detail":""}]')).toBeNull();
  });

  it('drops extra fields when reading', () => {
    expect(decodeRejections('[{"videoId":"a","rule":"live","detail":"x","more":1}]')).toEqual([
      { videoId: 'a', rule: 'live', detail: 'x' },
    ]);
  });
});

describe('isFeedStatus', () => {
  it('accepts the three statuses', () => {
    expect(['unseen', 'watched', 'skipped'].every(isFeedStatus)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isFeedStatus('')).toBe(false);
    expect(isFeedStatus('Watched')).toBe(false);
    expect(isFeedStatus('done')).toBe(false);
  });
});

const reports: ItemReport[] = [
  { itemId: 1, name: 'Octopus', results: 25, passed: 7, selected: 5, error: null },
  { itemId: 2, name: 'חורים שחורים', results: 0, passed: 0, selected: 0, error: 'network' },
];

describe('encodeItemReports and decodeItemReports', () => {
  it('round-trips a list, including Hebrew and an error', () => {
    expect(decodeItemReports(encodeItemReports(reports))).toEqual(reports);
  });

  it('round-trips an empty list', () => {
    expect(decodeItemReports(encodeItemReports([]))).toEqual([]);
  });

  it('stores only the report fields', () => {
    const extra = [{ ...reports[0], query: 'not stored' }];
    expect(JSON.parse(encodeItemReports(extra))).toEqual([reports[0]]);
  });

  it('rejects text that is not a list of reports', () => {
    expect(decodeItemReports('')).toBeNull();
    expect(decodeItemReports('{}')).toBeNull();
    expect(decodeItemReports('[null]')).toBeNull();
    expect(decodeItemReports('[{"itemId":1,"name":"a","results":-1,"passed":0,"selected":0,"error":null}]')).toBeNull();
    expect(decodeItemReports('[{"itemId":1,"name":"a","results":1,"passed":0,"selected":0}]')).toBeNull();
  });
});
