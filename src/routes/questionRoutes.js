const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// routes/exams.js
router.get('/exams/:id_dethi', async (req, res) => {
  try {
    const { id_dethi } = req.params;
    console.log('Verifying exam with id_dethi:', id_dethi);

    const examQuery = `SELECT id_dethi, ten_de, id_monhoc, ngay_tao FROM dethi WHERE id_dethi = ?`;
    const [examRows] = await pool.query(examQuery, [id_dethi]);

    if (examRows.length === 0) {
      console.error('Exam not found for id_dethi:', id_dethi);
      return res.status(404).json({ message: 'Không tìm thấy đề thi' });
    }

    res.status(200).json(examRows[0]);
  } catch (error) {
    console.error('Error verifying exam:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

router.post('/questions', async (req, res) => {
  let connection;
  try {
    const { examId, questions } = req.body;

    console.log('Received payload for /api/questions:', { examId, questions });

    if (!examId) {
      return res.status(400).json({ message: 'Thiếu examId' });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Danh sách câu hỏi không hợp lệ' });
    }

    for (const q of questions) {
      if (!q.text?.trim() || !q.correctAnswer?.trim() || !q.options || !q.id_monhoc) {
        return res.status(400).json({ message: 'Câu hỏi thiếu thông tin bắt buộc' });
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return res.status(400).json({ message: 'Mỗi câu hỏi phải có đúng 4 lựa chọn' });
      }
      if (!q.options.includes(q.correctAnswer)) {
        return res.status(400).json({ message: 'Đáp án đúng phải nằm trong các lựa chọn' });
      }
    }

    const normalizedExamId = String(examId).trim();
    const examQuery = `SELECT id_dethi, id_monhoc FROM dethi WHERE id_dethi = ?`;
    const [examRows] = await pool.query(examQuery, [normalizedExamId]);

    if (examRows.length === 0) {
      return res.status(404).json({
        message: 'Không tìm thấy đề thi',
        examId: normalizedExamId,
      });
    }

    const examMonhoc = examRows[0].id_monhoc;
    for (const q of questions) {
      if (q.id_monhoc !== examMonhoc) {
        return res.status(400).json({
          message: 'id_monhoc của câu hỏi không khớp với đề thi',
        });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const newQuestions = [];

    for (const q of questions) {
      const id_cauhoi = `CH${uuidv4().slice(0, 8)}`;

      const queryCauhoi = `
        INSERT INTO cauhoi (id_cauhoi, noidungcauhoi, dapan, id_monhoc)
        VALUES (?, ?, ?, ?)
      `;
      await connection.query(queryCauhoi, [
        id_cauhoi,
        q.text.trim(),
        q.correctAnswer.trim(),
        q.id_monhoc,
      ]);

      const optionsData = [];
      for (const option of q.options) {
        const id_cautraloi = `TL${uuidv4().slice(0, 8)}`;
        const queryCauTraLoi = `
          INSERT INTO cautraloi (id_cautraloi, id_cauhoi, noidungcautraloi)
          VALUES (?, ?, ?)
        `;
        await connection.query(queryCauTraLoi, [id_cautraloi, id_cauhoi, option.trim()]);
        optionsData.push(option.trim());
      }

      const queryDethiCauhoi = `
        INSERT INTO dethi_cauhoi (id_dethi, id_cauhoi)
        VALUES (?, ?)
      `;
      await connection.query(queryDethiCauhoi, [normalizedExamId, id_cauhoi]);

      newQuestions.push({
        id_cauhoi,
        noidungcauhoi: q.text.trim(),
        dapan: q.correctAnswer.trim(),
        options: optionsData,
        id_monhoc: q.id_monhoc,
      });
    }

    await connection.commit();
    res.status(200).json({
      message: 'Lưu câu hỏi thành công',
      questions: newQuestions,
    });
  } catch (error) {
    console.error('Error saving questions:', error.message, error.stack);
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    if (error.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ (môn học hoặc đề thi không tồn tại)',
      });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        message: 'ID câu hỏi hoặc đáp án trùng lặp, vui lòng thử lại',
      });
    }
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update a question
router.put('/questions/:id_cauhoi', async (req, res) => {
    try {
      const { id_cauhoi } = req.params;
      const { noidungcauhoi, dapan, options } = req.body;
  
      // Validate required fields
      if (!noidungcauhoi || !dapan || !options || !Array.isArray(options)) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      }
  
      // Verify question exists and get its associated exam
      const questionQuery = `
        SELECT c.*, dc.id_dethi
        FROM cauhoi c
        JOIN dethi_cauhoi dc ON c.id_cauhoi = dc.id_cauhoi
        WHERE c.id_cauhoi = ?
      `;
      const [questionRows] = await pool.query(questionQuery, [id_cauhoi]);
      if (questionRows.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
      }
  
      const id_dethi = questionRows[0].id_dethi;
  
      // Check if the new dapan matches the dapan of another question in the same exam
      const checkDapanQuery = `
        SELECT c.id_cauhoi
        FROM cauhoi c
        JOIN dethi_cauhoi dc ON c.id_cauhoi = dc.id_cauhoi
        WHERE dc.id_dethi = ? AND c.dapan = ? AND c.id_cauhoi != ?
      `;
      const [existingDapanRows] = await pool.query(checkDapanQuery, [id_dethi, dapan, id_cauhoi]);
      if (existingDapanRows.length > 0) {
        return res.status(400).json({
          message: 'Đáp án đúng trùng với đáp án của câu hỏi khác trong cùng đề thi',
        });
      }
  
      // Validate that dapan is one of the provided options
      if (!options.includes(dapan)) {
        return res.status(400).json({ message: 'Đáp án đúng phải nằm trong các lựa chọn' });
      }
  
      // Start a transaction to ensure atomicity
      const connection = await pool.getConnection();
      await connection.beginTransaction();
  
      try {
        // Update question details
        const updateQuestionQuery = `
          UPDATE cauhoi
          SET noidungcauhoi = ?, dapan = ?
          WHERE id_cauhoi = ?
        `;
        await connection.query(updateQuestionQuery, [noidungcauhoi, dapan, id_cauhoi]);
  
        // Fetch existing options to get their id_cautraloi values
        const fetchOptionsQuery = `
          SELECT id_cautraloi
          FROM cautraloi
          WHERE id_cauhoi = ?
          ORDER BY id_cautraloi
        `;
        const [existingOptions] = await connection.query(fetchOptionsQuery, [id_cauhoi]);
  
        // Validate that the number of options matches
        if (existingOptions.length !== options.length) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: `Số lượng lựa chọn cung cấp (${options.length}) không khớp với số lượng hiện có (${existingOptions.length})`,
          });
        }
  
        // Update existing options
        const updateOptionQuery = `
          UPDATE cautraloi
          SET noidungcautraloi = ?
          WHERE id_cautraloi = ?
        `;
        for (let i = 0; i < options.length; i++) {
          const id_cautraloi = existingOptions[i].id_cautraloi;
          await connection.query(updateOptionQuery, [options[i], id_cautraloi]);
        }
  
        // Commit transaction
        await connection.commit();
        res.status(200).json({ message: 'Cập nhật câu hỏi thành công' });
      } catch (error) {
        // Rollback transaction on error
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật câu hỏi:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  });
  
  // Delete a question
  router.delete('/questions/:id_cauhoi', async (req, res) => {
    try {
      const { id_cauhoi } = req.params;
  
      // Verify question exists
      const questionQuery = `SELECT * FROM cauhoi WHERE id_cauhoi = ?`;
      const [questionRows] = await pool.query(questionQuery, [id_cauhoi]);
      if (questionRows.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
      }
  
      // Delete question (cascades to cautraloi and dethi_cauhoi due to ON DELETE CASCADE)
      const deleteQuestionQuery = `DELETE FROM cauhoi WHERE id_cauhoi = ?`;
      await pool.query(deleteQuestionQuery, [id_cauhoi]);
  
      res.status(200).json({ message: 'Xóa câu hỏi thành công' });
    } catch (error) {
      console.error('Lỗi khi xóa câu hỏi:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  });

module.exports = router;