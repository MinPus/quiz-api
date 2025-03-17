const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Kết nối database

// Hàm tự động ánh xạ dữ liệu thành object theo khóa ngoại
const mapObjectData = (data, mainKey, subKeys) => {
    return data.map(item => {
        let mappedItem = { [mainKey]: item[mainKey] };
        subKeys.forEach(key => {
            if (!mappedItem[key]) mappedItem[key] = {};
            Object.keys(item).forEach(field => {
                if (field.startsWith(key + "_")) {
                    mappedItem[key][field.replace(key + "_", "")] = item[field];
                } else {
                    mappedItem[field] = item[field];
                }
            });
        });
        return mappedItem;
    });
};

// Lấy danh sách bài thi kèm thông tin học sinh
router.get("/baithi", async (req, res) => {
    try {
        const baithiQuery = `
            SELECT baithi.*, 
                   hocsinh.id_hocsinh AS hocsinh_id_hocsinh,
                   hocsinh.ten_hocsinh AS hocsinh_ten_hocsinh,
                   hocsinh.tendangnhap AS hocsinh_tendangnhap,
                   hocsinh.matkhau AS hocsinh_matkhau,
                   hocsinh.email AS hocsinh_email,
                   hocsinh.phone AS hocsinh_phone
            FROM baithi
            JOIN hocsinh ON baithi.id_hocsinh = hocsinh.id_hocsinh
        `;
        const [results] = await db.execute(baithiQuery);
        res.json(mapObjectData(results, "id_baithi", ["hocsinh"]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách giáo viên kèm môn học chính
router.get("/giaovien", async (req, res) => {
    try {
        const giaovienQuery = `
            SELECT giaovien.*, 
                   monhoc.tenmonhoc AS monhoc_tenmonhoc
            FROM giaovien
            JOIN monhoc ON giaovien.monchinh = monhoc.id_monhoc
        `;
        const [giaovien] = await db.execute(giaovienQuery);
        res.json(mapObjectData(giaovien, "id_giaovien", ["monhoc"]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
