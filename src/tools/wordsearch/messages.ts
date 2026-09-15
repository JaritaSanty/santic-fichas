import type { RejectedLine, SeedInput, Suggestion, WordSearchError, WordSearchWarning } from '@/generators/wordsearch';
import { WORDSEARCH_LIMITS } from '@/generators/wordsearch';
import type { Dictionary } from '@/i18n/dictionary';
import { formatMessage } from '@/i18n/format';

type Strings = Dictionary['wordsearch'];

const quoteChars = (chars: readonly string[], t: Strings) => chars.map((c) => formatMessage(t.quote, { text: c })).join(' ');

export function describeError(error: WordSearchError, t: Strings): string {
  switch (error.code) {
    case 'no-words':
      return t.errors.noWords;
    case 'too-many-words':
      return formatMessage(t.errors.tooManyWords, { count: error.count, max: error.max });
    case 'word-too-long':
      return error.length > WORDSEARCH_LIMITS.maxSize
        ? formatMessage(t.errors.wordTooLongMax, { word: error.word, length: error.length, max: WORDSEARCH_LIMITS.maxSize })
        : formatMessage(t.errors.wordTooLong, { word: error.word, length: error.length });
    case 'size-out-of-range':
      return formatMessage(t.errors.sizeOutOfRange, { min: error.min, max: error.max });
    case 'no-direction':
      return t.errors.noDirection;
  }
}

export function describeRejected(line: RejectedLine, t: Strings): string {
  switch (line.code) {
    case 'invalid-chars':
      return formatMessage(t.errors.invalidChars, { line: line.line });
    case 'too-short':
      return formatMessage(t.errors.tooShort, { line: line.line });
    case 'unsupported-glyph':
      return formatMessage(t.errors.unsupportedGlyph, { line: line.line, chars: quoteChars(line.chars, t) });
  }
}

export function describeWarning(warning: WordSearchWarning, t: Strings): string {
  switch (warning.code) {
    case 'duplicate':
      return formatMessage(t.warnings.duplicate, { line: warning.line, other: warning.duplicateOf });
    case 'contained':
      return formatMessage(warning.reversed ? t.warnings.containedReversed : t.warnings.contained, { line: warning.line, other: warning.containerLine });
    case 'large-list':
      return formatMessage(t.warnings.largeList, { size: warning.suggestedSize });
  }
}

export function describeSuggestion(s: Suggestion, t: Strings): string {
  switch (s.code) {
    case 'increase-size':
      return formatMessage(t.unplaced.increaseSize, { size: s.size });
    case 'enable-diagonal':
      return t.unplaced.enableDiagonal;
    case 'enable-reversed':
      return t.unplaced.enableReversed;
    case 'remove-words':
      return formatMessage(t.unplaced.removeWords, { words: s.words.join(', ') });
  }
}

export function describeSeed(seed: SeedInput, t: Strings): string | null {
  switch (seed.status) {
    case 'invalid':
      return t.seedInvalid;
    case 'other-version':
      return formatMessage(t.seedOtherVersion, { found: seed.version, version: seed.expected });
    default:
      return null;
  }
}
