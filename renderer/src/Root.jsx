import { Composition, staticFile } from 'remotion';
import { ExplodedUI } from './compositions/ExplodedUI.jsx';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ExplodedUI"
        component={ExplodedUI}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          screenshotUrl: staticFile('url-screenshot.png'),
          detectionDataPath: staticFile('url-detection.json'),
          animationPreset: 'focus-layer',
          animationConfigPath: null  // Will be passed via --props when rendering from API
        }}
      />
    </>
  );
};
