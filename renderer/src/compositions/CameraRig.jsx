import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { interpolate } from 'remotion';
import * as THREE from 'three';

const PRESETS = {
  'orbit-zoom': (progress) => {
    // Phase 1: Start far back (0-20%)
    // Phase 2: Orbit around (20-70%)
    // Phase 3: Zoom closer (70-100%)

    const angle = interpolate(progress, [0, 0.2, 0.7, 1], [0, 0, Math.PI * 0.5, Math.PI * 0.5]);
    const distance = interpolate(progress, [0, 0.2, 0.7, 1], [8, 6, 5, 3.5]);
    const height = interpolate(progress, [0, 0.2, 0.7, 1], [1, 0.5, 0.3, 0]);

    return {
      position: [
        Math.sin(angle) * distance,
        height,
        Math.cos(angle) * distance
      ],
      lookAt: [0, 0, 0]
    };
  },

  'explode-in': (progress) => {
    // Camera stays mostly static, layers fly in
    const distance = interpolate(progress, [0, 1], [5, 4]);

    return {
      position: [0, 0, distance],
      lookAt: [0, 0, 0]
    };
  },

  'slide-reveal': (progress) => {
    // Camera slides from left to center
    const x = interpolate(progress, [0, 0.5, 1], [-3, 0, 0]);
    const distance = interpolate(progress, [0, 1], [6, 4.5]);

    return {
      position: [x, 0.2, distance],
      lookAt: [0, 0, 0]
    };
  },

  'zoom-focus': (progress) => {
    // Simple zoom in
    const distance = interpolate(progress, [0, 0.3, 1], [10, 5, 3]);
    const height = interpolate(progress, [0, 1], [1, 0]);

    return {
      position: [0, height, distance],
      lookAt: [0, 0, 0]
    };
  },

  'product-showcase': (progress) => {
    // Apple/premium product ad style
    // Starts at 3/4 angle, slightly above, zoomed in
    // Subtle rotation and zoom for dynamism

    // 3/4 angle positioning (45 degrees horizontal, 20 degrees vertical)
    const baseAngle = Math.PI * 0.25; // 45 degrees (3/4 view)
    const angleVariation = interpolate(progress, [0, 1], [0, Math.PI * 0.1]); // Subtle 18 degree rotation
    const angle = baseAngle + angleVariation;

    // Close zoom with subtle zoom-in
    const distance = interpolate(progress, [0, 0.4, 1], [3.5, 3, 2.5]);

    // Slight elevation for better perspective
    const height = interpolate(progress, [0, 1], [0.8, 0.5]);

    // Subtle vertical pan
    const lookAtY = interpolate(progress, [0, 1], [-0.2, 0.1]);

    return {
      position: [
        Math.sin(angle) * distance,
        height,
        Math.cos(angle) * distance
      ],
      lookAt: [0, lookAtY, 0]
    };
  },

  'dramatic-reveal': (progress) => {
    // Dramatic angle with more pronounced movement
    // Starts high and to the side, swoops down

    const angle = interpolate(progress, [0, 0.5, 1], [Math.PI * 0.4, Math.PI * 0.3, Math.PI * 0.25]);
    const distance = interpolate(progress, [0, 0.3, 1], [5, 3.5, 2.8]);
    const height = interpolate(progress, [0, 0.5, 1], [1.5, 0.8, 0.4]);
    const lookAtY = interpolate(progress, [0, 1], [-0.3, 0]);

    return {
      position: [
        Math.sin(angle) * distance,
        height,
        Math.cos(angle) * distance
      ],
      lookAt: [0, lookAtY, 0]
    };
  },

  'focus-layer': (progress) => {
    // Camera stays head-on, zooms to specific layer
    // Background stays in frame, only highlighted layer pops forward

    // Phase 1: Show full UI (0-30%)
    // Phase 2: Zoom to focused element (30-70%)
    // Phase 3: Hold on element (70-100%)

    const distance = interpolate(
      progress,
      [0, 0.3, 0.7, 1],
      [6, 3.75, 3.3, 3.3] // Zoomed out by 50% to see depth effect
    );

    // Stay mostly centered, slight 3/4 angle for depth
    const angle = Math.PI * 0.15; // Small 27-degree angle
    const height = interpolate(progress, [0, 1], [0.3, 0.2]); // Slight elevation

    // Pan to focused element (will be set dynamically)
    const lookAtY = interpolate(progress, [0, 0.3, 1], [0, -0.3, -0.3]); // Pan down to element

    return {
      position: [
        Math.sin(angle) * distance,
        height,
        Math.cos(angle) * distance
      ],
      lookAt: [0, lookAtY, 0]
    };
  }
};

export const CameraRig = ({ preset = 'orbit-zoom', frame, fps, duration }) => {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    // Set initial camera position
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(() => {
    const progress = frame / duration;
    const presetFunc = PRESETS[preset] || PRESETS['orbit-zoom'];
    const { position, lookAt } = presetFunc(progress);

    // Smooth camera movement
    targetPosition.current.set(...position);
    targetLookAt.current.set(...lookAt);

    camera.position.lerp(targetPosition.current, 0.1);
    camera.lookAt(targetLookAt.current);
  });

  return null;
};
