const express = require("express");
const router = express.Router();
const pool = require("../db");

// Middleware to verify token (simplified)
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Kiểm tra token có định dạng JWT hợp lệ (3 phần: header.payload.signature)
    if (token.split(".").length !== 3) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    if (!decoded.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Lỗi khi giải mã token:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Get all exams
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM dethi");
    if (rows.length === 0) {
      return res.status(200).json([]); // Return empty array if no exams found
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đề thi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Get questions for an exam
router.get("/:id/questions", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra id là số hợp lệ
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID đề thi không hợp lệ" });
    }

    const [rows] = await pool.query(
      `SELECT c.*
       FROM cauhoi c
       JOIN dethi_cauhoi dc ON c.id_cauhoi = dc.id_cauhoi
       WHERE dc.id_dethi = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(200).json([]); // Return empty array if no questions found
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Get submissions for a student
router.get("/baithi", verifyToken, async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    // Kiểm tra studentId là số hợp lệ
    if (isNaN(studentId)) {
      return res.status(400).json({ message: "ID học sinh không hợp lệ" });
    }

    // Verify the user is authorized to view these submissions
    if (req.user.id !== studentId && (!req.user.role || req.user.role !== "teacher")) {
      return res.status(403).json({ message: "Không có quyền xem bài thi này" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM baithi WHERE id_hocsinh = ? ORDER BY ngaylam DESC",
      [studentId]
    );
    if (rows.length === 0) {
      return res.status(200).json([]); // Return empty array if no submissions found
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bài thi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Submit exam (save to baithi)
router.post("/baithi", verifyToken, async (req, res) => {
  try {
    const { id_hocsinh, id_dethi, ngaylam, trangthai, diemthi } = req.body;

    // Validate required fields
    if (!id_hocsinh || !id_dethi || !ngaylam || !trangthai || diemthi === undefined) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    // Kiểm tra id_hocsinh và id_dethi là số hợp lệ
    if (isNaN(id_hocsinh) || isNaN(id_dethi)) {
      return res.status(400).json({ message: "ID học sinh hoặc ID đề thi không hợp lệ" });
    }

    // Verify the student is authorized to submit
    if (req.user.id !== id_hocsinh && (!req.user.role || req.user.role !== "teacher")) {
      return res.status(403).json({ message: "Không có quyền nộp bài thi này" });
    }

    const id_baithi = `BT${Date.now()}`; // Simple ID generation
    const query = `
      INSERT INTO baithi (id_baithi, id_hocsinh, id_dethi, ngaylam, trangthai, diemthi)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [id_baithi, id_hocsinh, id_dethi, ngaylam, trangthai, diemthi]);

    res.status(200).json({ message: "Nộp bài thi thành công", id_baithi });
  } catch (error) {
    console.error("Lỗi khi nộp bài thi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Delete an exam submission (baithi)
router.delete("/baithi/:id_baithi", verifyToken, async (req, res) => {
  try {
    const { id_baithi } = req.params;

    // Kiểm tra id_baithi hợp lệ
    if (!id_baithi) {
      return res.status(400).json({ message: "ID bài thi không hợp lệ" });
    }

    // Verify the submission exists
    const [submissionRows] = await pool.query("SELECT * FROM baithi WHERE id_baithi = ?", [
      id_baithi,
    ]);
    if (submissionRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy bài thi để xóa" });
    }

    // Check if the user is authorized to delete this submission
    const submission = submissionRows[0];
    if (submission.id_hocsinh !== req.user.id && (!req.user.role || req.user.role !== "teacher")) {
      return res.status(403).json({ message: "Không có quyền xóa bài thi này" });
    }

    // Delete the submission
    const query = `
      DELETE FROM baithi
      WHERE id_baithi = ?
    `;
    const [result] = await pool.query(query, [id_baithi]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy bài thi để xóa" });
    }

    res.status(200).json({ message: "Xóa bài thi thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa bài thi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
