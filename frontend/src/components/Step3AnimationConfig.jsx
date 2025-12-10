import { useState } from 'react';

const ANIMATION_TYPES = [
  { value: 'pop-out', label: 'Pop Out' },
  { value: 'rotate-360', label: 'Rotate 360°' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-in', label: 'Slide In' },
  { value: 'scale-pop', label: 'Scale Pop' }
];

export default function Step3AnimationConfig({ selectedLayers, onComplete }) {
  const [animations, setAnimations] = useState(
    selectedLayers.map(layer => ({
      layerId: layer.id,
      type: 'pop-out',
      delay: 60,
      duration: 60
    }))
  );

  const updateAnimation = (index, field, value) => {
    setAnimations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleContinue = () => {
    onComplete({ animations });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Configure Animations</h2>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Set animation type, timing, and duration for each layer
      </p>

      {/* Animation Configurations */}
      <div style={{ display: 'grid', gap: '24px', marginBottom: '32px' }}>
        {selectedLayers.map((layer, index) => (
          <div
            key={layer.id}
            style={{
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '12px',
              background: 'white'
            }}
          >
            {/* Layer Header */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                {layer.label}
              </h3>
              <p style={{ fontSize: '14px', color: '#666' }}>
                {layer.element_type} • {layer.bounding_box.width}x{layer.bounding_box.height}
              </p>
            </div>

            {/* Animation Type Dropdown */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                Animation Type
              </label>
              <select
                value={animations[index].type}
                onChange={(e) => updateAnimation(index, 'type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {ANIMATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Delay Slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontWeight: 'bold' }}>Delay</label>
                <span style={{ color: '#667eea', fontWeight: 'bold' }}>
                  {animations[index].delay} frames
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={animations[index].delay}
                onChange={(e) => updateAnimation(index, 'delay', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e0e0e0',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999', marginTop: '4px' }}>
                <span>0</span>
                <span>180</span>
              </div>
            </div>

            {/* Duration Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontWeight: 'bold' }}>Duration</label>
                <span style={{ color: '#667eea', fontWeight: 'bold' }}>
                  {animations[index].duration} frames
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                value={animations[index].duration}
                onChange={(e) => updateAnimation(index, 'duration', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e0e0e0',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999', marginTop: '4px' }}>
                <span>30</span>
                <span>120</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        style={{
          width: '100%',
          padding: '14px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Continue to Preview
      </button>
    </div>
  );
}
