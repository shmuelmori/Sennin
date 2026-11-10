import {
  buildPrompt,
  buildRequestBody,
  classifyStatus,
  describeFailure,
  formatAnswerLine,
  INSTRUCTION,
  isMostlyHebrew,
  LANGUAGE_RULE,
  MAX_DESCRIPTION_CHARS,
  readAnswer,
  trimDescription,
  type VideoContext,
} from './videoInfo';

const VIDEO: VideoContext = {
  title: 'How octopuses change color',
  description: 'Chromatophores explained.',
  itemName: 'Octopus',
  channelTitle: 'Sea Facts',
};

describe('trimDescription', () => {
  it('keeps a short description, trimmed', () => {
    expect(trimDescription('  hello \n')).toBe('hello');
  });

  it('cuts a long description and marks the cut', () => {
    const text = trimDescription('a'.repeat(MAX_DESCRIPTION_CHARS + 50));
    expect(text).toHaveLength(MAX_DESCRIPTION_CHARS + 1);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('buildPrompt', () => {
  it('starts with the instruction and holds the title, description, topic and channel', () => {
    const prompt = buildPrompt(VIDEO);
    expect(prompt.startsWith(INSTRUCTION)).toBe(true);
    expect(prompt).toContain('נושא: Octopus');
    expect(prompt).toContain('כותרת: How octopuses change color');
    expect(prompt).toContain('ערוץ: Sea Facts');
    expect(prompt).toContain('תיאור: Chromatophores explained.');
  });

  it('ends with the Hebrew-only rule', () => {
    expect(buildPrompt(VIDEO).endsWith(LANGUAGE_RULE)).toBe(true);
    expect(LANGUAGE_RULE).toContain('בעברית בלבד');
  });

  it('marks a missing description and channel', () => {
    const prompt = buildPrompt({ ...VIDEO, description: ' ', channelTitle: '' });
    expect(prompt).toContain('תיאור: (אין)');
    expect(prompt).toContain('ערוץ: (לא ידוע)');
  });

  it('asks for Hebrew, 150–250 words, search facts only and no source list', () => {
    expect(INSTRUCTION).toContain('בעברית');
    expect(INSTRUCTION).toContain('150–250 מילים');
    expect(INSTRUCTION).toContain('רק בעובדות שמצאת בחיפוש');
    expect(INSTRUCTION).toContain('אל תציג רשימת מקורות');
  });
});

describe('buildRequestBody', () => {
  it('sends one user message with the google_search tool', () => {
    const body = buildRequestBody(VIDEO);
    expect(body.systemInstruction).toEqual({ parts: [{ text: LANGUAGE_RULE }] });
    expect(body.tools).toEqual([{ google_search: {} }]);
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: buildPrompt(VIDEO) }] }]);
  });
});

describe('readAnswer', () => {
  it('joins the text parts and reads the grounding', () => {
    const answer = readAnswer({
      candidates: [
        {
          content: { parts: [{ text: 'תמנון ' }, { text: 'משנה צבע.' }] },
          groundingMetadata: {
            webSearchQueries: ['octopus color change'],
            groundingChunks: [{}, {}],
          },
        },
      ],
    });
    expect(answer).toEqual({
      text: 'תמנון משנה צבע.',
      grounded: true,
      searchQueries: ['octopus color change'],
      sourceCount: 2,
    });
  });

  it('leaves out thought parts', () => {
    const answer = readAnswer({
      candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: 'תשובה' }] } }],
    });
    expect(answer?.text).toBe('תשובה');
  });

  it('marks an answer without groundingMetadata as not grounded', () => {
    const answer = readAnswer({ candidates: [{ content: { parts: [{ text: 'x' }] } }] });
    expect(answer).toEqual({ text: 'x', grounded: false, searchQueries: [], sourceCount: 0 });
  });

  it.each([
    ['no candidates', {}],
    ['an empty list', { candidates: [] }],
    ['no parts', { candidates: [{ finishReason: 'SAFETY' }] }],
    ['blank text', { candidates: [{ content: { parts: [{ text: '  \n' }] } }] }],
  ])('returns null for %s', (_name, response) => {
    expect(readAnswer(response)).toBeNull();
  });
});

describe('isMostlyHebrew', () => {
  it('accepts Hebrew text with English terms in it', () => {
    expect(isMostlyHebrew('התמנון (Octopus) משנה את צבעו בעזרת תאים בשם כרומטופורים.')).toBe(true);
  });

  it('rejects English text', () => {
    expect(isMostlyHebrew('The octopus changes color using chromatophores.')).toBe(false);
  });

  it('rejects text that is mostly English with a little Hebrew', () => {
    expect(isMostlyHebrew('שלום. The octopus changes color using chromatophores.')).toBe(false);
  });

  it('rejects text with no letters', () => {
    expect(isMostlyHebrew('123 …')).toBe(false);
  });
});

describe('classifyStatus', () => {
  it('treats 429 as the quota', () => {
    expect(classifyStatus(429)).toBe('quota');
  });

  it.each([400, 403, 404, 500, 503])('treats %d as other', (status) => {
    expect(classifyStatus(status)).toBe('other');
  });
});

describe('describeFailure', () => {
  it('gives the three agreed messages', () => {
    expect(describeFailure('offline')).toBe('אין חיבור');
    expect(describeFailure('quota')).toBe('נגמרה המכסה להיום');
    expect(describeFailure('empty')).toBe('לא נמצא מידע על הנושא');
  });

  it('names the missing key', () => {
    expect(describeFailure('noKey')).toContain('EXPO_PUBLIC_GEMINI_KEY');
  });
});

describe('formatAnswerLine', () => {
  it('reports the grounding', () => {
    const line = formatAnswerLine(
      'abc',
      { text: 'שלום', grounded: true, searchQueries: ['a', 'b'], sourceCount: 3 },
      4200,
    );
    expect(line).toBe('[gemini] abc: 4 chars in 4200 ms, grounded (3 sources, queries: a | b)');
  });

  it('flags an answer that is not grounded', () => {
    const line = formatAnswerLine(
      'abc',
      { text: 'x', grounded: false, searchQueries: [], sourceCount: 0 },
      10,
    );
    expect(line).toContain('NOT grounded');
  });
});
