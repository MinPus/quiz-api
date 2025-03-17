const express = require("express");
const router = express.Router();
const db = require("../db"); // Kết nối database

// Lấy danh sách bài thi kèm thông tin học sinh
router.get("/baithi", async (req, res) => {
    try {
        const baithiQuery = `
            SELECT * FROM baithi
            JOIN hocsinh ON baithi.id_hocsinh = hocsinh.id_hocsinh
        `;
        const [baithi] = await db.execute(baithiQuery);
        res.json(baithi);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách giáo viên kèm môn học chính
router.get("/giaovien", async (req, res) => {
    try {
        const giaovienQuery = `
            SELECT giaovien.*, monhoc.tenmonhoc FROM giaovien
            JOIN monhoc ON giaovien.monchinh = monhoc.id_monhoc
        `;
        const [giaovien] = await db.execute(giaovienQuery);
        res.json(giaovien);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
