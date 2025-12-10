import { useState } from 'react';
import './App.css';

// Step components (to be implemented)
import Step1Upload from './components/Step1Upload';
import Step2LayerSelector from './components/Step2LayerSelector';
import Step3AnimationConfig from './components/Step3AnimationConfig';
import Step4Preview from './components/Step4Preview';
import Step5Render from './components/Step5Render';

function App() {
  const [step, setStep] = useState(1);
  const [detectionData, setDetectionData] = useState(null);
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [animationConfig, setAnimationConfig] = useState({});

  const handleUploadComplete = (data) => {
    setDetectionData(data);
    setStep(2);
  };

  const handleLayerSelectionComplete = (selected) => {
    setSelectedLayers(selected);
    setStep(3);
  };

  const handleAnimationConfigComplete = (config) => {
    setAnimationConfig(config);
    setStep(4);
  };

  const handleRender = () => {
    setStep(5);
  };

  const handleBack = () => {
    setStep(3);
  };

  return (
    <div className="app">
      <div className="stepper-container">
        <div className="stepper-header">
          <h1>UI to Video</h1>
          <div className="step-indicator">
            <span className="step-text">Step {step} of 5</span>
            <div className="step-dots">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`step-dot ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="step-content">
          {step === 1 && <Step1Upload onComplete={handleUploadComplete} />}
          {step === 2 && (
            <Step2LayerSelector
              detectionData={detectionData}
              onComplete={handleLayerSelectionComplete}
            />
          )}
          {step === 3 && (
            <Step3AnimationConfig
              selectedLayers={selectedLayers}
              onComplete={handleAnimationConfigComplete}
            />
          )}
          {step === 4 && (
            <Step4Preview
              detectionData={detectionData}
              animationConfig={animationConfig}
              onRender={handleRender}
              onBack={handleBack}
            />
          )}
          {step === 5 && (
            <Step5Render
              detectionData={detectionData}
              animationConfig={animationConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
