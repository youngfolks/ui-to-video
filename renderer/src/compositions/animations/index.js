/**
 * Animation Library for Remotion Renderer
 *
 * This module provides a centralized registry of reusable animations
 * that can be applied to layers in the Remotion composition.
 *
 * Each animation is a module that exports an object with:
 * - type: string identifier for the animation
 * - apply: function that calculates animation values based on frame, fps, delay, etc.
 *
 * Usage:
 * import { ANIMATION_REGISTRY } from './animations';
 * const animation = ANIMATION_REGISTRY['pop-out'];
 * const values = animation.apply(position, frame, fps, delay);
 */

export { popOut } from './popOut.js';
export { rotate360 } from './rotate360.js';
export { fadeIn } from './fadeIn.js';
export { slideIn } from './slideIn.js';
export { scalePop } from './scalePop.js';

import { popOut } from './popOut.js';
import { rotate360 } from './rotate360.js';
import { fadeIn } from './fadeIn.js';
import { slideIn } from './slideIn.js';
import { scalePop } from './scalePop.js';

/**
 * Registry of all available animations
 * Maps animation type strings to animation modules
 */
export const ANIMATION_REGISTRY = {
  'pop-out': popOut,
  'rotate-360': rotate360,
  'fade-in': fadeIn,
  'slide-in': slideIn,
  'scale-pop': scalePop
};

/**
 * Get an animation by type
 * @param {string} type - Animation type identifier
 * @returns {Object|null} Animation module or null if not found
 */
export const getAnimation = (type) => {
  return ANIMATION_REGISTRY[type] || null;
};

/**
 * Get list of all available animation types
 * @returns {string[]} Array of animation type identifiers
 */
export const getAvailableAnimations = () => {
  return Object.keys(ANIMATION_REGISTRY);
};
