import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { spring, interpolate } from 'remotion';

export const LayerPlane = ({
  imageUrl,
  position,
  endPosition = null,
  size,
  frame,
  fps,
  animationDelay = 0,
  zDepth = 5,
  isBackground = false,
  isFocused = false,
  bbox = null,
  canvasDimensions = null,
  maskBbox = null, // For background: bbox of element to cut out (deprecated - use maskBboxes)
  maskAnimationDelay = 0, // When the mask should start appearing (deprecated)
  maskBboxes = null, // Array of {bbox, delay} objects for multiple masks
  shouldRotate = false, // Whether this layer should rotate
  rotationDelay = 0 // When rotation should start
}) => {
  const meshRef = useRef();

  // Load the full screenshot texture
  const texture = useLoader(TextureLoader, imageUrl);

  // Create a clipped version of the texture for non-background layers
  const material = useMemo(() => {
    if (isBackground) {
      // Background shows full image with optional mask cutouts
      const masks = maskBboxes || (maskBbox ? [{bbox: maskBbox, delay: maskAnimationDelay}] : []);

      if (masks.length > 0 && canvasDimensions) {
        // Create a custom shader material with multiple masks (support up to 2)
        const mask1 = masks[0] || {bbox: {x: 0, y: 0, width: 0, height: 0}, delay: 0};
        const mask2 = masks[1] || {bbox: {x: 0, y: 0, width: 0, height: 0}, delay: 0};

        const shaderMaterial = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: texture },
            // Mask 1 (text)
            mask1X: { value: mask1.bbox.x / canvasDimensions.width },
            mask1Y: { value: mask1.bbox.y / canvasDimensions.height },
            mask1Width: { value: mask1.bbox.width / canvasDimensions.width },
            mask1Height: { value: mask1.bbox.height / canvasDimensions.height },
            mask1Opacity: { value: 0.0 },
            // Mask 2 (cookie)
            mask2X: { value: mask2.bbox.x / canvasDimensions.width },
            mask2Y: { value: mask2.bbox.y / canvasDimensions.height },
            mask2Width: { value: mask2.bbox.width / canvasDimensions.width },
            mask2Height: { value: mask2.bbox.height / canvasDimensions.height },
            mask2Opacity: { value: 0.0 },
            opacity: { value: 1.0 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D map;
            uniform float mask1X, mask1Y, mask1Width, mask1Height, mask1Opacity;
            uniform float mask2X, mask2Y, mask2Width, mask2Height, mask2Opacity;
            uniform float opacity;
            varying vec2 vUv;

            void main() {
              vec4 texColor = texture2D(map, vUv);

              // Check if pixel is inside either mask region (inverted Y for texture coordinates)
              float uvY = 1.0 - vUv.y;

              bool inMask1 = vUv.x >= mask1X && vUv.x <= (mask1X + mask1Width) &&
                            uvY >= mask1Y && uvY <= (mask1Y + mask1Height);

              bool inMask2 = vUv.x >= mask2X && vUv.x <= (mask2X + mask2Width) &&
                            uvY >= mask2Y && uvY <= (mask2Y + mask2Height);

              // Fill masks with white background color
              vec3 backgroundColor = vec3(1.0, 1.0, 1.0);
              if (inMask1) {
                texColor.rgb = mix(texColor.rgb, backgroundColor, mask1Opacity);
              }
              if (inMask2) {
                texColor.rgb = mix(texColor.rgb, backgroundColor, mask2Opacity);
              }

              gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
            }
          `,
          transparent: true,
          side: THREE.DoubleSide
        });
        return shaderMaterial;
      }

      // No mask - show full image
      return new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
    }

    // For individual layers, we'll show a cropped portion
    // Create a canvas to crop the texture
    if (!bbox || !canvasDimensions) {
      return new THREE.MeshStandardMaterial({
        color: '#667eea',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
      });
    }

    // For focused layers, use a shader to remove white background (chroma key)
    if (isFocused) {
      const uvOffsetX = bbox.x / canvasDimensions.width;
      const uvOffsetY = bbox.y / canvasDimensions.height;
      const uvScaleX = bbox.width / canvasDimensions.width;
      const uvScaleY = bbox.height / canvasDimensions.height;

      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          uvOffsetX: { value: uvOffsetX },
          uvOffsetY: { value: uvOffsetY },
          uvScaleX: { value: uvScaleX },
          uvScaleY: { value: uvScaleY },
          opacity: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          uniform float uvOffsetX;
          uniform float uvOffsetY;
          uniform float uvScaleX;
          uniform float uvScaleY;
          uniform float opacity;
          varying vec2 vUv;

          void main() {
            // Apply UV cropping
            vec2 croppedUv = vec2(
              uvOffsetX + vUv.x * uvScaleX,
              uvOffsetY + (1.0 - vUv.y) * uvScaleY
            );
            croppedUv.y = 1.0 - croppedUv.y;

            vec4 texColor = texture2D(map, croppedUv);

            // Chroma key: remove white/light background
            // If the color is close to white, make it transparent
            float threshold = 0.85; // Brightness threshold
            float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;

            if (brightness > threshold) {
              discard; // Remove white pixels
            }

            gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      return shaderMaterial;
    }

    // Non-focused layers - use shader if it should rotate (to remove background)
    const uvOffsetX = bbox.x / canvasDimensions.width;
    const uvOffsetY = bbox.y / canvasDimensions.height;
    const uvScaleX = bbox.width / canvasDimensions.width;
    const uvScaleY = bbox.height / canvasDimensions.height;

    if (shouldRotate) {
      // Rotating layers (like cookie) use shader to remove white background
      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          uvOffsetX: { value: uvOffsetX },
          uvOffsetY: { value: uvOffsetY },
          uvScaleX: { value: uvScaleX },
          uvScaleY: { value: uvScaleY },
          opacity: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          uniform float uvOffsetX;
          uniform float uvOffsetY;
          uniform float uvScaleX;
          uniform float uvScaleY;
          uniform float opacity;
          varying vec2 vUv;

          void main() {
            // Apply UV cropping
            vec2 croppedUv = vec2(
              uvOffsetX + vUv.x * uvScaleX,
              uvOffsetY + (1.0 - vUv.y) * uvScaleY
            );
            croppedUv.y = 1.0 - croppedUv.y;

            vec4 texColor = texture2D(map, croppedUv);

            // Chroma key: remove white/light background
            float threshold = 0.85; // Brightness threshold
            float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;

            if (brightness > threshold) {
              discard; // Remove white pixels
            }

            gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      return shaderMaterial;
    }

    // Other non-focused layers use standard material with texture
    const layerTexture = texture.clone();
    layerTexture.needsUpdate = true;
    layerTexture.offset.set(uvOffsetX, 1 - uvOffsetY - uvScaleY);
    layerTexture.repeat.set(uvScaleX, uvScaleY);

    return new THREE.MeshStandardMaterial({
      map: layerTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });
  }, [texture, bbox, canvasDimensions, isBackground, maskBbox, isFocused]);

  // Entrance animation - smoother, slower animation (~30 frames for focused)
  const entrance = spring({
    frame: frame - animationDelay,
    fps,
    config: {
      damping: isFocused ? 20 : 20, // More damping for focused = slower
      stiffness: isFocused ? 50 : 80, // Lower stiffness for focused = smoother
      mass: isFocused ? 1 : 0.5, // Higher mass for focused = takes longer
    },
  });

  // Use endPosition if provided, otherwise use position
  const finalPosition = endPosition || position;

  // Animate from start position to end position
  // For focused layers: pop out, hold, then return to original position
  // For others: simple linear movement
  const animatedZ = isFocused
    ? interpolate(
        entrance,
        [0, 0.3, 0.7, 1],  // Keyframes: start -> pop out -> hold -> return to original
        [position[2], position[2] + 0.15, position[2] + 0.15, position[2]]  // Start at bg, pop forward, hold, return to bg
      )
    : interpolate(
        entrance,
        [0, 1],
        [position[2], finalPosition[2]]
      );

  // For focused layers: fade in when popping out, fade out when returning
  // For others: simple fade in
  const opacity = isFocused
    ? interpolate(
        entrance,
        [0, 0.15, 0.3, 0.7, 0.85, 1],  // Keyframes: hidden -> fade in -> visible -> visible -> fade out -> hidden
        [0, 1, 1, 1, 0, 0]  // Fade in during pop out, stay visible while held, fade out during return
      )
    : interpolate(entrance, [0, 0.3, 1], [0, 1, 1]);
  const scale = interpolate(entrance, [0, 1], [0.95, 1]); // Start closer to full size

  // Subtle floating animation after entrance (only for focused layers)
  const floatOffset = isFocused ? Math.sin((frame + animationDelay * 10) * 0.02) * 0.02 : 0;

  // Mask animations for background - support multiple masks
  const masks = maskBboxes || (maskBbox ? [{bbox: maskBbox, delay: maskAnimationDelay}] : []);

  const mask1Entrance = spring({
    frame: frame - (masks[0]?.delay || 0),
    fps,
    config: { damping: 20, stiffness: 50, mass: 1 },
  });
  const mask1OpacityValue = masks[0] ? interpolate(
    mask1Entrance,
    [0, 0.01, 0.99, 1],  // Instant on/off: 0% -> appear -> stay -> disappear
    [0, 1, 1, 0]  // Mask is instantly visible, then instantly gone at end
  ) : 0;

  const mask2Entrance = spring({
    frame: frame - (masks[1]?.delay || 0),
    fps,
    config: { damping: 20, stiffness: 50, mass: 1 },
  });
  const mask2OpacityValue = masks[1] ? interpolate(
    mask2Entrance,
    [0, 0.01, 0.99, 1],  // Instant on/off: 0% -> appear -> stay -> disappear
    [0, 1, 1, 0]  // Mask is instantly visible, then instantly gone at end
  ) : 0;

  // Rotation animation for cookie (360 degrees during focus animation)
  const rotationSpring = spring({
    frame: frame - rotationDelay,
    fps,
    config: {
      damping: 20,
      stiffness: 50,
      mass: 1,
    },
  });

  const rotation = shouldRotate
    ? interpolate(
        rotationSpring,
        [0, 1],
        [0, Math.PI * 2]  // 0 to 360 degrees (in radians)
      )
    : 0;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        position[0], // Keep X position constant
        position[1] + floatOffset, // Keep Y position constant (with float)
        animatedZ // Only animate Z
      );
      meshRef.current.scale.set(scale, scale, 1);

      // Apply rotation on Z axis (in the plane of the screen)
      meshRef.current.rotation.z = rotation;

      // Handle opacity for both standard and shader materials
      if (meshRef.current.material.uniforms) {
        // Shader material - update opacity and mask opacities
        meshRef.current.material.uniforms.opacity.value = opacity;

        // Update multiple mask opacities if present
        if (meshRef.current.material.uniforms.mask1Opacity) {
          meshRef.current.material.uniforms.mask1Opacity.value = mask1OpacityValue;
        }
        if (meshRef.current.material.uniforms.mask2Opacity) {
          meshRef.current.material.uniforms.mask2Opacity.value = mask2OpacityValue;
        }
      } else {
        // Standard material
        meshRef.current.material.opacity = opacity;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} renderOrder={isFocused ? 10 : 0}>
      <planeGeometry args={[size[0], size[1]]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};
