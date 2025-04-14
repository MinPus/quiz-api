const express = require("express");
const router = express.Router();
const pool = require("../db");

// Middleware để xác thực token (đơn giản hóa)
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token được cung cấp" });
  }

  try {
    // Kiểm tra token có định dạng JWT hợp lệ (3 phần: header.payload.signature)
    if (token.split(".").length !== 3) {
      return res.status(401).json({ message: "Định dạng token không hợp lệ" });
    }

    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    if (!decoded.id) {
      return res.status(401).json({ message: "Nội dung token không hợp lệ" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Lỗi khi giải mã token:", err);
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// Lấy tất cả các đề thi
router.get("/dethis", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM dethi");
    if (rows.length === 0) {
      return res.status(200).json([]); // Trả về mảng rỗng nếu không tìm thấy đề thi
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đề thi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Lấy câu hỏi cho một đề thi
router.get("/:id/cauhois", verifyToken, async (req, res) => {
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
      return res.status(200).json([]); // Trả về mảng rỗng nếu không tìm thấy câu hỏi
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách câu hỏi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Lấy bài thi của học sinh
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

    // Xác minh người dùng có quyền xem bài thi này
    if (req.user.id !== studentId && (!req.user.role || req.user.role !== "teacher")) {
      return res.status(403).json({ message: "Không có quyền xem bài thi này" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM baithi WHERE id_hocsinh = ? ORDER BY ngaylam DESC",
      [studentId]
    );
    if (rows.length === 0) {
      return res.status(200).json([]); // Trả về mảng rỗng nếu không tìm thấy bài thi
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bài thi:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Nộp bài thi (lưu vào baithi)
router.post("/baithi", verifyToken, async (req, res) => {
  try {
    const { id_hocsinh, id_dethi, ngaylam, trangthai, diemthi } = req.body;

    // Xác thực các trường bắt buộc
    if (!id_hocsinh || !id_dethi || !ngaylam || !trangthai || diemthi === undefined) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    // Kiểm tra id_hocsinh và id_dethi là số hợp lệ
    if (isNaN(id_hocsinh) || isNaN(id_dethi)) {
      return res.status(400).json({ message: "ID học sinh hoặc ID đề thi không hợp lệ" });
    }

    // Xác minh học sinh có quyền nộp bài thi
    if (req.user.id !== id_hocsinh && (!req.user.role || req.user.role !== "teacher")) {
      return res.status(403).json({ message: "Không có quyền nộp bài thi này" });
    }

    const id_baithi = `BT${Date.now()}`; // Tạo ID đơn giản
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

// Xóa một bài thi (baithi)
router.delete("/baithi/:id_baithi", verifyToken, async (req, res) => {
  try {
    const { id_baithi } = req.params;

    // Kiểm tra id_baithi hợp lệ
    if (!id_baithi) {
      return res.status(400).json({ message: "ID bài thi không hợp lệ" });
    }

    // Xác minh bài thi tồn tại
    const [submissionRows] = await pool.query("SELECT * FROM baithi WHERE id_baithi = ?", [
      id_baithi,
    ]);
    if (submissionRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy bài thi để xóa" });
    }

    // Kiểm tra người dùng có quyền xóa bài thi này
    const submission = submissionRows[0];
    if (submission.id_hocsinh !== req.user.id && (!req.user.role || req.user.role !== "teacher")) {
      return res.status(403).json({ message: "Không có quyền xóa bài thi này" });
    }

    // Xóa bài thi
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