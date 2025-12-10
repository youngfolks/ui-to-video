import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile, detectFromUrl } from '../api';

export default function Step1Upload({ onComplete }) {
  const [mode, setMode] = useState('url'); // 'url' or 'upload'
  const [url, setUrl] = useState('');
  const [isMobile, setIsMobile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await handleFileUpload(acceptedFiles[0]);
      }
    }
  });

  const handleFileUpload = async (file) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Uploading file:', file.name);
      const result = await uploadFile(file);
      console.log('Upload result:', result);
      onComplete(result);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlDetection = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Detecting from URL:', url, 'Mobile:', isMobile);
      const result = await detectFromUrl(url, isMobile);
      console.log('Detection result:', result);
      onComplete(result);
    } catch (err) {
      console.error('Detection error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Create UI Animation</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>Upload a screenshot or enter a URL to get started</p>

      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => setMode('url')}
          style={{
            flex: 1,
            padding: '12px 24px',
            border: mode === 'url' ? '2px solid #667eea' : '1px solid #ddd',
            background: mode === 'url' ? '#f0f4ff' : 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: mode === 'url' ? 'bold' : 'normal'
          }}
        >
          Enter URL
        </button>
        <button
          onClick={() => setMode('upload')}
          style={{
            flex: 1,
            padding: '12px 24px',
            border: mode === 'upload' ? '2px solid #667eea' : '1px solid #ddd',
            background: mode === 'upload' ? '#f0f4ff' : 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: mode === 'upload' ? 'bold' : 'normal'
          }}
        >
          Upload Image
        </button>
      </div>

      {/* URL Input */}
      {mode === 'url' && (
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '16px'
            }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <input
              type="checkbox"
              checked={isMobile}
              onChange={(e) => setIsMobile(e.target.checked)}
            />
            <span>Mobile viewport (390x844)</span>
          </label>

          <button
            onClick={handleUrlDetection}
            disabled={loading || !url.trim()}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !url.trim() ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading || !url.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze Layers'}
          </button>
        </div>
      )}

      {/* File Upload */}
      {mode === 'upload' && (
        <div
          {...getRootProps()}
          style={{
            border: '2px dashed #667eea',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragActive ? '#f0f4ff' : 'white'
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          {isDragActive ? (
            <p style={{ fontSize: '18px', color: '#667eea' }}>Drop the image here...</p>
          ) : (
            <>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>Drag & drop an image here</p>
              <p style={{ color: '#666', fontSize: '14px' }}>or click to browse</p>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00'
        }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ marginTop: '24px', textAlign: 'center', color: '#666' }}>
          <div style={{ marginBottom: '8px' }}>⏳ {mode === 'url' ? 'Capturing screenshot and detecting layers...' : 'Analyzing image...'}</div>
          <div style={{ fontSize: '14px' }}>This may take 5-10 seconds</div>
        </div>
      )}
    </div>
  );
}
