/**
 * LUMEN & CO. — Fluid Physics Magnetic Cursor
 * Inspired by 21st.dev <MagneticCursor magneticFactor={0.55} blendMode="exclusion" cursorSize={40} />
 * 
 * Features:
 * - Physics-based lerp tracking & velocity-sensitive organic stretch
 * - Auto-contrast color inversion via mix-blend-mode: exclusion
 * - Magnetic snapping (magneticFactor: 0.55) to [data-magnetic] and interactive targets
 * - Smooth spring displacement on magnetic elements towards pointer
 * - Zero click interference (pointer-events: none !important)
 * - Safe input handling (auto-shrinks over inputs) & full touch-device fallback
 */

(function () {
  'use strict';

  // Check for touch / coarse pointer devices
  const isTouchDevice = () => {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
    );
  };

  const prefersReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // If touch device, do not initialize custom cursor to ensure 100% native touch UX
  if (isTouchDevice()) {
    return;
  }

  // Configuration matching 21st.dev specification
  const CONFIG = {
    cursorSize: 40,
    hoverSize: 62,
    magneticFactor: 0.55,
    elementPullFactor: 0.28,
    lerpFactor: 0.16,
    blendMode: 'exclusion',
  };

  // State
  let mouse = { x: -100, y: -100 };
  let cursor = { x: -100, y: -100 };
  let target = { x: -100, y: -100 };
  let velocity = { x: 0, y: 0 };
  let isHovering = false;
  let isClicking = false;
  let isTextInput = false;
  let isVisible = false;
  let activeMagneticEl = null;
  let magneticElBounds = null;
  let rafId = null;

  // DOM Elements
  let cursorEl = null;
  let dotEl = null;

  function initCursorDOM() {
    // Add styling class to body for custom cursor support
    document.body.classList.add('has-custom-cursor');

    // Follower circle (mix-blend-mode: exclusion)
    cursorEl = document.createElement('div');
    cursorEl.className = 'magnetic-cursor-follower';
    cursorEl.setAttribute('aria-hidden', 'true');

    // Precision micro-dot
    dotEl = document.createElement('div');
    dotEl.className = 'magnetic-cursor-dot';
    dotEl.setAttribute('aria-hidden', 'true');

    document.body.appendChild(cursorEl);
    document.body.appendChild(dotEl);
  }

  // Linear interpolation for silky 60/120fps motion
  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  // Determine if element qualifies for magnetic snap + displacement
  function getMagneticTarget(targetEl) {
    if (!targetEl || targetEl === document.body || targetEl === document.documentElement) {
      return null;
    }
    // Explicit attribute
    const explicit = targetEl.closest('[data-magnetic]');
    if (explicit) return explicit;

    // Compact interactive controls
    const compactControl = targetEl.closest(
      'button, .btn, .pill, .cart-btn, .nav-link, .brand-logo, .hero-card-floating-tag, .btn-quick-view, .qty-btn, .modal-close-btn, .btn-icon, [data-action="view-details"]'
    );
    if (compactControl && !compactControl.hasAttribute('data-no-magnetic')) {
      return compactControl;
    }

    return null;
  }

  // Check if target is interactive (for general cursor scale expansion)
  function isInteractiveTarget(targetEl) {
    if (!targetEl) return false;
    return !!targetEl.closest('a, button, [role="button"], .product-card, .clickable, select');
  }

  // Check if hovering form inputs
  function isInputTarget(targetEl) {
    if (!targetEl) return false;
    return !!targetEl.closest('input, textarea, select, [contenteditable="true"]');
  }

  // Mouse move handler
  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    if (!isVisible) {
      isVisible = true;
      cursor.x = mouse.x;
      cursor.y = mouse.y;
      target.x = mouse.x;
      target.y = mouse.y;
      cursorEl.classList.add('is-active');
      dotEl.classList.add('is-active');
    }

    // Detect input hovering
    const inInput = isInputTarget(e.target);
    if (inInput !== isTextInput) {
      isTextInput = inInput;
      cursorEl.classList.toggle('is-text-input', isTextInput);
      dotEl.classList.toggle('is-text-input', isTextInput);
    }

    // Detect magnetic target
    const magTarget = getMagneticTarget(e.target);

    if (magTarget) {
      if (activeMagneticEl !== magTarget) {
        if (activeMagneticEl) {
          resetElementTransform(activeMagneticEl);
        }
        activeMagneticEl = magTarget;
        isHovering = true;
        cursorEl.classList.add('is-hovering');
      }

      magneticElBounds = activeMagneticEl.getBoundingClientRect();
      const elCenterX = magneticElBounds.left + magneticElBounds.width / 2;
      const elCenterY = magneticElBounds.top + magneticElBounds.height / 2;

      // Distance from pointer to element center
      const deltaX = mouse.x - elCenterX;
      const deltaY = mouse.y - elCenterY;

      // Cursor snaps towards center with magneticFactor (0.55)
      target.x = mouse.x - deltaX * CONFIG.magneticFactor;
      target.y = mouse.y - deltaY * CONFIG.magneticFactor;

      // Element pulls gently towards pointer
      const pullX = deltaX * CONFIG.elementPullFactor;
      const pullY = deltaY * CONFIG.elementPullFactor;
      activeMagneticEl.style.transition = 'none';
      activeMagneticEl.style.transform = `translate3d(${pullX.toFixed(2)}px, ${pullY.toFixed(2)}px, 0)`;
    } else {
      if (activeMagneticEl) {
        resetElementTransform(activeMagneticEl);
        activeMagneticEl = null;
        magneticElBounds = null;
      }

      // Check general interactive hover for scaling cursor
      const interactive = isInteractiveTarget(e.target);
      if (interactive !== isHovering) {
        isHovering = interactive;
        cursorEl.classList.toggle('is-hovering', isHovering);
      }

      target.x = mouse.x;
      target.y = mouse.y;
    }
  }

  // Smooth spring reset when pointer leaves magnetic element
  function resetElementTransform(el) {
    if (!el) return;
    el.style.transition = 'transform 0.36s cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.transform = 'translate3d(0, 0, 0)';
    setTimeout(() => {
      if (el && el !== activeMagneticEl) {
        el.style.transition = '';
        el.style.transform = '';
      }
    }, 360);
  }

  // Mouse down / up handlers
  function onMouseDown() {
    isClicking = true;
    cursorEl.classList.add('is-clicking');
  }

  function onMouseUp() {
    isClicking = false;
    cursorEl.classList.remove('is-clicking');
  }

  // Window leave / enter handlers
  function onMouseLeave() {
    isVisible = false;
    cursorEl.classList.remove('is-active');
    dotEl.classList.remove('is-active');
    if (activeMagneticEl) {
      resetElementTransform(activeMagneticEl);
      activeMagneticEl = null;
    }
  }

  function onMouseEnter() {
    isVisible = true;
    cursorEl.classList.add('is-active');
    dotEl.classList.add('is-active');
  }

  // Physics Animation Loop
  function renderLoop() {
    if (isVisible) {
      const prevX = cursor.x;
      const prevY = cursor.y;

      // Smooth position interpolation
      cursor.x = lerp(cursor.x, target.x, CONFIG.lerpFactor);
      cursor.y = lerp(cursor.y, target.y, CONFIG.lerpFactor);

      velocity.x = cursor.x - prevX;
      velocity.y = cursor.y - prevY;

      const speed = Math.hypot(velocity.x, velocity.y);

      // Base translation
      let transformStr = `translate3d(${cursor.x}px, ${cursor.y}px, 0)`;

      // Fluid velocity stretch along movement vector
      if (!prefersReducedMotion() && speed > 0.6 && !isHovering && !isTextInput) {
        const angle = Math.atan2(velocity.y, velocity.x);
        const stretch = Math.min(speed * 0.012, 0.32);
        const scaleX = 1 + stretch;
        const scaleY = 1 - stretch * 0.5;
        transformStr += ` rotate(${angle}rad) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
      } else if (isClicking) {
        transformStr += ' scale(0.82)';
      }

      cursorEl.style.transform = transformStr;

      // Inner micro-dot directly tracks exact mouse coordinates
      dotEl.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    }

    rafId = requestAnimationFrame(renderLoop);
  }

  // Setup Event Listeners
  function init() {
    initCursorDOM();

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave, { passive: true });
    document.documentElement.addEventListener('mouseenter', onMouseEnter, { passive: true });

    // Keep bounds accurate on scroll
    window.addEventListener('scroll', () => {
      if (activeMagneticEl) {
        magneticElBounds = activeMagneticEl.getBoundingClientRect();
      }
    }, { passive: true });

    rafId = requestAnimationFrame(renderLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
