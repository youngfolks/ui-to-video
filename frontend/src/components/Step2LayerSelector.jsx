import { useState } from 'react';
import { getFileUrl } from '../api';

export default function Step2LayerSelector({ detectionData, onComplete }) {
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [hoveredLayer, setHoveredLayer] = useState(null);

  const { screenshotUrl, detectionData: data } = detectionData;
  const layers = data?.layers || [];
  const dimensions = data?.dimensions || { width: 1080, height: 1920 };

  const toggleLayer = (index) => {
    setSelectedLayers(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleNext = () => {
    const selected = selectedLayers.map(index => ({
      id: index,
      ...layers[index]
    }));
    onComplete(selected);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Select Layers to Animate</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Click on layers to select them ({selectedLayers.length} selected)
      </p>

      {/* Screenshot with Layer Overlays */}
      <div style={{ position: 'relative', marginBottom: '32px', background: '#f5f5f5', borderRadius: '12px', overflow: 'hidden' }}>
        <img
          src={getFileUrl(screenshotUrl)}
          alt="Screenshot"
          style={{ width: '100%', display: 'block' }}
        />

        {/* SVG Overlay for Layer Rectangles */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        >
          {layers.map((layer, index) => {
            const { x, y, width, height } = layer.bounding_box;
            const isSelected = selectedLayers.includes(index);
            const isHovered = hoveredLayer === index;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={isSelected ? 'rgba(102, 126, 234, 0.3)' : (isHovered ? 'rgba(102, 126, 234, 0.1)' : 'transparent')}
                  stroke={isSelected ? '#667eea' : (isHovered ? '#667eea' : '#888')}
                  strokeWidth={isSelected ? 4 : 2}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={() => toggleLayer(index)}
                  onMouseEnter={() => setHoveredLayer(index)}
                  onMouseLeave={() => setHoveredLayer(null)}
                />
                {(isSelected || isHovered) && (
                  <text
                    x={x + 8}
                    y={y - 8}
                    fill="#667eea"
                    fontSize="14"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {layer.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Layer List */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Detected Layers ({layers.length})</h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          {layers.map((layer, index) => (
            <div
              key={index}
              onClick={() => toggleLayer(index)}
              onMouseEnter={() => setHoveredLayer(index)}
              onMouseLeave={() => setHoveredLayer(null)}
              style={{
                padding: '12px',
                border: selectedLayers.includes(index) ? '2px solid #667eea' : '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedLayers.includes(index) ? '#f0f4ff' : 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold' }}>{layer.label}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {layer.element_type} • {layer.bounding_box.width}x{layer.bounding_box.height}
                </div>
              </div>
              {selectedLayers.includes(index) && <span style={{ color: '#667eea', fontSize: '20px' }}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <button
        onClick={handleNext}
        disabled={selectedLayers.length === 0}
        style={{
          width: '100%',
          padding: '14px',
          background: selectedLayers.length === 0 ? '#ccc' : '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: selectedLayers.length === 0 ? 'not-allowed' : 'pointer'
        }}
      >
        Continue with {selectedLayers.length} Layer{selectedLayers.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}
