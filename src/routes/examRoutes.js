const express = require('express');
const router = express.Router();
const pool = require('../db');

// Thêm bài thi (already provided)
router.post('/exams', async (req, res) => {
  try {
    const {
      id_dethi,
      id_giaovien,
      id_monhoc,
      tendethi,
      ngay_tao,
      thoigianthi,
      trangthai,
      thoigianbatdau,
      thoigianketthuc,
    } = req.body;

    if (
      !id_dethi ||
      !id_giaovien ||
      !id_monhoc ||
      !ngay_tao ||
      !thoigianthi ||
      !thoigianbatdau ||
      !thoigianketthuc
    ) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    console.log('Received ngay_tao:', ngay_tao);

    const query = `
      INSERT INTO dethi (id_dethi, id_giaovien, id_monhoc, tendethi, ngay_tao, thoigianthi, trangthai, thoigianbatdau, thoigianketthuc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [
      id_dethi,
      id_giaovien,
      id_monhoc,
      tendethi,
      ngay_tao,
      thoigianthi,
      trangthai,
      thoigianbatdau,
      thoigianketthuc,
    ]);

    res.status(200).json({ message: 'Tạo bài thi thành công', id_dethi });
  } catch (error) {
    console.error('Lỗi khi tạo bài thi:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xem chi tiết bài thi
router.get('/dethi/:id_dethi', async (req, res) => {
    try {
      const { id_dethi } = req.params;
  
      // Fetch exam details
      const examQuery = `
        SELECT d.*, m.tenmonhoc, g.ten_giaovien
        FROM dethi d
        JOIN monhoc m ON d.id_monhoc = m.id_monhoc
        JOIN giaovien g ON d.id_giaovien = g.id_giaovien
        WHERE d.id_dethi = ?
      `;
      const [examRows] = await pool.query(examQuery, [id_dethi]);
  
      if (examRows.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy đề thi' });
      }
  
      // Fetch questions associated with the exam
      const questionsQuery = `
        SELECT c.id_cauhoi, c.noidungcauhoi, c.dapan
        FROM cauhoi c
        JOIN dethi_cauhoi dc ON c.id_cauhoi = dc.id_cauhoi
        WHERE dc.id_dethi = ?
      `;
      const [questionRows] = await pool.query(questionsQuery, [id_dethi]);
  
      // Fetch options for each question
      const questions = await Promise.all(
        questionRows.map(async (question) => {
          const optionsQuery = `
            SELECT noidungcautraloi
            FROM cautraloi
            WHERE id_cauhoi = ?
          `;
          const [optionRows] = await pool.query(optionsQuery, [question.id_cauhoi]);
          return {
            ...question,
            options: optionRows.map((opt) => opt.noidungcautraloi),
          };
        })
      );
  
      // Combine exam details with questions
      const result = {
        ...examRows[0],
        questions,
      };
  
      res.status(200).json(result);
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết đề thi:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  });

// Cập nhật bài thi
router.put('/dethi/:id_dethi', async (req, res) => {
  try {
    const { id_dethi } = req.params;
    const { thoigianthi, trangthai } = req.body;

    if (!thoigianthi || !trangthai) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const query = `
      UPDATE dethi
      SET thoigianthi = ?, trangthai = ?
      WHERE id_dethi = ?
    `;
    const [result] = await pool.query(query, [thoigianthi, trangthai, id_dethi]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi để cập nhật' });
    }

    res.status(200).json({ message: 'Cập nhật đề thi thành công' });
  } catch (error) {
    console.error('Lỗi khi cập nhật đề thi:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa bài thi
router.delete('/dethi/:id_dethi', async (req, res) => {
  try {
    const { id_dethi } = req.params;

    const query = `
      DELETE FROM dethi
      WHERE id_dethi = ?
    `;
    const [result] = await pool.query(query, [id_dethi]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi để xóa' });
    }

    res.status(200).json({ message: 'Xóa đề thi thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa đề thi:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;