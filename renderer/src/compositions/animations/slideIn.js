import { spring, interpolate } from 'remotion';

/**
 * Slide-in animation: Element slides in from off-screen
 *
 * Animation sequence:
 * - Element starts off-screen (offset on X or Y axis)
 * - Slides smoothly into its final position
 * - Includes fade-in for polish
 */
export const slideIn = {
  type: 'slide-in',

  /**
   * Apply slide-in animation
   * @param {Array} position - [x, y, z] position of the layer (final position)
   * @param {number} frame - Current frame number
   * @param {number} fps - Frames per second
   * @param {number} delay - Animation delay in frames
   * @param {number} duration - Not used (spring-based animation)
   * @param {Object} options - Additional options: { direction: 'left'|'right'|'top'|'bottom', distance: number }
   * @returns {Object} Animation values: { position, opacity, scale }
   */
  apply: (position, frame, fps, delay = 0, duration = null, options = {}) => {
    const { direction = 'left', distance = 0.5 } = options;

    const entrance = spring({
      frame: frame - delay,
      fps,
      config: {
        damping: 18,
        stiffness: 70,
        mass: 0.8
      }
    });

    // Calculate start position based on direction
    let startPosition = [...position];
    switch (direction) {
      case 'left':
        startPosition[0] = position[0] - distance;
        break;
      case 'right':
        startPosition[0] = position[0] + distance;
        break;
      case 'top':
        startPosition[1] = position[1] + distance;
        break;
      case 'bottom':
        startPosition[1] = position[1] - distance;
        break;
    }

    // Interpolate from start to final position
    const animatedX = interpolate(
      entrance,
      [0, 1],
      [startPosition[0], position[0]]
    );

    const animatedY = interpolate(
      entrance,
      [0, 1],
      [startPosition[1], position[1]]
    );

    // Fade in during slide
    const opacity = interpolate(entrance, [0, 0.2, 1], [0, 1, 1]);

    // Subtle scale
    const scale = interpolate(entrance, [0, 1], [0.96, 1]);

    return {
      position: [animatedX, animatedY, position[2]],
      opacity,
      scale
    };
  }
};
