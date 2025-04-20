const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// Thêm bài thi
router.post('/exams', async (req, res) => {
  let connection;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const {
        id_giaovien,
        id_monhoc,
        tendethi,
        ngay_tao,
        thoigianthi,
        trangthai,
        thoigianbatdau,
        thoigianketthuc,
        is_restricted = 0, // Default: unrestricted
        allowed_students = [], // Array of id_hocsinh
      } = req.body;

      // Validate required fields
      if (
        !id_giaovien ||
        !id_monhoc ||
        !tendethi ||
        !ngay_tao ||
        !thoigianthi ||
        !trangthai ||
        !thoigianbatdau ||
        !thoigianketthuc
      ) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      }

      // Generate id_dethi
      const id_dethi = `DT${uuidv4().slice(0, 8)}`;

      // Start transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Insert exam
      const query = `
        INSERT INTO dethi (id_dethi, id_giaovien, id_monhoc, tendethi, ngay_tao, thoigianthi, trangthai, thoigianbatdau, thoigianketthuc, is_restricted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await connection.query(query, [
        id_dethi,
        id_giaovien,
        id_monhoc,
        tendethi,
        ngay_tao,
        thoigianthi,
        trangthai,
        thoigianbatdau,
        thoigianketthuc,
        is_restricted,
      ]);

      if (result.affectedRows !== 1) {
        throw new Error('Failed to insert exam');
      }

      // Insert allowed students if restricted
      if (is_restricted && allowed_students.length > 0) {
        const values = allowed_students.map(id_hocsinh => [id_dethi, id_hocsinh]);
        await connection.query(
          `INSERT INTO dethi_hocsinh (id_dethi, id_hocsinh) VALUES ?`,
          [values]
        );
      }

      await connection.commit();
      res.status(201).json({
        message: 'Tạo bài thi thành công',
        exam: {
          id_dethi,
          id_giaovien,
          id_monhoc,
          tendethi,
          ngay_tao,
          thoigianthi,
          trangthai,
          thoigianbatdau,
          thoigianketthuc,
          is_restricted,
          allowed_students,
        },
      });
      return;
    } catch (error) {
      attempts++;
      if (connection) await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
        console.warn(`Duplicate id_dethi detected, retrying (${attempts}/${maxAttempts})`);
        continue;
      }
      console.error('Lỗi khi tạo bài thi:', error.message);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
      return;
    } finally {
      if (connection) connection.release();
    }
  }
});

// Cập nhật danh sách học sinh cho đề thi
router.post('/dethi/:id_dethi/students', async (req, res) => {
  let connection;
  try {
    const { id_dethi } = req.params;
    const { allowed_students = [], is_restricted } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update is_restricted
    await connection.query(
      `UPDATE dethi SET is_restricted = ? WHERE id_dethi = ?`,
      [is_restricted ? 1 : 0, id_dethi]
    );

    // Clear existing assignments
    await connection.query(
      `DELETE FROM dethi_hocsinh WHERE id_dethi = ?`,
      [id_dethi]
    );

    // Insert new assignments if restricted
    if (is_restricted && allowed_students.length > 0) {
      const values = allowed_students.map(id_hocsinh => [id_dethi, id_hocsinh]);
      await connection.query(
        `INSERT INTO dethi_hocsinh (id_dethi, id_hocsinh) VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Cập nhật danh sách học sinh thành công' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Lỗi khi cập nhật danh sách học sinh:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Lấy chi tiết đề thi (no changes needed unless you want to include allowed_students)
router.get('/dethi/:id_dethi', async (req, res) => {
  try {
    const { id_dethi } = req.params;
    console.log('Fetching exam with id_dethi:', id_dethi);

    const examQuery = `
      SELECT d.*, m.tenmonhoc, g.ten_giaovien
      FROM dethi d
      JOIN monhoc m ON d.id_monhoc = m.id_monhoc
      JOIN giaovien g ON d.id_giaovien = g.id_giaovien
      WHERE d.id_dethi = ?
    `;
    const [examRows] = await pool.query(examQuery, [id_dethi]);

    if (examRows.length === 0) {
      console.error('Exam not found for id_dethi:', id_dethi);
      return res.status(404).json({ message: 'Không tìm thấy đề thi' });
    }

    const questionsQuery = `
      SELECT c.id_cauhoi, c.noidungcauhoi, c.dapan
      FROM cauhoi c
      JOIN dethi_cauhoi dc ON c.id_cauhoi = dc.id_cauhoi
      WHERE dc.id_dethi = ?
    `;
    const [questionRows] = await pool.query(questionsQuery, [id_dethi]);

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

    // Fetch allowed students
    const [studentRows] = await pool.query(
      `SELECT h.id_hocsinh, h.ten_hocsinh
       FROM dethi_hocsinh dh
       JOIN hocsinh h ON dh.id_hocsinh = h.id_hocsinh
       WHERE dh.id_dethi = ?`,
      [id_dethi]
    );

    const result = {
      ...examRows[0],
      questions,
      allowed_students: studentRows,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết đề thi:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật đề thi (unchanged)
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

// Xóa đề thi (unchanged)
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