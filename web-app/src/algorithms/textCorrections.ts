/**
 * Text Corrections
 *
 * Restores missing apostrophes in common contractions that OCR often misses.
 * Uses pattern matching to detect contractions without apostrophes.
 *
 * Ported from text_corrections.py
 */

export function restoreApostrophes(text: string): string {
  // Common contractions with 't (not)
  text = text.replace(/\baint\b/gi, "ain't");
  text = text.replace(/\barent\b/gi, "aren't");
  text = text.replace(/\bcant\b/gi, "can't");
  text = text.replace(/\bcouldnt\b/gi, "couldn't");
  text = text.replace(/\bdidnt\b/gi, "didn't");
  text = text.replace(/\bdoesnt\b/gi, "doesn't");
  text = text.replace(/\bdont\b/gi, "don't");
  text = text.replace(/\bhadnt\b/gi, "hadn't");
  text = text.replace(/\bhasnt\b/gi, "hasn't");
  text = text.replace(/\bhavent\b/gi, "haven't");
  text = text.replace(/\bisnt\b/gi, "isn't");
  text = text.replace(/\bmightnt\b/gi, "mightn't");
  text = text.replace(/\bmustnt\b/gi, "mustn't");
  text = text.replace(/\bneednt\b/gi, "needn't");
  text = text.replace(/\bshant\b/gi, "shan't");
  text = text.replace(/\bshouldnt\b/gi, "shouldn't");
  text = text.replace(/\bwasnt\b/gi, "wasn't");
  text = text.replace(/\bwerent\b/gi, "weren't");
  text = text.replace(/\bwont\b/gi, "won't");
  text = text.replace(/\bwouldnt\b/gi, "wouldn't");

  // Contractions with 'm (am)
  text = text.replace(/\bIm\b/g, "I'm");

  // Contractions with 're (are)
  text = text.replace(/\btheyre\b/gi, "they're");
  text = text.replace(/\bwere\b(?=\s)/gi, "we're");
  text = text.replace(/\byoure\b/gi, "you're");

  // Contractions with 've (have)
  text = text.replace(/\bIve\b/g, "I've");
  text = text.replace(/\bcouldve\b/gi, "could've");
  text = text.replace(/\bmightve\b/gi, "might've");
  text = text.replace(/\bmustve\b/gi, "must've");
  text = text.replace(/\bshouldve\b/gi, "should've");
  text = text.replace(/\btheydve\b/gi, "they'd've");
  text = text.replace(/\btheyve\b/gi, "they've");
  text = text.replace(/\bweve\b/gi, "we've");
  text = text.replace(/\bwouldve\b/gi, "would've");
  text = text.replace(/\byouve\b/gi, "you've");

  // Contractions with 'll (will)
  text = text.replace(/\bIll\b/g, "I'll");
  text = text.replace(/\bhell\b/gi, "he'll");
  text = text.replace(/\bitll\b/gi, "it'll");
  text = text.replace(/\bshell\b/gi, "she'll");
  text = text.replace(/\btheyll\b/gi, "they'll");
  text = text.replace(/\bwell\b(?=\s)/gi, "we'll");
  text = text.replace(/\byoull\b/gi, "you'll");

  // Contractions with 'd (would/had)
  text = text.replace(/\bId\b/g, "I'd");
  text = text.replace(/\bhed\b/gi, "he'd");
  text = text.replace(/\bshed\b/gi, "she'd");
  text = text.replace(/\btheyd\b/gi, "they'd");
  text = text.replace(/\bwed\b/gi, "we'd");
  text = text.replace(/\byoud\b/gi, "you'd");

  // Contractions with 's (is/has)
  text = text.replace(/\bhes\b/gi, "he's");
  text = text.replace(/\bheres\b/gi, "here's");
  text = text.replace(/\bhows\b/gi, "how's");
  text = text.replace(/\bshes\b/gi, "she's");
  text = text.replace(/\bthats\b/gi, "that's");
  text = text.replace(/\btheres\b/gi, "there's");
  text = text.replace(/\bwhats\b/gi, "what's");
  text = text.replace(/\bwhens\b/gi, "when's");
  text = text.replace(/\bwheres\b/gi, "where's");
  text = text.replace(/\bwhos\b/gi, "who's");
  text = text.replace(/\bwhys\b/gi, "why's");

  // Other common contractions
  text = text.replace(/\blets\b/gi, "let's");
  text = text.replace(/\byall\b/gi, "y'all");
  text = text.replace(/\boclock\b/gi, "o'clock");

  return text;
}

/**
 * Fix common OCR errors, particularly | being misread as I
 */
export function fixOcrErrors(text: string): string {
  // Replace | followed by common contractions ('m, 've, 'll, 'd, etc.)
  text = text.replace(/\|'m\b/g, "I'm");
  text = text.replace(/\|'ve\b/g, "I've");
  text = text.replace(/\|'ll\b/g, "I'll");
  text = text.replace(/\|'d\b/g, "I'd");
  text = text.replace(/\|'re\b/g, "I're");

  // Replace | at the beginning of a sentence (after period, question mark, exclamation, or newline)
  text = text.replace(/([.!?\n]\s+)\|(\s+)/g, '$1I$2');

  // Replace | at the very beginning of text
  text = text.replace(/^\|\s+/, 'I ');

  // Replace | in the middle of sentences (when surrounded by spaces or followed by space and punctuation)
  text = text.replace(/(\s)\|(\s)/g, '$1I$2');

  // Replace | followed by space and then lowercase letter (common in middle of sentence)
  text = text.replace(/\|(\s+[a-z])/g, 'I$1');

  return text;
}
