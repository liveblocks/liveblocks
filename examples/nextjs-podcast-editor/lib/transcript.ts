import data from "./transcript-data.json";

/**
 * The episode's recording and its word-level transcript. Both are static: the
 * audio file never changes, and editing the episode only decides which words
 * (and so which slices of audio) are kept. Those decisions live in Liveblocks
 * Storage (see `liveblocks.config.ts`).
 */

export const AUDIO_URL = "/episode.mp3";

export const SHOW_NAME = "Latency";
export const EPISODE_NUMBER = 42;

export type Speaker = {
  id: string;
  name: string;
  color: string;
};

export type Word = {
  index: number;
  id: string;
  text: string;
  // When the word is spoken, in seconds of the original recording.
  start: number;
  end: number;
  paragraph: number;
  filler: boolean;
};

export type Paragraph = {
  id: string;
  index: number;
  speakerId: string;
  words: Word[];
};

// "Um" and "uh" carry no meaning, so they can be removed in one click.
const FILLERS = new Set(["um", "uh", "uhm", "er", "erm", "ah", "hmm"]);

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z']/g, "");
}

export const ORIGINAL_DURATION = data.duration;

export const SPEAKERS: Speaker[] = data.speakers;

export const WORDS: Word[] = [];

export const PARAGRAPHS: Paragraph[] = data.paragraphs.map(
  (paragraph, paragraphIndex) => {
    const words = paragraph.words.map((word) => {
      const index = WORDS.length;
      const item: Word = {
        index,
        id: `w${index}`,
        text: word.t,
        start: word.s,
        end: word.e,
        paragraph: paragraphIndex,
        filler: FILLERS.has(normalize(word.t)),
      };
      WORDS.push(item);
      return item;
    });
    return {
      id: paragraph.id,
      index: paragraphIndex,
      speakerId: paragraph.speaker,
      words,
    };
  }
);

export const FILLER_WORDS = WORDS.filter((word) => word.filler);

/**
 * The slice of audio each word owns. Silences are split down the middle
 * between the words on either side, so cutting a word also removes half of
 * the pauses around it and the words left behind still breathe naturally.
 */
export const SPAN_STARTS: number[] = WORDS.map((word, index) =>
  index === 0 ? 0 : (WORDS[index - 1].end + word.start) / 2
);

export function spanStart(index: number) {
  return SPAN_STARTS[index];
}

export function spanEnd(index: number) {
  return index + 1 < WORDS.length ? SPAN_STARTS[index + 1] : ORIGINAL_DURATION;
}

/** The word whose audio slice contains `time` (original seconds). */
export function wordAtTime(time: number) {
  let low = 0;
  let high = WORDS.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (SPAN_STARTS[middle] <= time) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

export function getSpeaker(id: string): Speaker {
  return SPEAKERS.find((speaker) => speaker.id === id) ?? SPEAKERS[0];
}

/** The text of a range of words, e.g. to quote it in a comment. */
export function excerpt(start: number, end: number, maxWords = 14) {
  const words = WORDS.slice(start, end + 1).map((word) => word.text);
  const text =
    words.length > maxWords
      ? `${words.slice(0, maxWords).join(" ")}…`
      : words.join(" ");
  return text.replace(/[,.;:]$/, "");
}

export function wordId(index: number) {
  return `w${index}`;
}
