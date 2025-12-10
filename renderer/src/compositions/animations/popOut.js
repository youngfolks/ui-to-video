import { spring, interpolate } from 'remotion';

/**
 * Pop-out animation: Z-axis movement with fade in/out
 * Extracted from LayerPlane.jsx lines 276-297
 *
 * Animation sequence:
 * - Element starts hidden at original Z position
 * - Pops forward on Z-axis (closer to camera)
 * - Holds position while visible
 * - Returns to original Z position while fading out
 */
export const popOut = {
  type: 'pop-out',

  /**
   * Apply pop-out animation
   * @param {Array} position - [x, y, z] position of the layer
   * @param {number} frame - Current frame number
   * @param {number} fps - Frames per second
   * @param {number} delay - Animation delay in frames
   * @param {number} duration - Not used (spring-based animation)
   * @returns {Object} Animation values: { position, opacity, scale }
   */
  apply: (position, frame, fps, delay = 0, duration = null) => {
    const entrance = spring({
      frame: frame - delay,
      fps,
      config: {
        damping: 20,    // More damping = slower, smoother
        stiffness: 50,  // Lower stiffness = smoother
        mass: 1         // Higher mass = takes longer
      }
    });

    // Z-axis animation: start -> pop out -> hold -> return to original
    // Keyframes at: 0% (start), 30% (popped out), 70% (hold), 100% (back to original)
    const animatedZ = interpolate(
      entrance,
      [0, 0.3, 0.7, 1],
      [position[2], position[2] + 0.15, position[2] + 0.15, position[2]]
    );

    // Opacity animation: hidden -> fade in -> visible -> visible -> fade out -> hidden
    const opacity = interpolate(
      entrance,
      [0, 0.15, 0.3, 0.7, 0.85, 1],
      [0, 1, 1, 1, 0, 0]
    );

    // Scale animation: slight zoom from 95% to 100%
    const scale = interpolate(entrance, [0, 1], [0.95, 1]);

    return {
      position: [position[0], position[1], animatedZ],
      opacity,
      scale
    };
  }
};
