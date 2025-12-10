import { spring, interpolate } from 'remotion';

/**
 * Fade-in animation: Simple opacity transition from 0 to 1
 *
 * Animation sequence:
 * - Element starts invisible (opacity 0)
 * - Smoothly fades in to full visibility (opacity 1)
 * - Slight scale animation for polish
 */
export const fadeIn = {
  type: 'fade-in',

  /**
   * Apply fade-in animation
   * @param {Array} position - [x, y, z] position of the layer
   * @param {number} frame - Current frame number
   * @param {number} fps - Frames per second
   * @param {number} delay - Animation delay in frames
   * @param {number} duration - Not used (spring-based animation)
   * @returns {Object} Animation values: { opacity, scale }
   */
  apply: (position, frame, fps, delay = 0, duration = null) => {
    const entrance = spring({
      frame: frame - delay,
      fps,
      config: {
        damping: 15,    // Less damping = quicker
        stiffness: 80,  // Higher stiffness = snappier
        mass: 0.5       // Lower mass = faster
      }
    });

    // Simple fade from invisible to visible
    const opacity = interpolate(entrance, [0, 0.3, 1], [0, 1, 1]);

    // Subtle scale for polish
    const scale = interpolate(entrance, [0, 1], [0.98, 1]);

    return {
      position,
      opacity,
      scale
    };
  }
};
