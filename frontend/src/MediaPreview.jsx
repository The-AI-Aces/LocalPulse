function MediaPreview({ file, onRetake, onConfirm }) {
  if (!file) return null

  const url = URL.createObjectURL(file)
  const isVideo = file.type.startsWith('video')

  return (
    <div className="preview-overlay">
      <div className="preview-box">
        {isVideo ? (
          <video src={url} controls className="preview-media" />
        ) : (
          <img src={url} alt="Captured preview" className="preview-media" />
        )}

        <div className="preview-buttons">
          <button className="retake-btn" onClick={onRetake}>
            Retake
          </button>
          <button className="confirm-btn" onClick={onConfirm}>
            Use This
          </button>
        </div>
      </div>
    </div>
  )
}

export default MediaPreview