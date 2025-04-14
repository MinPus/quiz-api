const express = require("express");
const router = express.Router();
const pool = require("../db");

// Middleware xác thực token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token" });
  }

  try {
    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// Lấy danh sách đề thi
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM dethi");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đề thi:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Lấy thông tin đề thi và câu hỏi
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin đề thi
    const [examRows] = await pool.query("SELECT * FROM dethi WHERE id_dethi = ?", [id]);
    if (examRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }

    // Lấy danh sách câu hỏi
    const [questionRows] = await pool.query(
      `SELECT c.*, dc.stt
       FROM cauhoi c
       JOIN dethi_cauhoi dc ON c.id_cauhoi = dc.id_cauhoi
       WHERE dc.id_dethi = ?
       ORDER BY dc.stt`,
      [id]
    );

    // Gắn danh sách đáp án (options) cho từng câu hỏi
    const questions = questionRows.map((question) => ({
      ...question,
      options: [question.dapanA, question.dapanB, question.dapanC, question.dapanD].filter(
        (option) => option
      ),
    }));

    res.status(200).json({
      ...examRows[0],
      questions,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin đề thi:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Lấy danh sách bài thi của học sinh
router.get("/baithi", verifyToken, async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: "Thiếu mã học sinh" });
    }

    if (req.user.id !== studentId && req.user.role !== "teacher") {
      return res.status(403).json({ message: "Không có quyền xem bài thi" });
    }

    const [rows] = await pool.query(
      `SELECT b.*, d.tendethi, d.tenmonhoc
       FROM baithi b
       JOIN dethi d ON b.id_dethi = d.id_dethi
       WHERE b.id_hocsinh = ?
       ORDER BY b.ngaylam DESC`,
      [studentId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bài thi:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Nộp bài thi
router.post("/baithi", verifyToken, async (req, res) => {
  try {
    const { id_hocsinh, id_dethi, ngaylam, trangthai, diemthi } = req.body;

    if (!id_hocsinh || !id_dethi || !ngaylam || !trangthai || diemthi === undefined) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    if (req.user.id !== id_hocsinh && req.user.role !== "teacher") {
      return res.status(403).json({ message: "Không có quyền nộp bài thi" });
    }

    const id_baithi = `BT${Date.now()}`;
    await pool.query(
      `INSERT INTO baithi (id_baithi, id_hocsinh, id_dethi, ngaylam, trangthai, diemthi)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_baithi, id_hocsinh, id_dethi, ngaylam, trangthai, diemthi]
    );

    res.status(200).json({ message: "Nộp bài thi thành công", id_baithi });
  } catch (error) {
    console.error("Lỗi khi nộp bài thi:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;