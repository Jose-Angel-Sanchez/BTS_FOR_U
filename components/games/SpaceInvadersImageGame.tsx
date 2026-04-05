'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Minimize, Pause, Play, RefreshCw, RotateCcw } from 'lucide-react';
import { useFeedImagePool } from '@/hooks/useFeedImagePool';

type Brick = {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  glyph: string;
};

type Paddle = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Ball = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

type GameState = {
  paddle: Paddle;
  ball: Ball;
  bricks: Brick[];
  particles: Particle[];
  score: number;
  lives: number;
  won: boolean;
  gameOver: boolean;
};

const BASE_W = 800;
const BASE_H = 520;
const INITIAL_LIVES = 3;
const BRICK_ROWS = 6;
const BRICK_COLS = 12;
const BRICK_GAP = 6;
const BRICK_TOP = 48;
const BRICK_SIDE_MARGIN = 10;
const PADDLE_W = 120;
const PADDLE_H = 12;
const PADDLE_BOTTOM_GAP = 20;
const BALL_R = 7;
const BASE_BALL_SPEED = 330;
const MAX_BOUNCE_ANGLE = (75 * Math.PI) / 180;
const PADDLE_SPEED = 560;
const GLYPHS = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ'];

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? 'ア';
}

function getBrickLayout(boardW: number) {
  if (boardW < 640) {
    return { rows: BRICK_ROWS, cols: BRICK_COLS, h: 8, gap: 2, top: 34, side: 8 };
  }
  return { rows: BRICK_ROWS, cols: BRICK_COLS, h: 20, gap: BRICK_GAP, top: BRICK_TOP, side: BRICK_SIDE_MARGIN };
}

function getMobileScale(boardW: number) {
  if (boardW < 640) {
    return { paddle: 0.62, paddleH: 0.46, ball: 0.5 };
  }
  return { paddle: 1, paddleH: 1, ball: 1 };
}

function getBallSpeed(boardW: number) {
  return boardW < 640 ? BASE_BALL_SPEED * 0.38 : BASE_BALL_SPEED;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createBricks(boardW: number): Brick[] {
  const { rows, cols, h, gap, top, side } = getBrickLayout(boardW);
  const totalGap = (cols - 1) * gap;
  const available = Math.max(0, boardW - side * 2 - totalGap - 1);
  const w = available / cols;
  const bricks: Brick[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      bricks.push({
        x: side + col * (w + gap),
        y: top + row * (h + gap),
        w,
        h,
        active: true,
        glyph: randomGlyph(),
      });
    }
  }

  return bricks;
}

function createInitialState(boardW: number, boardH: number): GameState {
  const wRatio = boardW / BASE_W;
  const hRatio = boardH / BASE_H;
  const scale = getMobileScale(boardW);
  const paddleW = PADDLE_W * wRatio * scale.paddle;
  const paddleH = PADDLE_H * hRatio * scale.paddleH;
  const ballR = BALL_R * wRatio * scale.ball;
  const ballSpeed = getBallSpeed(boardW);

  const paddle: Paddle = {
    x: boardW / 2 - paddleW / 2,
    y: boardH - paddleH - PADDLE_BOTTOM_GAP * hRatio,
    w: paddleW,
    h: paddleH,
  };

  const ball: Ball = {
    x: paddle.x + paddle.w / 2,
    y: paddle.y - ballR - 2,
    r: ballR,
    vx: ballSpeed * Math.sin(0.22),
    vy: -ballSpeed * Math.cos(0.22),
  };

  return {
    paddle,
    ball,
    bricks: createBricks(boardW),
    particles: [],
    score: 0,
    lives: INITIAL_LIVES,
    won: false,
    gameOver: false,
  };
}

function normalizeVelocity(ball: Ball, targetSpeed: number) {
  const speed = Math.hypot(ball.vx, ball.vy) || targetSpeed;
  ball.vx = (ball.vx / speed) * targetSpeed;
  ball.vy = (ball.vy / speed) * targetSpeed;
}

export default function SpaceInvadersImageGame() {
  const { images } = useFeedImagePool(60);

  const [imageIdx, setImageIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [boardW, setBoardW] = useState(BASE_W);
  const [boardH, setBoardH] = useState(BASE_H);
  const [backgroundVersion, setBackgroundVersion] = useState(0);

  const [scoreView, setScoreView] = useState(0);
  const [livesView, setLivesView] = useState(INITIAL_LIVES);
  const [wonView, setWonView] = useState(false);
  const [overView, setOverView] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gameRef = useRef<GameState>(createInitialState(BASE_W, BASE_H));
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const moveLeftRef = useRef(false);
  const moveRightRef = useRef(false);
  const sizeRef = useRef({ w: BASE_W, h: BASE_H });

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const image = images[imageIdx] ?? null;

  useEffect(() => {
    if (!image?.url) {
      backgroundRef.current = null;
      setBackgroundVersion((v) => v + 1);
      return;
    }
    const img = new Image();
    img.src = image.url;
    img.onload = () => {
      backgroundRef.current = img;
      setBackgroundVersion((v) => v + 1);
    };
    img.onerror = () => {
      backgroundRef.current = null;
      setBackgroundVersion((v) => v + 1);
    };
  }, [image]);

  useEffect(() => {
    const onFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (document.fullscreenElement && boardRef.current) {
        setBoardW(window.innerWidth);
        setBoardH(window.innerHeight);
        return;
      }

      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const styles = window.getComputedStyle(wrapperRef.current);
      const padLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const padRight = Number.parseFloat(styles.paddingRight) || 0;
      const contentW = Math.max(180, rect.width - padLeft - padRight);
      const maxW = Math.max(180, Math.min(contentW, window.innerWidth));
      const ratio = BASE_H / BASE_W;
      const isMobile = window.innerWidth < 640;
      const newW = isMobile ? Math.min(maxW, 520) : clamp(maxW, 280, 620);
      setBoardW(newW);
      setBoardH(newW * ratio);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const g = gameRef.current;
    const prev = sizeRef.current;
    const wRatio = boardW / prev.w;
    const hRatio = boardH / prev.h;
    const scale = getMobileScale(boardW);
    const ballSpeed = getBallSpeed(boardW);

    g.paddle.w = clamp(PADDLE_W * (boardW / BASE_W) * scale.paddle, 34, boardW * 0.35);
    g.paddle.h = PADDLE_H * hRatio * scale.paddleH;
    g.paddle.y = boardH - g.paddle.h - PADDLE_BOTTOM_GAP * hRatio;
    g.paddle.x = clamp(g.paddle.x * wRatio, 0, boardW - g.paddle.w);

    g.ball.r = clamp(BALL_R * (boardW / BASE_W) * scale.ball, 2.5, 10);
    g.ball.x = clamp(g.ball.x * wRatio, g.ball.r, boardW - g.ball.r);
    g.ball.y = clamp(g.ball.y * hRatio, g.ball.r, boardH - g.ball.r);
    normalizeVelocity(g.ball, ballSpeed);

    if (!started) {
      g.ball.x = g.paddle.x + g.paddle.w / 2;
      g.ball.y = g.paddle.y - g.ball.r - 2;
      g.ball.vx = ballSpeed * Math.sin(0.22);
      g.ball.vy = -ballSpeed * Math.cos(0.22);
    }

    g.bricks = createBricks(boardW).map((nextBrick, idx) => ({
      ...nextBrick,
      active: g.bricks[idx]?.active ?? true,
      glyph: g.bricks[idx]?.glyph ?? nextBrick.glyph,
    }));

    sizeRef.current = { w: boardW, h: boardH };
  }, [boardW, boardH, started]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft') moveLeftRef.current = true;
      if (event.code === 'ArrowRight') moveRightRef.current = true;

      if (event.code === 'Space') {
        event.preventDefault();
        if (!started && !wonView && !overView) {
          startGame();
        } else if (started) {
          setRunning((v) => !v);
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft') moveLeftRef.current = false;
      if (event.code === 'ArrowRight') moveRightRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [started, wonView, overView]);

  const spawnBrickParticles = (g: GameState, brick: Brick) => {
    const burst = 14;
    for (let i = 0; i < burst; i += 1) {
      const angle = (Math.PI * 2 * i) / burst + (Math.random() - 0.5) * 0.2;
      const speed = 70 + Math.random() * 110;
      g.particles.push({
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.25,
        maxLife: 0.4 + Math.random() * 0.25,
        size: 1.5 + Math.random() * 2.8,
      });
    }
  };

  const update = (dt: number) => {
    const g = gameRef.current;
    if (g.gameOver || g.won) return;
    const ballSpeed = getBallSpeed(boardW);

    if (moveLeftRef.current && !moveRightRef.current) {
      g.paddle.x -= PADDLE_SPEED * dt;
    } else if (moveRightRef.current && !moveLeftRef.current) {
      g.paddle.x += PADDLE_SPEED * dt;
    }
    g.paddle.x = clamp(g.paddle.x, 0, boardW - g.paddle.w);

    const speed = Math.hypot(g.ball.vx, g.ball.vy);
    const maxMove = g.ball.r * 0.45;
    const steps = Math.max(1, Math.ceil((speed * dt) / Math.max(1, maxMove)));
    const subDt = dt / steps;

    for (let step = 0; step < steps; step += 1) {
      g.ball.x += g.ball.vx * subDt;
      g.ball.y += g.ball.vy * subDt;

      if (g.ball.x - g.ball.r <= 0) {
        g.ball.x = g.ball.r;
        g.ball.vx = Math.abs(g.ball.vx);
      } else if (g.ball.x + g.ball.r >= boardW) {
        g.ball.x = boardW - g.ball.r;
        g.ball.vx = -Math.abs(g.ball.vx);
      }

      if (g.ball.y - g.ball.r <= 0) {
        g.ball.y = g.ball.r;
        g.ball.vy = Math.abs(g.ball.vy);
      }

      const ballLeft = g.ball.x - g.ball.r;
      const ballRight = g.ball.x + g.ball.r;
      const ballTop = g.ball.y - g.ball.r;
      const ballBottom = g.ball.y + g.ball.r;

      const p = g.paddle;
      const paddleHit =
        ballRight >= p.x &&
        ballLeft <= p.x + p.w &&
        ballBottom >= p.y &&
        ballTop <= p.y + p.h &&
        g.ball.vy > 0;

      if (paddleHit) {
        const rel = clamp((g.ball.x - (p.x + p.w / 2)) / (p.w / 2), -1, 1);
        const angle = rel * MAX_BOUNCE_ANGLE;
        g.ball.x = clamp(g.ball.x, p.x + g.ball.r, p.x + p.w - g.ball.r);
        g.ball.y = p.y - g.ball.r - 0.5;
        g.ball.vx = ballSpeed * Math.sin(angle);
        g.ball.vy = -Math.abs(ballSpeed * Math.cos(angle));
      }

      let hitBrick = false;
      for (let i = 0; i < g.bricks.length; i += 1) {
        const b = g.bricks[i];
        if (!b.active) continue;

        const overlap =
          ballRight >= b.x &&
          ballLeft <= b.x + b.w &&
          ballBottom >= b.y &&
          ballTop <= b.y + b.h;

        if (!overlap) continue;

        b.active = false;
        spawnBrickParticles(g, b);
        g.score += 10;
        setScoreView(g.score);

        const overlapLeft = Math.abs(ballRight - b.x);
        const overlapRight = Math.abs(b.x + b.w - ballLeft);
        const overlapTop = Math.abs(ballBottom - b.y);
        const overlapBottom = Math.abs(b.y + b.h - ballTop);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapLeft) {
          g.ball.x = b.x - g.ball.r;
          g.ball.vx = -Math.abs(g.ball.vx);
        } else if (minOverlap === overlapRight) {
          g.ball.x = b.x + b.w + g.ball.r;
          g.ball.vx = Math.abs(g.ball.vx);
        } else if (minOverlap === overlapTop) {
          g.ball.y = b.y - g.ball.r;
          g.ball.vy = -Math.abs(g.ball.vy);
        } else {
          g.ball.y = b.y + b.h + g.ball.r;
          g.ball.vy = Math.abs(g.ball.vy);
        }

        normalizeVelocity(g.ball, ballSpeed);
        hitBrick = true;
        break;
      }

      if (hitBrick) {
        const remaining = g.bricks.some((b) => b.active);
        if (!remaining) {
          g.won = true;
          setWonView(true);
          setRunning(false);
        }
      }

      if (g.ball.y - g.ball.r > boardH) {
        g.lives -= 1;
        setLivesView(g.lives);

        if (g.lives <= 0) {
          g.gameOver = true;
          setOverView(true);
          setRunning(false);
          break;
        }

        g.paddle.x = boardW / 2 - g.paddle.w / 2;
        g.ball.x = g.paddle.x + g.paddle.w / 2;
        g.ball.y = g.paddle.y - g.ball.r - 2;
        g.ball.vx = ballSpeed * Math.sin(0.2);
        g.ball.vy = -ballSpeed * Math.cos(0.2);
        break;
      }
    }

    if (g.particles.length > 0) {
      g.particles = g.particles
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx * dt,
          y: particle.y + particle.vy * dt,
          vy: particle.vy + 380 * dt,
          life: particle.life - dt,
        }))
        .filter((particle) => particle.life > 0);
    }
  };

  const drawBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const drawPaddle = (ctx: CanvasRenderingContext2D, paddle: Paddle) => {
    ctx.fillStyle = '#8f3ac4';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  };

  const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[]) => {
    for (const brick of bricks) {
      if (!brick.active) continue;
      ctx.fillStyle = '#f4f4f6';
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      ctx.strokeStyle = 'rgba(20,20,25,0.25)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);

       ctx.fillStyle = 'rgba(22,16,36,0.72)';
       ctx.font = `bold ${Math.max(10, brick.h * 0.64)}px ui-sans-serif, system-ui`;
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText(brick.glyph, brick.x + brick.w / 2, brick.y + brick.h / 2 + 0.5);
       ctx.textAlign = 'start';
       ctx.textBaseline = 'alphabetic';
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#f4f4f6';
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  };

  const drawUI = (ctx: CanvasRenderingContext2D, g: GameState) => {
    const panelW = 156;
    const panelX = boardW - panelW - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(panelX, 10, panelW, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.fillText(`Puntos ${g.score}`, panelX + 8, 27 - 8);
    ctx.fillText(`Vidas ${g.lives}`, panelX + 86, 27 - 8);

    if (!started) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(boardW / 2 - 145, boardH / 2 - 24, 290, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Presiona Iniciar', boardW / 2, boardH / 2 + 6);
      ctx.textAlign = 'start';
    }

    if (g.won || g.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, boardW, boardH);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 30px ui-sans-serif, system-ui';
      ctx.fillText(g.won ? 'You Win' : 'Game Over', boardW / 2, boardH / 2);
      ctx.font = '14px ui-sans-serif, system-ui';
      ctx.fillText('Use restart control to play again', boardW / 2, boardH / 2 + 24);
      ctx.textAlign = 'start';
    }
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const img = backgroundRef.current;
    if (img) {
      const imgRatio = img.width / img.height;
      const canvasRatio = boardW / boardH;
      let drawW = boardW;
      let drawH = boardH;
      let dx = 0;
      let dy = 0;

      if (imgRatio > canvasRatio) {
        drawH = boardH;
        drawW = boardH * imgRatio;
        dx = (boardW - drawW) / 2;
      } else {
        drawW = boardW;
        drawH = boardW / imgRatio;
        dy = (boardH - drawH) / 2;
      }

      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.fillStyle = 'rgba(10, 8, 18, 0.6)';
      ctx.fillRect(0, 0, boardW, boardH);
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, boardH);
    gradient.addColorStop(0, '#14101f');
    gradient.addColorStop(1, '#08070d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, boardW, boardH);
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.floor(boardW * dpr);
    const targetH = Math.floor(boardH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${boardW}px`;
      canvas.style.height = `${boardH}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, boardW, boardH);

    const g = gameRef.current;
    drawBackground(ctx);
    drawBricks(ctx, g.bricks);
    drawParticles(ctx, g.particles);
    drawPaddle(ctx, g.paddle);
    drawBall(ctx, g.ball);
    drawUI(ctx, g);
  };

  useEffect(() => {
    const loop = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.03);
      lastTimeRef.current = time;

      if (running) {
        update(dt);
      }
      render();
      rafRef.current = window.requestAnimationFrame(loop);
    };

    rafRef.current = window.requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [running, boardW, boardH, started, backgroundVersion]);

  const startGame = () => {
    const next = createInitialState(boardW, boardH);
    gameRef.current = next;
    setScoreView(next.score);
    setLivesView(next.lives);
    setWonView(false);
    setOverView(false);
    setStarted(true);
    setRunning(true);
  };

  const restart = () => {
    const next = createInitialState(boardW, boardH);
    gameRef.current = next;
    setScoreView(next.score);
    setLivesView(next.lives);
    setWonView(false);
    setOverView(false);
    setStarted(false);
    setRunning(false);
    moveLeftRef.current = false;
    moveRightRef.current = false;
  };

  const reloadImage = () => {
    if (!images.length) return;
    setImageIdx(Math.floor(Math.random() * images.length));
  };

  const startAndMove = (direction: 'left' | 'right') => {
    if (!started && !wonView && !overView) {
      startGame();
    }
    if (direction === 'left') {
      moveLeftRef.current = true;
      moveRightRef.current = false;
    } else {
      moveRightRef.current = true;
      moveLeftRef.current = false;
    }
  };

  const stopMove = (direction: 'left' | 'right') => {
    if (direction === 'left') moveLeftRef.current = false;
    if (direction === 'right') moveRightRef.current = false;
  };

  const toggleFullscreen = async () => {
    if (!boardRef.current) return;
    if (!document.fullscreenElement) {
      await boardRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <section ref={wrapperRef} className="surface-panel-strong rounded-4xl p-4 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-black text-(--text)">Atari Breakout BTS</h3>
        <p className="text-xs uppercase tracking-[0.16em] text-(--muted)">Controles en el tablero</p>
      </div>

      <div
        ref={boardRef}
        className="relative mx-auto mt-4 overflow-hidden rounded-3xl border border-(--border)"
        style={{ width: isFullscreen ? '100vw' : `${boardW}px`, height: isFullscreen ? '100vh' : `${boardH}px` }}
      >
        <canvas ref={canvasRef} className="block" />

        <div className="absolute left-2 top-2 z-20 flex gap-2">
          <button
            onClick={reloadImage}
            className="rounded-lg bg-black/55 p-2 text-white"
            aria-label="Cambiar fondo"
            title="Cambiar fondo"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={restart}
            className="rounded-lg bg-(--accent) p-2 text-white"
            aria-label="Reiniciar"
            title="Reiniciar"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg bg-black/55 p-2 text-white"
            aria-label={isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
            title={isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </button>
        </div>

      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
        <button
          onTouchStart={() => startAndMove('left')}
          onTouchEnd={() => stopMove('left')}
          onTouchCancel={() => stopMove('left')}
          onMouseDown={() => startAndMove('left')}
          onMouseUp={() => stopMove('left')}
          onMouseLeave={() => stopMove('left')}
          className="touch-none select-none grid place-items-center rounded-xl bg-(--surface-soft) px-3 py-3 text-(--text)"
          aria-label="Mover izquierda"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => {
            if (!started && !wonView && !overView) {
              startGame();
            } else {
              setRunning((value) => !value);
            }
          }}
          className="touch-none select-none grid place-items-center rounded-xl bg-(--accent) px-3 py-3 text-white"
          aria-label={running ? 'Pausar' : 'Continuar'}
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <button
          onTouchStart={() => startAndMove('right')}
          onTouchEnd={() => stopMove('right')}
          onTouchCancel={() => stopMove('right')}
          onMouseDown={() => startAndMove('right')}
          onMouseUp={() => stopMove('right')}
          onMouseLeave={() => stopMove('right')}
          className="touch-none select-none grid place-items-center rounded-xl bg-(--surface-soft) px-3 py-3 text-(--text)"
          aria-label="Mover derecha"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
