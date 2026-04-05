'use client';

import { UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useFeedImagePool, type FeedImageItem } from '@/hooks/useFeedImagePool';

type Difficulty = 'easy' | 'medium' | 'hard';
type PuzzleMode = 'timed' | 'collage';

type Piece = {
  id: string;
  boardIndex: number;
  imageId: string;
  imageTitle: string;
  imageUrl: string;
  row: number;
  col: number;
  rows: number;
  cols: number;
  number: number;
};

const splitConfig: Record<9 | 18 | 36, { rows: number; cols: number }> = {
  9: { rows: 3, cols: 3 },
  18: { rows: 3, cols: 6 },
  36: { rows: 6, cols: 6 },
};

const timedRules: Record<Difficulty, { pieces: 9 | 18 | 36; seconds: number; label: string }> = {
  easy: { pieces: 9, seconds: 150, label: 'Facil 3x3' },
  medium: { pieces: 18, seconds: 240, label: 'Intermedio 3x6' },
  hard: { pieces: 36, seconds: 390, label: 'Avanzado 6x6' },
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPiecesFromImage(image: FeedImageItem, split: 9 | 18 | 36, boardOffset = 0): Piece[] {
  const { rows, cols } = splitConfig[split];
  const pieces: Piece[] = [];
  let cursor = boardOffset;
  const sessionId = Math.random().toString(36).slice(2, 9);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      pieces.push({
        id: `${image.id}-${row}-${col}-${boardOffset}-${sessionId}`,
        boardIndex: cursor,
        imageId: image.id,
        imageTitle: image.title,
        imageUrl: image.url,
        row,
        col,
        rows,
        cols,
        number: cursor + 1,
      });
      cursor += 1;
    }
  }

  return pieces;
}

function minutes(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function collageLayoutColumns(imageCount: number): number {
  if (imageCount >= 4) return 2;
  if (imageCount === 2) return 2;
  return 1;
}

function buildCollagePieces(
  selectedImages: FeedImageItem[],
  splitsByImage: Record<string, 9 | 18 | 36>,
): { pieces: Piece[]; boardColumns: number } {
  const imageIds = selectedImages.map((image) => image.id);
  const layoutCols = collageLayoutColumns(imageIds.length);
  const layoutRows = Math.ceil(imageIds.length / Math.max(1, layoutCols));

  const rowHeights = Array.from({ length: layoutRows }, () => 0);
  const colWidths = Array.from({ length: layoutCols }, () => 0);

  imageIds.forEach((imageId, index) => {
    const split = splitsByImage[imageId] ?? 9;
    const dims = splitConfig[split];
    const rowIndex = Math.floor(index / layoutCols);
    const colIndex = index % layoutCols;
    rowHeights[rowIndex] = Math.max(rowHeights[rowIndex], dims.rows);
    colWidths[colIndex] = Math.max(colWidths[colIndex], dims.cols);
  });

  const rowOffsets: number[] = [];
  let rowCursor = 0;
  rowHeights.forEach((height) => {
    rowOffsets.push(rowCursor);
    rowCursor += height;
  });

  const colOffsets: number[] = [];
  let colCursor = 0;
  colWidths.forEach((width) => {
    colOffsets.push(colCursor);
    colCursor += width;
  });

  const boardColumns = Math.max(1, colCursor);
  const pieces: Piece[] = [];
  const sessionId = Math.random().toString(36).slice(2, 9);

  selectedImages.forEach((image, index) => {
    const split = splitsByImage[image.id] ?? 9;
    const dims = splitConfig[split];
    const layoutRow = Math.floor(index / layoutCols);
    const layoutCol = index % layoutCols;
    const startRow = rowOffsets[layoutRow];
    const startCol = colOffsets[layoutCol];

    for (let row = 0; row < dims.rows; row += 1) {
      for (let col = 0; col < dims.cols; col += 1) {
        const boardIndex = (startRow + row) * boardColumns + (startCol + col);
        pieces.push({
          id: `${image.id}-${row}-${col}-${boardIndex}-${sessionId}`,
          boardIndex,
          imageId: image.id,
          imageTitle: image.title,
          imageUrl: image.url,
          row,
          col,
          rows: dims.rows,
          cols: dims.cols,
          number: boardIndex + 1,
        });
      }
    }
  });

  return { pieces, boardColumns };
}

// ─── Spring preset for tile swaps ────────────────────────────────────────────
const swapSpring = { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.85 };

export default function FeedPuzzleGame() {
  const { images, loading, error, loadMore, hasMore, loadingMore } = useFeedImagePool(72);

  const [mode, setMode] = useState<PuzzleMode>('timed');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timedImage, setTimedImage] = useState<FeedImageItem | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [splitByImage, setSplitByImage] = useState<Record<string, 9 | 18 | 36>>({});

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [slots, setSlots] = useState<Array<string | null>>([]);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [showWinAlert, setShowWinAlert] = useState(false);
  const [showLoseAlert, setShowLoseAlert] = useState(false);
  const [moves, setMoves] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // selectedCollageIndex tracks which slot is awaiting its swap partner
  const [selectedCollageIndex, setSelectedCollageIndex] = useState<number | null>(null);

  const [showImageSearch, setShowImageSearch] = useState(false);
  const [isImageSearchLoading, setIsImageSearchLoading] = useState(false);
  const [visibleTimedSearchCount, setVisibleTimedSearchCount] = useState(18);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [collagePage, setCollagePage] = useState(0);
  const [collageBoardColumns, setCollageBoardColumns] = useState(3);

  const boardContainerRef = useRef<HTMLDivElement>(null);

  const maxSelectable = 4;

  const pieceMap = useMemo(() => {
    const map = new Map<string, Piece>();
    pieces.forEach((piece) => map.set(piece.id, piece));
    return map;
  }, [pieces]);

  const selectedImages = useMemo(
    () =>
      selectedIds
        .map((id) => images.find((image) => image.id === id))
        .filter((image): image is FeedImageItem => Boolean(image))
        .slice(0, maxSelectable),
    [images, selectedIds],
  );
  const visibleTimedSearchImages = useMemo(
    () => images.slice(0, visibleTimedSearchCount),
    [images, visibleTimedSearchCount],
  );
  const collageBatchSize = 4;
  const visibleCollageImages = useMemo(() => {
    const start = collagePage * collageBatchSize;
    return images.slice(start, start + collageBatchSize);
  }, [collagePage, images]);
  const collageReferencePieces = useMemo(
    () => [...pieces].sort((a, b) => a.boardIndex - b.boardIndex),
    [pieces],
  );
  const referenceImage = useMemo(
    () => (mode === 'collage' ? selectedImages[0] ?? null : timedImage),
    [mode, selectedImages, timedImage],
  );

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || mode !== 'timed') return;
    if (secondsLeft <= 0) {
      setRunning(false);
      setLost(true);
      setShowLoseAlert(true);
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((v) => v - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, running, secondsLeft]);

  // ── Scroll to board when game starts ────────────────────────────────────
  useEffect(() => {
    if (running && boardContainerRef.current) {
      setTimeout(() => {
        boardContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [running]);

  // ── Win detection ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || !slots.length) return;
    const complete =
      mode === 'collage'
        ? slots.every((pieceId, index) => {
            if (index >= pieces.length) return pieceId === null;
            if (!pieceId) return false;
            return pieceMap.get(pieceId)?.boardIndex === index;
          })
        : slots.every((pieceId, index) => {
            if (!pieceId) return false;
            return pieceMap.get(pieceId)?.boardIndex === index;
          });
    if (complete) {
      setWon(true);
      setRunning(false);
      setShowWinAlert(true);
    }
  }, [mode, pieceMap, pieces.length, running, slots]);

  // ── Keyboard dismiss ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!showLoseAlert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLoseAlert(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showLoseAlert]);

  useEffect(() => {
    if (!showReferenceModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowReferenceModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showReferenceModal]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  async function isImageUsable(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async function pickRandomTimedImage(excludedIds: string[] = []): Promise<FeedImageItem | null> {
    const blocked = new Set(excludedIds);
    const candidates = shuffle(images.filter((i) => !blocked.has(i.id)));
    for (const candidate of candidates) {
      if (await isImageUsable(candidate.url)) return candidate;
    }
    return null;
  }

  async function toggleImageSearch() {
    if (isImageSearchLoading) return;
    if (showImageSearch) { setShowImageSearch(false); return; }
    setIsImageSearchLoading(true);
    setVisibleTimedSearchCount(18);
    setShowImageSearch(true);
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    setIsImageSearchLoading(false);
  }

  async function loadMoreTimedSearchImages() {
    if (isImageSearchLoading || loadingMore) return;
    if (visibleTimedSearchCount < images.length) {
      setVisibleTimedSearchCount((c) => Math.min(c + 18, images.length));
      return;
    }
    if (!hasMore) return;
    await loadMore();
    setVisibleTimedSearchCount((c) => c + 18);
  }

  function handleTimedSearchScroll(event: UIEvent<HTMLDivElement>) {
    if (isImageSearchLoading || loadingMore) return;
    const t = event.currentTarget;
    if (t.scrollTop + t.clientHeight >= t.scrollHeight - 24) {
      void loadMoreTimedSearchImages();
    }
  }

  function setupBoard(nextPieces: Piece[], initialSeconds: number) {
    const ids = nextPieces.map((p) => p.id);
    setPieces(nextPieces);
    setSlots(shuffle(uniqueIds(ids)));
    setMoves(0);
    setWon(false);
    setLost(false);
    setShowWinAlert(false);
    setShowLoseAlert(false);
    setSelectedCollageIndex(null);
    setSecondsLeft(initialSeconds);
    setRunning(true);
  }

  function setupCollageBoard(nextPieces: Piece[]) {
    const ids = nextPieces.map((p) => p.id);
    setPieces(nextPieces);
    setSlots(shuffle(uniqueIds(ids)));
    setMoves(0);
    setWon(false);
    setLost(false);
    setShowWinAlert(false);
    setShowLoseAlert(false);
    setSelectedCollageIndex(null);
    setSecondsLeft(0);
    setRunning(true);
  }

  async function startTimed() {
    let chosen = timedImage;
    if (!chosen) {
      chosen = await pickRandomTimedImage();
      if (!chosen) return;
      setTimedImage(chosen);
    }
    const rule = timedRules[difficulty];
    setupBoard(buildPiecesFromImage(chosen, rule.pieces, 0), rule.seconds);
  }

  function startCollage() {
    if (selectedImages.length < 2 || selectedImages.length % 2 !== 0) return;
    const effectiveSplits = selectedImages.reduce<Record<string, 9 | 18 | 36>>((acc, img) => {
      acc[img.id] = splitByImage[img.id] ?? 9;
      return acc;
    }, {});
    setSplitByImage((c) => ({ ...c, ...effectiveSplits }));
    const built = buildCollagePieces(selectedImages, effectiveSplits);
    setCollageBoardColumns(built.boardColumns);
    setupCollageBoard(built.pieces);
  }

  function resetCurrent() {
    setRunning(false);
    setWon(false);
    setLost(false);
    setPieces([]);
    setSlots([]);
    setMoves(0);
    setSecondsLeft(0);
    setShowWinAlert(false);
    setShowLoseAlert(false);
    setSelectedCollageIndex(null);
    setCollageBoardColumns(3);
  }

  async function restartCurrentGame() {
    setShowLoseAlert(false);
    setLost(false);
    if (mode === 'timed') { await startTimed(); return; }
    startCollage();
  }

  function toggleSelectImage(imageId: string) {
    setSelectedIds((current) => {
      if (current.includes(imageId)) return current.filter((id) => id !== imageId);
      if (current.length >= maxSelectable) return current;
      return [...current, imageId];
    });
    setSplitByImage((c) => ({ ...c, [imageId]: c[imageId] ?? 9 }));
  }

  // ── Core swap — always increments moves by exactly 1 ────────────────────
  function swapSlots(indexA: number, indexB: number) {
    if (indexA === indexB) return;
    setSlots((current) => {
      const next = [...current];
      [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
      return next;
    });
    setMoves((v) => v + 1);   // ← single increment, never called twice
  }

  // ── Slot click — does NOT call swapSlots inside a state updater ─────────
  function handleSlotClick(slotIndex: number) {
    // First click → select the slot
    if (selectedCollageIndex === null) {
      setSelectedCollageIndex(slotIndex);
      return;
    }
    // Second click on the same slot → deselect
    if (selectedCollageIndex === slotIndex) {
      setSelectedCollageIndex(null);
      return;
    }
    // Second click on a different slot → swap then clear selection
    swapSlots(selectedCollageIndex, slotIndex);
    setSelectedCollageIndex(null);
  }

  function startCurrentMode() {
    if (mode === 'timed') { void startTimed(); return; }
    startCollage();
  }

  const boardColumns = useMemo(() => {
    if (mode === 'collage') return Math.max(1, collageBoardColumns);
    const maxCols = Math.max(...pieces.map((p) => p.cols));
    return Math.min(maxCols || 3, 6);
  }, [collageBoardColumns, mode, pieces]);

  const tileSizeRem = mode === 'collage' ? 2.4 : 2.1;

  const correctCount = slots.reduce((acc, pieceId, index) => {
    if (!pieceId) return acc;
    return pieceMap.get(pieceId)?.boardIndex === index ? acc + 1 : acc;
  }, 0);

  const canStart =
    mode === 'timed'
      ? Boolean(images.length && timedImage)
      : selectedImages.length >= 2 && selectedImages.length % 2 === 0;

  // ── Shared puzzle tile renderer (used for both modes) ───────────────────
  function renderPuzzleGrid(slotsArr: Array<string | null>, columns: number, onSlotClick: (i: number) => void) {
    return (
      <LayoutGroup>
        <div
          className="grid w-full max-w-[min(92vw,44rem)] lg:max-w-xl place-content-center gap-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {slotsArr.map((pieceId, idx) => {
            const piece = pieceId ? pieceMap.get(pieceId) ?? null : null;
            const ok = pieceId ? piece?.boardIndex === idx : false;
            const selected = selectedCollageIndex === idx;

            return (
              <motion.div
                key={`slot-${idx}`}
                onClick={() => onSlotClick(idx)}
                whileTap={{ scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`relative aspect-square w-full border cursor-pointer overflow-hidden
                  ${selected
                    ? 'border-(--accent) ring-2 ring-(--accent)/60 z-10'
                    : pieceId
                      ? ok
                        ? 'border-emerald-400/50'
                        : 'border-amber-300/45'
                      : 'border-(--border) border-dashed'
                  }`}
              >
                <AnimatePresence mode="popLayout">
                  {piece && (
                    <motion.div
                      key={piece.id}
                      layoutId={piece.id}
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={swapSpring}
                      style={{
                        backgroundImage: `url(${piece.imageUrl})`,
                        backgroundSize: `${piece.cols * 100}% ${piece.rows * 100}%`,
                        backgroundPosition: `${(piece.col / Math.max(1, piece.cols - 1)) * 100}% ${(piece.row / Math.max(1, piece.rows - 1)) * 100}%`,
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Correct / selected overlay pulse */}
                {ok && !selected && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0.45 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    style={{ background: 'rgba(52,211,153,0.25)' }}
                  />
                )}
                {selected && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: [0.35, 0.65, 0.35] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ background: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="surface-panel-strong w-full min-w-0 overflow-x-hidden rounded-4xl p-4 sm:p-7">

      {/* ── Unified top control bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto min-w-0 text-xl font-black text-(--text) sm:text-2xl">
          Puzzle del Feed BTS
        </h3>

        {/* Mode toggles */}
        <button
          onClick={() => setMode('timed')}
          className={`rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors sm:text-xs
            ${mode === 'timed' ? 'bg-(--accent) text-white' : 'bg-(--surface-soft) text-(--text) hover:bg-(--border)'}`}
        >
          Con tiempo
        </button>
        <button
          onClick={() => setMode('collage')}
          className={`rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors sm:text-xs
            ${mode === 'collage' ? 'bg-(--accent) text-white' : 'bg-(--surface-soft) text-(--text) hover:bg-(--border)'}`}
        >
          Sin limite
        </button>

        {/* Iniciar */}
        {!running && (
          <motion.button
            onClick={startCurrentMode}
            disabled={!canStart}
            whileTap={{ scale: 0.94 }}
            className="rounded-xl bg-(--accent) px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-lg disabled:opacity-40 sm:text-xs"
          >
            Iniciar
          </motion.button>
        )}

        {/* Reset */}
        <button
          onClick={resetCurrent}
          className="rounded-xl bg-(--surface-soft) px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text) hover:bg-(--border) sm:text-xs"
        >
          Reset
        </button>

        {/* Cargar más (collage) */}
        {mode === 'collage' && (
          <button
            onClick={() =>
              setCollagePage((prev) =>
                (prev + 1) * collageBatchSize >= images.length ? prev : prev + 1,
              )
            }
            disabled={(collagePage + 1) * collageBatchSize >= images.length}
            className="rounded-xl bg-(--surface-soft) px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text) hover:bg-(--border) disabled:opacity-40 sm:text-xs"
          >
            + 4 imágenes
          </button>
        )}
      </div>

      {loading ? <p className="mt-3 text-sm text-(--muted)">Cargando imagenes del feed...</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {/* ── Mode-specific config ─────────────────────────────────────────── */}
      {mode === 'timed' ? (
        <div className="mt-5 space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {/* Difficulty */}
            <label className="block text-sm text-(--text)">
              <span className="mb-1 block font-semibold">Dificultad</span>
              <div
                className="relative"
                tabIndex={-1}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setShowDifficultyMenu(false);
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDifficultyMenu((v) => !v)}
                  className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 pr-10 text-left text-sm font-medium text-(--text) shadow-sm outline-none transition-colors hover:border-(--accent)/60 focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/25"
                >
                  {timedRules[difficulty].label}
                </button>
                <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-(--muted)">▼</span>
                <AnimatePresence>
                  {showDifficultyMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 mt-2 w-full rounded-xl border border-(--border) bg-[rgba(20,20,26,0.95)] p-2 shadow-xl backdrop-blur-sm"
                    >
                      {(Object.entries(timedRules) as [Difficulty, (typeof timedRules)[Difficulty]][]).map(
                        ([key, rule]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => { setDifficulty(key); setShowDifficultyMenu(false); }}
                            className={`mb-1 block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors last:mb-0
                              ${difficulty === key
                                ? 'border-(--accent) bg-(--accent)/20 text-(--text)'
                                : 'border-transparent bg-(--surface-soft) text-(--text) hover:border-(--accent)/50 hover:bg-(--border)'
                              }`}
                          >
                            {rule.label}
                          </button>
                        ),
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </label>

            {/* Image picker */}
            <div className="min-w-0">
              <p className="text-sm text-(--text)">Imagen seleccionada</p>
              <div className="mt-1 flex items-center gap-2">
                {timedImage ? (
                  <img
                    src={timedImage.url}
                    alt={timedImage.title}
                    className="h-10 w-10 rounded-lg border border-(--border) object-cover"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-(--border) bg-(--surface-soft)">
                    <p className="text-xs text-(--muted)">—</p>
                  </div>
                )}
                <button
                  onClick={() => void toggleImageSearch()}
                  disabled={isImageSearchLoading}
                  className="min-w-0 flex-1 rounded-lg bg-(--accent) px-3 py-2 text-xs font-semibold uppercase text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isImageSearchLoading ? 'Cargando...' : timedImage ? 'Cambiar' : 'Buscar imagen'}
                </button>
              </div>
              {timedImage && (
                <p className="mt-1 truncate text-[11px] text-(--muted)">{timedImage.title}</p>
              )}
            </div>
          </div>

          {/* Search grid */}
          <AnimatePresence>
            {showImageSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div
                  onScroll={handleTimedSearchScroll}
                  className="max-h-36 overflow-y-auto rounded-xl border border-(--border) bg-(--surface-soft) p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {isImageSearchLoading ? (
                    <div className="flex min-h-36 flex-col items-center justify-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-(--border) border-t-(--accent)" />
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--text)">
                        Cargando imágenes...
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* More columns → smaller thumbnails */}
                      <div className="grid gap-1.5 grid-cols-6 sm:grid-cols-9 lg:grid-cols-12">
                        {visibleTimedSearchImages.map((image) => (
                          <button
                            key={image.id}
                            onClick={() => { setTimedImage(image); setShowImageSearch(false); }}
                            className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all
                              ${timedImage?.id === image.id ? 'border-(--accent)' : 'border-(--border)'}`}
                            title={image.title}
                          >
                            <img src={image.url} alt={image.title} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-center">
                        <button
                          onClick={() => void loadMoreTimedSearchImages()}
                          disabled={
                            isImageSearchLoading ||
                            loadingMore ||
                            (!hasMore && visibleTimedSearchCount >= images.length)
                          }
                          className="rounded-lg bg-(--accent) px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {loadingMore || isImageSearchLoading
                            ? 'Cargando...'
                            : !hasMore && visibleTimedSearchCount >= images.length
                              ? 'No hay más imágenes'
                              : 'Cargar más'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ── Collage image selection ──────────────────────────────────── */
        <div className="mt-5 space-y-4">
          <p className="text-sm text-(--text)">
            Selecciona imágenes (mínimo 2, cantidad par).
          </p>
          {/* More columns → smaller thumbnails */}
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
            {visibleCollageImages.map((image) => {
              const checked = selectedIds.includes(image.id);
              return (
                <motion.button
                  key={image.id}
                  onClick={() => toggleSelectImage(image.id)}
                  whileTap={{ scale: 0.91 }}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all
                    ${checked ? 'border-(--accent) ring-2 ring-(--accent)' : 'border-(--border) hover:border-(--accent)/50'}`}
                >
                  <img src={image.url} alt={image.title} className="h-full w-full object-cover" />
                  {checked && (
                    <div className="absolute inset-0 grid place-items-center bg-black/35">
                      <span className="rounded-full bg-(--accent) px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">✓</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Puzzle board ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(running || won || lost) && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            ref={boardContainerRef}
            className="mx-auto mt-5 w-full max-w-7xl lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-stretch lg:gap-4"
          >
            {/* Left: shuffled puzzle */}
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Ordena el puzzle</p>
                <div className="text-xs text-(--muted)">
                  {mode === 'timed'
                    ? `Correctas: ${correctCount} / ${slots.length} · Tiempo: ${minutes(Math.max(0, secondsLeft))}`
                    : `Movimientos: ${moves}`}
                </div>
                <button
                  onClick={() => setShowReferenceModal(true)}
                  disabled={!referenceImage}
                  className="rounded-lg bg-(--accent) px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white disabled:opacity-40 lg:hidden"
                >
                  Referencia
                </button>
              </div>

              <div className="flex min-w-0 flex-col rounded-2xl border border-(--border) bg-(--surface-soft) p-2.5 min-h-72">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Puzzle mezclado</p>
                  <p className="text-xs text-(--muted)">Movimientos: {moves}</p>
                </div>
                <div className="flex flex-1 items-center justify-center overflow-auto">
                  {renderPuzzleGrid(slots, boardColumns, handleSlotClick)}
                </div>
              </div>
            </div>

            {/* Right: reference panel */}
            <div className="hidden min-w-0 flex-col rounded-2xl border border-(--border) bg-(--surface-soft) p-2.5 min-h-72 lg:flex">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Referencia</p>
                <button
                  onClick={() => setShowReferenceModal(true)}
                  disabled={!referenceImage}
                  className="rounded-lg bg-(--accent) px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white disabled:opacity-40"
                >
                  Ampliar
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto">
                {mode === 'collage' ? (
                  <div
                    className="grid w-fit place-content-center gap-0"
                    style={{
                      gridTemplateColumns: `repeat(${boardColumns}, ${tileSizeRem}rem)`,
                      gridAutoRows: `${tileSizeRem}rem`,
                    }}
                  >
                    {collageReferencePieces.map((piece) => (
                      <div
                        key={`ref-${piece.id}`}
                        className="relative shrink-0 border border-(--border)"
                        style={{
                          width: `${tileSizeRem}rem`,
                          height: `${tileSizeRem}rem`,
                          backgroundImage: `url(${piece.imageUrl})`,
                          backgroundSize: `${piece.cols * 100}% ${piece.rows * 100}%`,
                          backgroundPosition: `${(piece.col / Math.max(1, piece.cols - 1)) * 100}% ${(piece.row / Math.max(1, piece.rows - 1)) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                ) : referenceImage ? (
                  <div className="overflow-hidden rounded-xl border border-(--border)">
                    <img
                      src={referenceImage.url}
                      alt={referenceImage.title}
                      className="h-auto w-full object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reference modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReferenceModal && referenceImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowReferenceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-sm rounded-3xl border border-(--border) bg-[rgba(10,12,18,0.96)] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--muted)">Referencia</p>
                <button
                  onClick={() => setShowReferenceModal(false)}
                  className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/90 hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
              {mode === 'collage' ? (
                <div className="flex max-h-[70vh] items-center justify-center overflow-auto">
                  <div
                    className="grid w-fit place-content-center gap-0"
                    style={{
                      gridTemplateColumns: `repeat(${boardColumns}, ${tileSizeRem}rem)`,
                      gridAutoRows: `${tileSizeRem}rem`,
                    }}
                  >
                    {collageReferencePieces.map((piece) => (
                      <div
                        key={`modal-ref-${piece.id}`}
                        className="relative shrink-0 border border-(--border)"
                        style={{
                          width: `${tileSizeRem}rem`,
                          height: `${tileSizeRem}rem`,
                          backgroundImage: `url(${piece.imageUrl})`,
                          backgroundSize: `${piece.cols * 100}% ${piece.rows * 100}%`,
                          backgroundPosition: `${(piece.col / Math.max(1, piece.cols - 1)) * 100}% ${(piece.row / Math.max(1, piece.rows - 1)) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-(--border)">
                  <img
                    src={referenceImage.url}
                    alt={referenceImage.title}
                    className="h-auto w-full object-contain"
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Win banner ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {won && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-3xl border border-emerald-400/40 bg-emerald-500/15 p-4 text-sm text-emerald-100"
          >
            Puzzle completado. Movimientos: {moves}.{' '}
            {mode === 'timed'
              ? `Tiempo restante: ${minutes(Math.max(0, secondsLeft))}.`
              : 'Modo collage finalizado.'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Win alert modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWinAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={swapSpring}
              className="w-full max-w-md rounded-3xl border border-emerald-400/40 bg-[rgba(10,15,18,0.95)] p-6 text-center"
            >
              <p className="text-3xl font-black text-emerald-200">Ganaste</p>
              <p className="mt-3 text-sm text-white/80">
                Completaste el puzzle en {moves} movimientos
                {mode === 'timed' ? ` con ${minutes(Math.max(0, secondsLeft))} restante.` : '.'}
              </p>
              <button
                onClick={() => setShowWinAlert(false)}
                className="mt-6 rounded-xl bg-(--accent) px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lose alert modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLoseAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Tiempo agotado"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={swapSpring}
              className="w-full max-w-md rounded-3xl border border-rose-400/40 bg-[rgba(22,10,14,0.95)] p-6 text-center"
            >
              <div className="mb-2 flex justify-end">
                <button
                  onClick={() => setShowLoseAlert(false)}
                  className="rounded-lg bg-white/10 px-2 py-1 text-sm text-white/90 hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
              <p className="text-3xl font-black text-rose-200">Tiempo agotado</p>
              <p className="mt-3 text-sm text-white/80">
                Se acabó el tiempo. Puedes reiniciar o cerrar.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => void restartCurrentGame()}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                >
                  Reiniciar
                </button>
                <button
                  onClick={() => setShowLoseAlert(false)}
                  className="rounded-xl bg-(--surface-soft) px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--text)"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}