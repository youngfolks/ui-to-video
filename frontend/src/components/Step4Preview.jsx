import { getFileUrl } from '../api';

export default function Step4Preview({ detectionData, animationConfig, onBack, onRender }) {
  const { screenshotUrl } = detectionData;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Preview Animation</h2>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Preview your animation before rendering the final video
      </p>

      {/* Preview Container */}
      <div
        style={{
          background: '#f5f5f5',
          borderRadius: '12px',
          padding: '60px 40px',
          marginBottom: '32px',
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Placeholder Image */}
        <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
          <img
            src={getFileUrl(screenshotUrl)}
            alt="Preview"
            style={{
              width: '100%',
              borderRadius: '8px',
              border: '2px solid #ddd'
            }}
          />
        </div>

        {/* Placeholder Message */}
        <div
          style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            maxWidth: '500px'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
          <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            Preview will be available after renderer is set up
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            The Remotion Player integration requires additional renderer configuration
          </p>
        </div>
      </div>

      {/* Animation Summary */}
      <div
        style={{
          background: 'white',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '12px',
          marginBottom: '32px'
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          Animation Summary
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {animationConfig.animations.map((anim, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                background: '#f9f9f9',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontWeight: 'bold' }}>Layer {anim.layerId}</span>
                <span style={{ color: '#666', marginLeft: '12px' }}>
                  {anim.type.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Delay: {anim.delay}f • Duration: {anim.duration}f
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: '14px',
            background: 'white',
            color: '#667eea',
            border: '2px solid #667eea',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Back to Edit
        </button>
        <button
          onClick={onRender}
          style={{
            flex: 1,
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
          Render Video
        </button>
      </div>
    </div>
  );
}
