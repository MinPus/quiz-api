const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

// Middleware xác thực token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    if (!decoded.id_hocsinh || !decoded.role) {
      return res.status(401).json({ message: "Token thiếu thông tin id_hocsinh hoặc role" });
    }

    if (decoded.role === "student") {
      const [userRows] = await pool.query("SELECT id_hocsinh FROM hocsinh WHERE id_hocsinh = ?", [decoded.id_hocsinh]);
      if (userRows.length === 0) {
        return res.status(401).json({ message: "ID học sinh không hợp lệ" });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Lỗi khi xác thực token:", err);
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// Kiểm tra quyền truy cập đề thi
router.get("/access/:id_dethi", verifyToken, async (req, res) => {
  try {
    const { id_dethi } = req.params;
    const user = req.user;

    if (user.role !== "student") {
      return res.status(403).json({ message: "Chỉ học sinh mới có thể kiểm tra quyền truy cập" });
    }

    const [examRows] = await pool.query("SELECT is_restricted FROM dethi WHERE id_dethi = ?", [id_dethi]);
    if (examRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }

    const exam = examRows[0];

    if (exam.is_restricted === 0) {
      return res.status(200).json({ hasAccess: true });
    }

    const [accessRows] = await pool.query(
      "SELECT * FROM dethi_hocsinh WHERE id_dethi = ? AND id_hocsinh = ?",
      [id_dethi, user.id_hocsinh]
    );

    const hasAccess = accessRows.length > 0;
    return res.status(200).json({ hasAccess });
  } catch (error) {
    console.error("Lỗi khi kiểm tra quyền truy cập đề thi:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Lấy danh sách đề thi
// router.get('/', verifyToken, async (req, res) => {
//   try {
//     const user = req.user;

//     if (user.role !== 'student') {
//       return res.status(403).json({ message: 'Chỉ học sinh mới có thể truy cập' });
//     }

//     console.log('User ID from token:', user.id_hocsinh);

//     const now = new Date();
//     now.setHours(now.getHours() + 7); // Điều chỉnh múi giờ (Asia/Ho_Chi_Minh)
//     console.log('Adjusted server time:', now.toISOString());

//     const query = `
//       SELECT DISTINCT d.*, m.tenmonhoc, g.ten_giaovien
//       FROM dethi d
//       JOIN monhoc m ON d.id_monhoc = m.id_monhoc
//       JOIN giaovien g ON d.id_giaovien = g.id_giaovien
//       LEFT JOIN dethi_hocsinh dh ON d.id_dethi = dh.id_dethi AND dh.id_hocsinh = ?
//       WHERE d.trangthai = 'dethi'
//         AND d.thoigianketthuc > ?
//         AND (
//           d.is_restricted = 0
//           OR (d.is_restricted = 1 AND dh.id_hocsinh IS NOT NULL)
//         )
//     `;
//     const [rows] = await pool.query(query, [user.id_hocsinh, now]);

//     console.log('Raw query results:', rows.map(row => ({
//       id_dethi: row.id_dethi,
//       tendethi: row.tendethi,
//       is_restricted: row.is_restricted,
//       thoigianketthuc: row.thoigianketthuc,
//       trangthai: row.trangthai,
//     })));

//     const exams = rows.map(row => ({
//       id_dethi: row.id_dethi,
//       tendethi: row.tendethi,
//       ngay_tao: row.ngay_tao,
//       thoigianthi: row.thoigianthi,
//       thoigianbatdau: row.thoigianbatdau,
//       thoigianketthuc: row.thoigianket copycat ngay_tao: new Date(row.ngay_tao).toISOString(),
//       trangthai: row.trangthai,
//       is_restricted: row.is_restricted,
//       monhoc: { tenmonhoc: row.tenmonhoc },
//       giaovien: { ten_giaovien: row.ten_giaovien },
//     }));

//     console.log('Filtered exams for user:', exams);

//     res.status(200).json(exams);
//   } catch (error) {
//     console.error('Lỗi khi lấy danh sách đề thi:', error);
//     res.status(500).json({ message: 'Lỗi server', error: error.message });
//   }
// });

router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT d.*, m.tenmonhoc, g.ten_giaovien
      FROM dethi d
      JOIN monhoc m ON d.id_monhoc = m.id_monhoc
      JOIN giaovien g ON d.id_giaovien = g.id_giaovien
      WHERE d.trangthai = 'dethi'
      AND d.thoigianketthuc > NOW()
    `;
    let queryParams = [];

    // Nếu là học sinh, lọc các đề thi mà học sinh được phép truy cập
    if (user.role === "student") {
      query = `
        SELECT DISTINCT d.*, m.tenmonhoc, g.ten_giaovien
        FROM dethi d
        JOIN monhoc m ON d.id_monhoc = m.id_monhoc
        JOIN giaovien g ON d.id_giaovien = g.id_giaovien
        LEFT JOIN dethi_hocsinh dh ON d.id_dethi = dh.id_dethi
        WHERE d.trangthai = 'dethi'
        AND d.thoigianketthuc > NOW()
        AND (
          d.is_restricted = 0
          OR (d.is_restricted = 1 AND dh.id_hocsinh = ?)
        )
      `;
      queryParams = [user.id];
    }

    const [rows] = await pool.query(query, queryParams);
    console.log(`Exams fetched for user ${user.id}:`, JSON.stringify(rows, null, 2));
    res.status(200).json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đề thi:", error);
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

    if (req.user.id_hocsinh !== studentId && req.user.role !== "teacher") {
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

    if (req.user.id_hocsinh !== id_hocsinh && req.user.role !== "teacher") {
      return res.status(403).json({ message: "Không có quyền nộp bài thi" });
    }

    const [examRows] = await pool.query("SELECT * FROM dethi WHERE id_dethi = ?", [id_dethi]);
    if (examRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }

    const exam = examRows[0];
    if (req.user.role === "student" && exam.is_restricted === 1) {
      const [accessRows] = await pool.query(
        "SELECT * FROM dethi_hocsinh WHERE id_dethi = ? AND id_hocsinh = ?",
        [id_dethi, id_hocsinh]
      );
      if (accessRows.length === 0) {
        return res.status(403).json({ message: "Bạn không có quyền nộp bài thi này" });
      }
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

// API lấy danh sách id_dethi mà học sinh được phép truy cập
router.get("/accessible-exams", verifyToken, async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "student") {
      return res.status(403).json({ message: "Chỉ học sinh mới có thể truy cập" });
    }

    const query = `
      SELECT dh.id_dethi
      FROM dethi_hocsinh dh
      JOIN dethi d ON dh.id_dethi = d.id_dethi
      WHERE dh.id_hocsinh = ?
        AND d.trangthai = 'dethi'
        AND d.is_restricted = 1
        AND d.thoigianketthuc > NOW()
    `;
    const [rows] = await pool.query(query, [user.id_hocsinh]);

    const accessibleExamIds = rows.map((row) => row.id_dethi);
    console.log(`Accessible exam IDs for student ${user.id_hocsinh}:`, accessibleExamIds);
    res.status(200).json({ examIds: accessibleExamIds });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đề thi được phép:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
