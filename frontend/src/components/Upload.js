import React, { useState } from 'react';
import { uploadMaterial } from '../services/api';

function Upload({ userId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('topics', JSON.stringify(topics.split(',').map(t => t.trim()).filter(t => t)));

      const response = await uploadMaterial(formData);
      
      if (response.success) {
        setMessage('✅ Material uploaded and processed successfully!');
        setFile(null);
        setTitle('');
        setSubject('');
        setTopics('');
        
        // Reset file input
        document.getElementById('fileInput').value = '';
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        setMessage('❌ Upload failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Study Material</h2>
      <p>Upload PDFs or text files to start learning</p>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label>File (PDF or TXT)</label>
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {file && <p className="file-info">Selected: {file.name}</p>}
        </div>

        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 5 Notes"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label>Subject (optional)</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Computer Science"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label>Topics (optional, comma-separated)</label>
          <input
            type="text"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="e.g., Machine Learning, Neural Networks"
            disabled={uploading}
          />
        </div>

        <button type="submit" disabled={uploading || !file} className="btn-primary">
          {uploading ? 'Uploading...' : 'Upload and Process'}
        </button>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </form>

      <div className="upload-info">
        <h3>How it works:</h3>
        <ol>
          <li>Upload your study materials (PDF or text)</li>
          <li>AI processes and analyzes the content</li>
          <li>Ask questions, generate quizzes, or create flashcards</li>
          <li>Track your progress and improve!</li>
        </ol>
      </div>
    </div>
  );
}

export default Upload;