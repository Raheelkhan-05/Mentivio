const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const Material = require('../models/Material');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload material
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, title, subject, topics } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create material record
    const material = new Material({
      userId,
      title: title || req.file.originalname,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      subject: subject || 'General',
      topics: topics ? JSON.parse(topics) : [],
      processingStatus: 'processing'
    });

    await material.save();
    const absolutePath = path.resolve(req.file.path);
    // Send to Flask service for processing
    try {
      const flaskResponse = await axios.post(
        `${process.env.FLASK_SERVICE_URL || 'http://localhost:5000'}/process-document`,
        {
          file_path: absolutePath,
          user_id: userId,
          material_id: material._id.toString()
        }
      );

      if (flaskResponse.data.success) {
        material.processingStatus = 'completed';
        material.chunksCount = flaskResponse.data.chunks_processed;
        material.processedAt = new Date();
        await material.save();

        res.json({
          success: true,
          material: material,
          message: 'Material uploaded and processed successfully'
        });
      } else {
        material.processingStatus = 'failed';
        await material.save();
        res.status(500).json({
          error: 'Processing failed',
          details: flaskResponse.data.error
        });
      }
    } catch (flaskError) {
      material.processingStatus = 'failed';
      await material.save();
      console.error('Flask service error:', flaskError.message);
      res.status(500).json({
        error: 'Failed to process document',
        details: flaskError.message
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's materials
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const materials = await Material.find({ userId })
      .sort({ uploadedAt: -1 });
    
    res.json({ materials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get material by ID
router.get('/material/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;
    const material = await Material.findById(materialId);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({ material });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete material
router.delete('/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;
    const material = await Material.findByIdAndDelete(materialId);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    // TODO: Delete file from filesystem and embeddings from MongoDB
    
    res.json({ success: true, message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;