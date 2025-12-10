import { spring, interpolate } from 'remotion';

/**
 * Scale-pop animation: Element pops in with overshoot effect
 *
 * Animation sequence:
 * - Element starts at small scale (0%)
 * - Quickly scales up past target size (overshoot)
 * - Settles back to normal size (100%)
 * - Includes fade-in for polish
 */
export const scalePop = {
  type: 'scale-pop',

  /**
   * Apply scale-pop animation
   * @param {Array} position - [x, y, z] position of the layer
   * @param {number} frame - Current frame number
   * @param {number} fps - Frames per second
   * @param {number} delay - Animation delay in frames
   * @param {number} duration - Not used (spring-based animation)
   * @param {Object} options - Additional options: { overshoot: number }
   * @returns {Object} Animation values: { position, opacity, scale }
   */
  apply: (position, frame, fps, delay = 0, duration = null, options = {}) => {
    const { overshoot = 1.15 } = options;

    const entrance = spring({
      frame: frame - delay,
      fps,
      config: {
        damping: 12,    // Lower damping = more bounce
        stiffness: 100, // Higher stiffness = snappier
        mass: 0.8
      }
    });

    // Scale with overshoot: 0 -> overshoot -> settle at 1.0
    const scale = interpolate(
      entrance,
      [0, 0.6, 1],
      [0, overshoot, 1]
    );

    // Quick fade in
    const opacity = interpolate(entrance, [0, 0.1, 1], [0, 1, 1]);

    return {
      position,
      opacity,
      scale
    };
  }
};
