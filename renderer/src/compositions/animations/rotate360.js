import { spring, interpolate } from 'remotion';

/**
 * Rotate-360 animation: Full 360-degree rotation on Z-axis
 * Extracted from LayerPlane.jsx lines 328-344
 *
 * Animation sequence:
 * - Element rotates a full 360 degrees (2π radians)
 * - Rotation happens in the plane of the screen (Z-axis)
 * - Uses chroma key to remove white background during rotation
 */
export const rotate360 = {
  type: 'rotate-360',

  /**
   * Apply 360-degree rotation animation
   * @param {Array} position - [x, y, z] position of the layer
   * @param {number} frame - Current frame number
   * @param {number} fps - Frames per second
   * @param {number} delay - Animation delay in frames
   * @param {number} duration - Not used (spring-based animation)
   * @returns {Object} Animation values: { rotation, chromaKey }
   */
  apply: (position, frame, fps, delay = 0, duration = null) => {
    const rotationSpring = spring({
      frame: frame - delay,
      fps,
      config: {
        damping: 20,
        stiffness: 50,
        mass: 1
      }
    });

    // Full rotation from 0 to 360 degrees (0 to 2π radians)
    const rotation = interpolate(
      rotationSpring,
      [0, 1],
      [0, Math.PI * 2]
    );

    return {
      rotation,
      // Enable chroma key to remove white background during rotation
      chromaKey: {
        enabled: true,
        threshold: 0.85
      }
    };
  }
};
