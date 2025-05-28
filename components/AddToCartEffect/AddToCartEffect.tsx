'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const confettiModule = require('canvas-confetti');
const confetti = (confettiModule.default ?? confettiModule) as (
  opts: { particleCount: number; spread: number; origin: { y: number } }
) => void;

import styles from './AddToCartEffect.module.css';

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function AddToCartEffect() {
  const [active, setActive] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const animateBall = useCallback(() => {
    const ball = ballRef.current!;
    const message = messageRef.current!;

    ball.style.opacity = '1';
    const duration = 1200;
    let startTime: number;

    function frame(now: number) {
      if (!startTime) startTime = now;
      let t = (now - startTime) / duration;
      if (t > 1) t = 1;
      const e = easeInOut(t);

      const startX = 20;
      const endX = 180 - 15; // center of 360px modal
      const x = startX + (endX - startX) * e;

      const startY = 20;
      const arc = 80;
      const y = startY + arc * 4 * t * (1 - t);

      const rot = e * 720;

      ball.style.left = `${x}px`;
      ball.style.bottom = `${y}px`;
      ball.style.transform = `rotate(${rot}deg)`;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        ball.style.opacity = '0';
        message.classList.add('visible');
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.5 } });
      }
    }

    requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!active) return;
    const mount = window.setTimeout(() => {
      animateBall();
      window.setTimeout(() => setActive(false), 1200 + 1400);
    }, 0);
    return () => window.clearTimeout(mount);
  }, [active, animateBall]);

  useEffect(() => {
    const handler = () => setActive(true);
    window.addEventListener('cart-add', handler);
    return () => window.removeEventListener('cart-add', handler);
  }, []);

  if (!active) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div ref={messageRef} className={styles.message}>
          ✅ Your item has been added to the cart!
        </div>
        <div className={styles.hole} />
        <div ref={ballRef} className={styles.ball} />
      </div>
    </div>
  );
}
