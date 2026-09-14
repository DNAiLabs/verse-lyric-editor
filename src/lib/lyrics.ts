// Syllable counting and lyric analysis utilities

const VOWEL_GROUPS = /[aeiouy]+/g;

const SPECIAL_SYLLABLES: Record<string, number> = {
  the: 1, a: 1, an: 1, i: 1, oh: 1, ok: 2, okay: 2, yeah: 1, boy: 1, girl: 1,
  world: 1, fire: 2, higher: 2, hour: 2, power: 2, shower: 2, flower: 2,
  money: 2, honey: 2, baby: 2, maybe: 2, every: 2, family: 3, history: 3,
  memory: 3, beautiful: 4, everything: 4, nothing: 2, something: 2, coming: 2,
  going: 2, doing: 2, being: 2, seeing: 2, feeling: 2, real: 2, deal: 1,
  feel: 1, wheel: 1, steel: 1, alone: 2, alive: 2, away: 2, today: 2,
  tonight: 2, alright: 2, outta: 2, gotta: 2, wanna: 2, gonna: 2, kinda: 2,
  cause: 1, bout: 1, til: 1, em: 1, ya: 1, ima: 2, tryna: 2,
};

export function countSyllablesInWord(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!clean) return 0;
  if (SPECIAL_SYLLABLES[clean] !== undefined) return SPECIAL_SYLLABLES[clean];
  const matches = clean.match(VOWEL_GROUPS);
  if (!matches) return 0;
  let count = matches.length;
  if (clean.length > 2 && clean.endsWith('e') && count > 1) {
    const beforeE = clean.slice(-2, -1);
    if (!'aeiou'.includes(beforeE)) count -= 1;
  }
  return Math.max(1, count);
}

export function countSyllablesInLine(line: string): number {
  const words = line.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  return words.reduce((sum, w) => sum + countSyllablesInWord(w), 0);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export interface LineAnalysis {
  lineNumber: number;
  text: string;
  syllables: number;
  words: number;
  isEmpty: boolean;
  isSection: boolean;
}

export function analyzeLyrics(lyrics: string): LineAnalysis[] {
  const lines = lyrics.split('\n');
  return lines.map((text, i) => {
    const trimmed = text.trim();
    const syllables = countSyllablesInLine(trimmed);
    const words = countWords(trimmed);
    return {
      lineNumber: i + 1,
      text,
      syllables,
      words,
      isEmpty: trimmed.length === 0,
      isSection: /^\[.+\]$/.test(trimmed),
    };
  });
}

export function getTotalBars(lines: LineAnalysis[]): number {
  return lines.filter((l) => !l.isEmpty && !l.isSection).length;
}

export function getAvgSyllablesPerBar(lines: LineAnalysis[]): number {
  const nonEmpty = lines.filter((l) => !l.isEmpty && !l.isSection);
  if (nonEmpty.length === 0) return 0;
  const total = nonEmpty.reduce((sum, l) => sum + l.syllables, 0);
  return Math.round((total / nonEmpty.length) * 10) / 10;
}

export function getFlowPace(bpm: number, avgSyllables: number): string {
  if (avgSyllables === 0) return '--';
  const syllablesPerSecond = (avgSyllables * bpm) / 240;
  if (syllablesPerSecond < 1.5) return 'Laid-back';
  if (syllablesPerSecond < 2.5) return 'Steady';
  if (syllablesPerSecond < 3.5) return 'Energetic';
  if (syllablesPerSecond < 4.5) return 'Fast';
  return 'Rapid-fire';
}

export function getLastWord(line: string): string {
  const words = line.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return '';
  return words[words.length - 1].toLowerCase().replace(/[^a-z']/g, '');
}

export function getRhymeTail(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length < 2) return clean;
  const matches = [...clean.matchAll(VOWEL_GROUPS)];
  if (matches.length === 0) return clean.slice(-2);
  const lastMatch = matches[matches.length - 1];
  const startIdx = lastMatch.index ?? 0;
  return clean.slice(startIdx);
}

export interface RhymeGroup {
  letter: string;
  color: string;
  lineIndices: number[];
}

const RHYME_COLORS = [
  '#22d3ee', // cyan
  '#fbbf24', // amber
  '#f472b6', // pink
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb923c', // orange
  '#60a5fa', // blue
  '#f87171', // red
];

export function detectRhymes(lines: LineAnalysis[]): {
  groups: RhymeGroup[];
  lineRhymeColors: Map<number, string>;
} {
  const nonEmpty = lines.filter((l) => !l.isEmpty && !l.isSection);
  if (nonEmpty.length === 0) return { groups: [], lineRhymeColors: new Map() };

  const tails = nonEmpty.map((l) => getLastWord(l.text));
  const rhymeTails = tails.map((t) => getRhymeTail(t));

  const letterMap: Record<string, string> = {};
  let currentLetter = 'A';
  const lineToLetter: Map<number, string> = new Map();

  for (let i = 0; i < rhymeTails.length; i++) {
    const tail = rhymeTails[i];
    if (!tail || tail.length < 2) continue;
    let found = false;
    for (const [key, letter] of Object.entries(letterMap)) {
      if (key === tail || (key.length >= 2 && tail.length >= 2 && key.slice(-2) === tail.slice(-2))) {
        lineToLetter.set(nonEmpty[i].lineNumber - 1, letter);
        found = true;
        break;
      }
    }
    if (!found) {
      letterMap[tail] = currentLetter;
      lineToLetter.set(nonEmpty[i].lineNumber - 1, currentLetter);
      currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
    }
  }

  const letterToLines: Record<string, number[]> = {};
  for (const [lineIdx, letter] of lineToLetter) {
    if (!letterToLines[letter]) letterToLines[letter] = [];
    letterToLines[letter].push(lineIdx);
  }

  const groups: RhymeGroup[] = [];
  const lineRhymeColors = new Map<number, string>();
  let colorIdx = 0;
  for (const [letter, lineIndices] of Object.entries(letterToLines)) {
    if (lineIndices.length >= 2) {
      const color = RHYME_COLORS[colorIdx % RHYME_COLORS.length];
      colorIdx++;
      groups.push({ letter, color, lineIndices });
      for (const idx of lineIndices) {
        lineRhymeColors.set(idx, color);
      }
    }
  }

  return { groups, lineRhymeColors };
}

export function detectRhymeScheme(lines: LineAnalysis[]): {
  scheme: string;
  rhymeGroups: number;
  pairs: number;
} {
  const nonEmpty = lines.filter((l) => !l.isEmpty && !l.isSection);
  if (nonEmpty.length === 0) return { scheme: '', rhymeGroups: 0, pairs: 0 };

  const tails = nonEmpty.map((l) => getLastWord(l.text));
  const rhymeTails = tails.map((t) => getRhymeTail(t));

  const letterMap: Record<string, string> = {};
  let currentLetter = 'A';
  const schemeParts: string[] = [];

  for (let i = 0; i < rhymeTails.length; i++) {
    const tail = rhymeTails[i];
    if (!tail || tail.length < 2) {
      schemeParts.push('-');
      continue;
    }
    let found = false;
    for (const [key, letter] of Object.entries(letterMap)) {
      if (key === tail || (key.length >= 2 && tail.length >= 2 && key.slice(-2) === tail.slice(-2))) {
        schemeParts.push(letter);
        found = true;
        break;
      }
    }
    if (!found) {
      letterMap[tail] = currentLetter;
      schemeParts.push(currentLetter);
      currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
    }
  }

  const letterCounts: Record<string, number> = {};
  for (const letter of schemeParts) {
    if (letter !== '-') letterCounts[letter] = (letterCounts[letter] || 0) + 1;
  }
  const rhymeGroups = Object.values(letterCounts).filter((c) => c >= 2).length;
  const pairs = Object.values(letterCounts).filter((c) => c >= 2).reduce((sum, c) => sum + Math.floor(c / 2), 0);

  return { scheme: schemeParts.join('-'), rhymeGroups, pairs };
}
