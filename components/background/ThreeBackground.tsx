'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';

const GLYPHS = [
  '\uBCF4',
  '\uB77C',
  '\uD574',
  '\uBC29',
  '\uD0C4',
  '\uC18C',
  '\uB144',
  '\uB2E8',
  '\uC544',
  '\uBBF8',
  '\uAFC8',
  '\uBE5B',
  '\uBCC4',
  '\uB2EC',
  '\uC0AC',
];

// ─── Inner component (always mounts/unmounts cleanly) ────────────────────────
function ThreeBackgroundInner() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.domElement.className = 'absolute inset-0 h-full w-full';
    mountNode.appendChild(renderer.domElement);

    const overlay = document.createElement('canvas');
    overlay.className = 'absolute inset-0 h-full w-full';
    const overlayContext = overlay.getContext('2d');
    if (!overlayContext) return;
    mountNode.appendChild(overlay);

    const particlesCount = 1900;
    const positions = new Float32Array(particlesCount * 3);
    const velocities = new Float32Array(particlesCount);

    for (let i = 0; i < particlesCount; i += 1) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 44;
      positions[i3 + 1] = (Math.random() - 0.5) * 34;
      positions[i3 + 2] = (Math.random() - 0.5) * 18;
      velocities[i] = 0.0018 + Math.random() * 0.0042;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 64;
    spriteCanvas.height = 64;
    const spriteContext = spriteCanvas.getContext('2d');
    if (!spriteContext) return;

    const getThemePalette = () => {
      const isLight = document.documentElement.dataset.theme === 'light';
      if (isLight) {
        return {
          particle: '#9d67d6',
          glyph: 'rgba(128, 74, 196, 0.28)',
          spriteInner: 'rgba(255,246,255,0.95)',
          spriteMid: 'rgba(182,110,244,0.88)',
          spriteOuter: 'rgba(122,49,170,0)',
        };
      }
      return {
        particle: '#a04ae4',
        glyph: 'rgba(170, 90, 240, 0.22)',
        spriteInner: 'rgba(230,205,255,1)',
        spriteMid: 'rgba(176,105,255,0.95)',
        spriteOuter: 'rgba(143,58,196,0)',
      };
    };

    let palette = getThemePalette();

    const paintSprite = () => {
      spriteContext.clearRect(0, 0, 64, 64);
      const gradient = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, palette.spriteInner);
      gradient.addColorStop(0.28, palette.spriteMid);
      gradient.addColorStop(1, palette.spriteOuter);
      spriteContext.fillStyle = gradient;
      spriteContext.fillRect(0, 0, 64, 64);
    };

    paintSprite();

    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: new THREE.CanvasTexture(spriteCanvas),
      color: palette.particle,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const onThemeChange = () => {
      palette = getThemePalette();
      material.color.set(palette.particle);
      paintSprite();
      if (material.map) material.map.needsUpdate = true;
    };

    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const pointer = { x: 0, y: 0 };
    let frame = 0;
    let animationFrame = 0;

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      overlay.width = window.innerWidth;
      overlay.height = window.innerHeight;
    };

    const onPointerMove = (event: MouseEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    const onPointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };

    const drawGlyphRain = () => {
      overlayContext.clearRect(0, 0, overlay.width, overlay.height);
      const columns = Math.max(22, Math.floor(overlay.width / 36));
      const rows = Math.max(18, Math.floor(overlay.height / 36));

      for (let column = 0; column < columns; column += 1) {
        for (let row = 0; row < rows; row += 1) {
          const glyph = GLYPHS[(column * 3 + row + Math.floor(frame / 72)) % GLYPHS.length];
          const wave = Math.sin(frame * 0.004 + column * 0.22 + row * 0.13) * 4;
          const drift = (frame * (0.12 + (column % 5) * 0.025) + row * 23) % (overlay.height + 46);
          const x = column * 36 + 14 + wave + pointer.x * 5;
          const y = drift - 40;
          const alpha = 0.05 + ((column + row) % 5) * 0.018;

          overlayContext.fillStyle = palette.glyph.replace(/\d?\.\d+\)/, `${alpha})`);
          overlayContext.font = `${11 + ((column + row) % 4) * 2}px sans-serif`;
          overlayContext.textAlign = 'center';
          overlayContext.textBaseline = 'middle';
          overlayContext.fillText(glyph, x, y);
        }
      }
    };

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);

      const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particlesCount; i += 1) {
        const i3 = i * 3;
        positionAttribute.array[i3 + 1] = (positionAttribute.array[i3 + 1] as number) - velocities[i];
        positionAttribute.array[i3] = (positionAttribute.array[i3] as number) + Math.sin(frame * 0.0018 + i * 0.042) * 0.0013;

        if ((positionAttribute.array[i3 + 1] as number) < -18) {
          positionAttribute.array[i3 + 1] = 18;
          positionAttribute.array[i3] = (Math.random() - 0.5) * 44;
          positionAttribute.array[i3 + 2] = (Math.random() - 0.5) * 18;
        }
      }

      positionAttribute.needsUpdate = true;
      points.rotation.y += 0.00014;
      points.rotation.x = pointer.y * 0.028;
      points.position.x += (pointer.x * 1.1 - points.position.x) * 0.018;
      points.position.y += (pointer.y * 0.7 - points.position.y) * 0.018;

      if (frame % 2 === 0) drawGlyphRain();
      renderer.render(scene, camera);
      frame += 1;
    };

    resize();
    animate();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('mouseleave', onPointerLeave);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseleave', onPointerLeave);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      themeObserver.disconnect();
      if (renderer.domElement.parentNode === mountNode) mountNode.removeChild(renderer.domElement);
      if (overlay.parentNode === mountNode) mountNode.removeChild(overlay);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="matrix-vignette fixed inset-0 z-[-1] overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  );
}

// ─── Public component — skips rendering on the /videos route ─────────────────
export default function ThreeBackground() {
  const pathname = usePathname();

  // On the videos page we use DiagonalImageGrid instead, so skip Three.js
  // to avoid running two animation loops simultaneously.
  if (pathname?.startsWith('/videos')) return null;

  return <ThreeBackgroundInner />;
}