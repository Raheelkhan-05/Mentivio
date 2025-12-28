import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Loader, CloudUpload, Sparkles, BookOpen, Brain, Target } from 'lucide-react';
import { uploadMaterial } from '../services/api';

function Upload({ userId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.type === 'text/plain')) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage('error:Please select a file');
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
        setMessage('success:Material uploaded and processed successfully!');
        setFile(null);
        setTitle('');
        setSubject('');
        setTopics('');

        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        setMessage('error:Upload failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      setMessage('error:' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setTitle('');
  };

  const isError = message.startsWith('error:');
  const isSuccess = message.startsWith('success:');
  const displayMessage = message.replace(/^(error:|success:)/, '');

  return (
    <div className="flex flex-1 flex-col bg-gray-50 max-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Upload Study Material</h2>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Upload PDFs or text files to start learning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-visible">
        <div className="p-4 sm:p-6 lg:pt-3 lg:p-8 ">
          <div className="max-w-5xl mx-auto">
            {/* Message Banner */}
            {message && (
              <div className={`mb-4 p-3 sm:p-4 rounded-lg border flex items-start gap-2 sm:gap-3 ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                {isSuccess ? (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <p className={`text-xs sm:text-sm flex-1 ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                  {displayMessage}
                </p>
                <button
                  onClick={() => setMessage('')}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-4 lg:gap-3">
              {/* Upload Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-4">
                    {/* File Upload Area */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload File
                      </label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : file
                              ? 'border-green-400 bg-green-50'
                              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                          }`}
                      >
                        {!file ? (
                          <label className="flex flex-col items-center justify-center px-4 py-8 sm:py-5 cursor-pointer">
                            <div className="w-12 h-12 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-3 sm:mb-4">
                              <CloudUpload className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 text-center px-2">
                              Drop your file here, or click to browse
                            </p>
                            <p className="text-xs text-gray-500 text-center">
                              Supports PDF and TXT files
                            </p>
                            <input
                              type="file"
                              accept=".pdf,.txt"
                              onChange={handleFileChange}
                              disabled={uploading}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={removeFile}
                              disabled={uploading}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                            >
                              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Chapter 5 Notes"
                        disabled={uploading}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                      />
                    </div>

                    {/* Subject Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Computer Science"
                        disabled={uploading}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                      />
                    </div>

                    {/* Topics Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Topics <span className="text-gray-400 text-xs">(optional, comma-separated)</span>
                      </label>
                      <input
                        type="text"
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        placeholder="e.g., Machine Learning, Neural Networks"
                        disabled={uploading}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmit}
                      disabled={uploading || !file}
                      className="w-full py-2.5 sm:py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {uploading ? (
                        <>
                          <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Upload and Process</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Panel */}
              <div className="space-y-2">
                {/* How it Works - Redesigned */}
                <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 rounded-xl border border-blue-100 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">How it works</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-lg p-3 border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <CloudUpload className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-xs font-semibold text-gray-700 leading-relaxed">Upload your study materials in PDF or text format</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-lg p-3 border border-purple-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-xs font-semibold text-gray-700 leading-relaxed">AI processes and analyzes your content intelligently</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-lg p-3 border border-green-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-xs font-semibold text-gray-700 leading-relaxed">Generate quizzes, flashcards, and ask questions</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-lg p-3 border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <Target className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-xs font-semibold text-gray-700 leading-relaxed">Track your progress and improve your learning</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supported Formats */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm ">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Supported Formats</h3>
                  <div className="space-y-2.5 pb-16 lg:pb-0">
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs sm:text-xs font-semibold text-gray-700">PDF Documents</span>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-purple-50 border border-purple-100">
                      <div className="w-8 h-8 rounded bg-purple-500 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs sm:text-xs font-semibold text-gray-700 ">Text Files (.txt)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upload;