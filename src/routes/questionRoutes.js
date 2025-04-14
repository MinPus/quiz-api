const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

router.post('/questions', async (req, res) => {
    let connection;
    try {
      const { examId, questions } = req.body;
  
      // Validate input
      if (!examId || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Thiếu examId hoặc danh sách câu hỏi' });
      }
  
      // Validate each question
      for (const q of questions) {
        if (!q.text || !q.correctAnswer || !q.options || !q.id_monhoc) {
          return res.status(400).json({ message: 'Câu hỏi thiếu thông tin bắt buộc' });
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          return res.status(400).json({ message: 'Mỗi câu hỏi phải có đúng 4 lựa chọn' });
        }
        if (!q.options.includes(q.correctAnswer)) {
          return res.status(400).json({ message: 'Đáp án đúng phải nằm trong các lựa chọn' });
        }
      }
  
      // Verify exam exists
      const examQuery = `SELECT id_dethi FROM dethi WHERE id_dethi = ?`;
      const [examRows] = await pool.query(examQuery, [examId]);
      if (examRows.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đề thi' });
      }
  
      connection = await pool.getConnection();
      await connection.beginTransaction();
  
      const newQuestions = [];
  
      for (const q of questions) {
        const id_cauhoi = `CH${uuidv4().slice(0, 8)}`; // Shortened UUID for consistency
        const queryCauhoi = `
          INSERT INTO cauhoi (id_cauhoi, noidungcauhoi, dapan, id_monhoc)
          VALUES (?, ?, ?, ?)
        `;
        await connection.query(queryCauhoi, [
          id_cauhoi,
          q.text,
          q.correctAnswer,
          q.id_monhoc,
        ]);
  
        const optionsData = [];
        for (const [index, option] of q.options.entries()) {
          const id_cautraloi = `TL${uuidv4().slice(0, 8)}`;
          const queryCauTraLoi = `
            INSERT INTO cautraloi (id_cautraloi, id_cauhoi, noidungcautraloi)
            VALUES (?, ?, ?)
          `;
          await connection.query(queryCauTraLoi, [id_cautraloi, id_cauhoi, option]);
          optionsData.push(option);
        }
  
        const queryDethiCauhoi = `
          INSERT INTO dethi_cauhoi (id_dethi, id_cauhoi)
          VALUES (?, ?)
        `;
        await connection.query(queryDethiCauhoi, [examId, id_cauhoi]);
  
        newQuestions.push({
          id_cauhoi,
          noidungcauhoi: q.text,
          dapan: q.correctAnswer,
          options: optionsData,
        });
      }
  
      await connection.commit();
      res.status(200).json({ message: 'Lưu câu hỏi thành công', questions: newQuestions });
    } catch (error) {
      console.error('Lỗi khi lưu câu hỏi:', error);
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      res.status(500).json({ message: 'Lỗi server', error: error.message });
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