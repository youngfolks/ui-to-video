import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { LayerPlane } from './LayerPlane.jsx';
import { CameraRig } from './CameraRig.jsx';
import { useState, useEffect } from 'react';

export const ExplodedUI = ({
  screenshotUrl,
  detectionDataPath,
  animationPreset,
  animationConfigPath  // NEW: Path to animation config JSON
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const [detectionData, setDetectionData] = useState(null);
  const [animationConfig, setAnimationConfig] = useState(null);  // NEW

  useEffect(() => {
    // Load detection data using staticFile() for proper path resolution
    const detectionUrl = detectionDataPath.startsWith('http') || detectionDataPath.startsWith('/')
      ? detectionDataPath
      : staticFile(detectionDataPath);

    fetch(detectionUrl)
      .then(res => res.json())
      .then(data => setDetectionData(data))
      .catch(err => {
        console.error('Failed to load detection data:', err);
        // Fallback mock data for development
        setDetectionData({
          layers: [],
          dimensions: { width: 390, height: 844 }
        });
      });

    // Load animation config if provided
    if (animationConfigPath) {
      const configUrl = animationConfigPath.startsWith('http') || animationConfigPath.startsWith('/')
        ? animationConfigPath
        : staticFile(animationConfigPath);

      fetch(configUrl)
        .then(res => res.json())
        .then(data => setAnimationConfig(data))
        .catch(err => {
          console.warn('Failed to load animation config:', err);
          setAnimationConfig({ animations: [] });
        });
    } else {
      setAnimationConfig({ animations: [] });
    }
  }, [detectionDataPath, animationConfigPath]);

  if (!detectionData || !animationConfig) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div>Loading...</div>
      </AbsoluteFill>
    );
  }

  const { layers, dimensions } = detectionData;

  // Build animation map from config
  const animationMap = new Map();
  if (animationConfig.animations) {
    animationConfig.animations.forEach(anim => {
      animationMap.set(anim.layerId, anim);
    });
  }

  // Debug: log animation config
  console.log('Animation config:', animationConfig);
  console.log('Layers to animate:', animationMap.size);

  // Calculate normalized positions for Three.js (-1 to 1 coordinate system)
  const normalizedLayers = layers.map((layer, index) => {
    const bbox = layer.bounding_box;

    // Center position of the element
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    // Background plane dimensions
    const bgWidth = 2;
    const bgHeight = 2 * (dimensions.height / dimensions.width);

    // Normalize to match background plane coordinate system
    // X: left = -1, right = 1 (width = 2)
    // Y: top = bgHeight/2, bottom = -bgHeight/2 (height = bgHeight)
    const normalizedX = (centerX / dimensions.width) * bgWidth - bgWidth/2;
    const normalizedY = -(centerY / dimensions.height) * bgHeight + bgHeight/2;

    // Calculate size in normalized units (matching background plane scale)
    const normalizedWidth = (bbox.width / dimensions.width) * bgWidth;
    const normalizedHeight = (bbox.height / dimensions.height) * bgHeight;

    // Get animation config for this layer
    const layerAnimation = animationMap.get(index);
    const hasAnimation = !!layerAnimation;

    // Map animation type to legacy flags for backward compatibility
    const isFocused = layerAnimation?.type === 'pop-out';
    const shouldRotate = layerAnimation?.type === 'rotate-360';

    // Z position: animated layers start at background level
    const zStartPosition = hasAnimation ? -0.1 : -0.15;
    const zEndPosition = hasAnimation ? 0.1 : -0.05;

    return {
      ...layer,
      position: [normalizedX, normalizedY, zStartPosition],
      endPosition: [normalizedX, normalizedY, zEndPosition],
      size: [normalizedWidth, normalizedHeight],
      animationDelay: layerAnimation?.delay || 0,
      rotationDelay: layerAnimation?.delay || 0,
      animationDuration: layerAnimation?.duration || 60,
      animationType: layerAnimation?.type || null,
      isFocused,
      shouldRotate,
      hasAnimation
    };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{
          fov: 45,
          position: [0, 0, 5]
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <CameraRig
          preset={animationPreset}
          frame={frame}
          fps={fps}
          duration={durationInFrames}
        />

        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />

        {/* Background plane - full screenshot with cutout masks for animated layers */}
        <LayerPlane
          imageUrl={screenshotUrl}
          position={[0, 0, -0.1]}
          size={[2, 2 * (dimensions.height / dimensions.width)]}
          frame={frame}
          fps={fps}
          animationDelay={0}
          isBackground={true}
          maskBboxes={normalizedLayers.filter(l => l.hasAnimation).map(l => ({
            bbox: l.bounding_box,
            delay: l.animationDelay || 0
          }))}
          canvasDimensions={dimensions}
        />

        {/* Render animated layers */}
        {(() => {
          const animatedLayers = normalizedLayers.filter(layer => layer.hasAnimation);
          console.log('Rendering animated layers:', animatedLayers.length, animatedLayers.map(l => `${l.label} (type: ${l.animationType})`));
          return animatedLayers.map((layer, index) => (
            <LayerPlane
              key={index}
              imageUrl={screenshotUrl}
              position={layer.position}
              endPosition={layer.endPosition}
              size={layer.size}
              frame={frame}
              fps={fps}
              animationDelay={layer.animationDelay}
              zDepth={layer.z_depth}
              bbox={layer.bounding_box}
              canvasDimensions={dimensions}
              isFocused={layer.isFocused}
              shouldRotate={layer.shouldRotate}
              rotationDelay={layer.rotationDelay}
            />
          ));
        })()}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
