import { useState, useEffect } from 'react';
import { renderVideo, getRenderStatus, getFileUrl } from '../api';

export default function Step5Render({ detectionData, animationConfig }) {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    startRender();
  }, []);

  const startRender = async () => {
    try {
      setStatus('initializing');
      const result = await renderVideo(detectionData.detectionId, animationConfig);
      setJobId(result.jobId);
      setStatus('rendering');
    } catch (err) {
      console.error('Render error:', err);
      setError(err.response?.data?.error || err.message);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!jobId || status !== 'rendering') return;

    const pollInterval = setInterval(async () => {
      try {
        const statusData = await getRenderStatus(jobId);
        setStatus(statusData.status);
        setProgress(statusData.progress || 0);

        if (statusData.status === 'completed') {
          setVideoUrl(statusData.videoUrl);
          clearInterval(pollInterval);
        } else if (statusData.status === 'failed') {
          setError(statusData.error || 'Render failed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Status check error:', err);
        setError(err.response?.data?.error || err.message);
        setStatus('error');
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId, status]);

  const getStatusMessage = () => {
    switch (status) {
      case 'initializing':
        return 'Initializing render...';
      case 'rendering':
        return 'Rendering video...';
      case 'completed':
        return 'Video ready!';
      case 'failed':
      case 'error':
        return 'Render failed';
      default:
        return 'Processing...';
    }
  };

  const getStatusEmoji = () => {
    switch (status) {
      case 'initializing':
      case 'rendering':
        return '⏳';
      case 'completed':
        return '✅';
      case 'failed':
      case 'error':
        return '❌';
      default:
        return '🎬';
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Rendering Video</h2>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Your animation video is being generated
      </p>

      {/* Status Card */}
      <div
        style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '32px'
        }}
      >
        {/* Status Icon */}
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
          {getStatusEmoji()}
        </div>

        {/* Status Message */}
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          {getStatusMessage()}
        </h3>

        {/* Progress Bar */}
        {(status === 'initializing' || status === 'rendering') && (
          <div style={{ marginTop: '24px' }}>
            <div
              style={{
                width: '100%',
                height: '12px',
                background: '#e0e0e0',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '6px',
                  transition: 'width 0.3s ease',
                  width: `${progress}%`
                }}
              />
            </div>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {progress}% complete
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00'
            }}
          >
            {error}
          </div>
        )}

        {/* Download Button */}
        {status === 'completed' && videoUrl && (
          <div style={{ marginTop: '32px' }}>
            <a
              href={getFileUrl(videoUrl)}
              download
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: '#667eea',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Download Video
            </a>
          </div>
        )}

        {/* Retry Button */}
        {(status === 'failed' || status === 'error') && (
          <div style={{ marginTop: '32px' }}>
            <button
              onClick={startRender}
              style={{
                padding: '14px 32px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Retry Render
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      {(status === 'initializing' || status === 'rendering') && (
        <div
          style={{
            background: '#f0f4ff',
            border: '1px solid #667eea',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            color: '#333'
          }}
        >
          <p style={{ margin: 0 }}>
            This process typically takes 30-60 seconds depending on video complexity and server load.
          </p>
        </div>
      )}

      {/* Job ID for debugging */}
      {jobId && (
        <div
          style={{
            marginTop: '24px',
            padding: '12px',
            background: '#f9f9f9',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center'
          }}
        >
          Job ID: {jobId}
        </div>
      )}
    </div>
  );
}
