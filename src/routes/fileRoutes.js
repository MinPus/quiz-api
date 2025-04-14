const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processFile } = require('../controllers/fileController');

// Cấu hình multer để lưu file tạm thời
const upload = multer({ dest: 'uploads/' });

router.post('/upload-questions', upload.single('file'), processFile);

module.exports = router;