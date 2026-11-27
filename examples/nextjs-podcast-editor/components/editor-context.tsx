"use client";

import {
  useMutation,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AudioEngine } from "@/lib/audio-engine";
import { buildTimeline, type Timeline } from "@/lib/timeline";
import {
  AUDIO_URL,
  FILLER_WORDS,
  getSpeaker,
  WORDS,
  wordAtTime,
  wordId,
} from "@/lib/transcript";

export type WordRange = { start: number; end: number };

export type PanelTab = "comments" | "chapters";

type EditorContextValue = {
  engine: AudioEngine;
  timeline: Timeline;
  // Indices of the words cut from the episode.
  cuts: ReadonlySet<number>;
  speakerName: (speakerId: string) => string;

  // The words selected in the transcript (also shared through presence).
  selection: WordRange | null;
  setSelection: (selection: WordRange | null) => void;
  // A comment being written about a range of words, before it's posted.
  draft: WordRange | null;
  setDraft: Dispatch<SetStateAction<WordRange | null>>;
  activeThreadId: string | null;
  setActiveThreadId: Dispatch<SetStateAction<string | null>>;
  hoveredThreadId: string | null;
  setHoveredThreadId: Dispatch<SetStateAction<string | null>>;
  // Highlights every filler word, while hovering "Remove filler words".
  previewFillers: boolean;
  setPreviewFillers: Dispatch<SetStateAction<boolean>>;
  showCuts: boolean;
  setShowCuts: Dispatch<SetStateAction<boolean>>;
  panel: PanelTab;
  setPanel: Dispatch<SetStateAction<PanelTab>>;
  // The side panel is docked on wide screens and a slide-over below that.
  panelOpen: boolean;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;

  /** Cuts a range of words, or restores it when it's already all cut. */
  toggleCut: (range: WordRange) => void;
  cutFillers: () => void;
  restoreAll: () => void;
  seekToWord: (index: number) => void;
  startComment: (range: WordRange) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used inside <EditorProvider>");
  }
  return context;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => new AudioEngine());
  const updateMyPresence = useUpdateMyPresence();

  const cutsMap = useStorage((root) => root.cuts);
  const speakerNames = useStorage((root) => root.speakerNames);

  const cuts = useMemo(() => {
    const indices = new Set<number>();
    for (const key of Object.keys(cutsMap)) {
      indices.add(Number(key.slice(1)));
    }
    return indices;
  }, [cutsMap]);

  const timeline = useMemo(
    () => buildTimeline((index) => cuts.has(index)),
    [cuts]
  );

  useEffect(() => {
    void engine.load(AUDIO_URL);
    return () => engine.pause();
  }, [engine]);

  // Cuts made by anyone take effect right away, even mid-playback.
  useEffect(() => {
    engine.setTimeline(timeline);
  }, [engine, timeline]);

  // Share the playhead: immediately when playback starts, stops or seeks,
  // and ~10 times a second while playing (others animate between updates).
  useEffect(() => {
    let lastSentAt = 0;
    let lastPlaying = false;
    let lastPosition = -1;
    return engine.subscribe(() => {
      const playing = engine.isPlaying();
      const position = engine.getPosition();
      const now = performance.now();
      if (
        playing !== lastPlaying ||
        (!playing && position !== lastPosition) ||
        now - lastSentAt > 100
      ) {
        updateMyPresence({
          playhead: Math.round(position * 1000) / 1000,
          playing,
        });
        lastSentAt = now;
        lastPlaying = playing;
        lastPosition = position;
      }
    });
  }, [engine, updateMyPresence]);

  const [selection, setSelectionState] = useState<WordRange | null>(null);
  const selectionRef = useRef<WordRange | null>(null);
  const setSelection = useCallback(
    (next: WordRange | null) => {
      const current = selectionRef.current;
      if (current?.start === next?.start && current?.end === next?.end) {
        return;
      }
      selectionRef.current = next;
      setSelectionState(next);
      updateMyPresence({ selection: next });
    },
    [updateMyPresence]
  );

  const [draft, setDraft] = useState<WordRange | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [previewFillers, setPreviewFillers] = useState(false);
  const [showCuts, setShowCuts] = useState(true);
  const [panel, setPanel] = useState<PanelTab>("comments");
  const [panelOpen, setPanelOpen] = useState(false);

  const setCut = useMutation(
    ({ storage, self }, indices: number[], cut: boolean) => {
      const liveCuts = storage.get("cuts");
      for (const index of indices) {
        if (cut) {
          liveCuts.set(wordId(index), self.id);
        } else {
          liveCuts.delete(wordId(index));
        }
      }
    },
    []
  );

  const toggleCut = useCallback(
    (range: WordRange) => {
      const indices: number[] = [];
      for (let index = range.start; index <= range.end; index++) {
        indices.push(index);
      }
      const allCut = indices.every((index) => cuts.has(index));
      setCut(
        allCut ? indices : indices.filter((index) => !cuts.has(index)),
        !allCut
      );
    },
    [cuts, setCut]
  );

  const cutFillers = useCallback(() => {
    setCut(
      FILLER_WORDS.filter((word) => !cuts.has(word.index)).map(
        (word) => word.index
      ),
      true
    );
  }, [cuts, setCut]);

  const restoreAll = useCallback(() => {
    setCut([...cuts], false);
  }, [cuts, setCut]);

  const seekToWord = useCallback(
    (index: number) => {
      engine.seek(WORDS[index].start);
    },
    [engine]
  );

  const startComment = useCallback((range: WordRange) => {
    setDraft(range);
    setActiveThreadId(null);
    setPanel("comments");
    setPanelOpen(true);
  }, []);

  const speakerName = useCallback(
    (speakerId: string) =>
      speakerNames[speakerId] || getSpeaker(speakerId).name,
    [speakerNames]
  );

  const value: EditorContextValue = {
    engine,
    timeline,
    cuts,
    speakerName,
    selection,
    setSelection,
    draft,
    setDraft,
    activeThreadId,
    setActiveThreadId,
    hoveredThreadId,
    setHoveredThreadId,
    previewFillers,
    setPreviewFillers,
    showCuts,
    setShowCuts,
    panel,
    setPanel,
    panelOpen,
    setPanelOpen,
    toggleCut,
    cutFillers,
    restoreAll,
    seekToWord,
    startComment,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

/** Whether the recording has loaded, and whether it's playing. */
export function usePlayerState() {
  const { engine } = useEditor();
  const status = useSyncExternalStore(
    engine.subscribe,
    engine.getStatus,
    engine.getStatus
  );
  const playing = useSyncExternalStore(
    engine.subscribe,
    engine.isPlaying,
    engine.isPlaying
  );
  return { status, playing };
}

/**
 * The playhead in edited seconds. Updates every animation frame while
 * playing, so only use it in small components.
 */
export function useEditedPosition() {
  const { engine } = useEditor();
  return useSyncExternalStore(
    engine.subscribe,
    engine.getEditedPosition,
    engine.getEditedPosition
  );
}

/** The word under the playhead. Only changes from one word to the next. */
export function useCurrentWord() {
  const { engine } = useEditor();
  const getSnapshot = useCallback(
    () => wordAtTime(engine.getPosition()),
    [engine]
  );
  return useSyncExternalStore(engine.subscribe, getSnapshot, getSnapshot);
}
