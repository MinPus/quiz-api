const express = require("express");
const router = express.Router();
const db = require("../db"); // Kết nối database

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
// router.get("/baithi", async (req, res) => {
//     try {
//         const baithiQuery = `
//             SELECT baithi.*, 
//                    hocsinh.id_hocsinh AS hocsinh_id_hocsinh,
//                    hocsinh.ten_hocsinh AS hocsinh_ten_hocsinh,
//                    hocsinh.tendangnhap AS hocsinh_tendangnhap,
//                    hocsinh.matkhau AS hocsinh_matkhau,
//                    hocsinh.email AS hocsinh_email,
//                    hocsinh.phone AS hocsinh_phone
//             FROM baithi
//             JOIN hocsinh ON baithi.id_hocsinh = hocsinh.id_hocsinh
//         `;
//         const [results] = await db.execute(baithiQuery);
//         res.json(mapObjectData(results, "id_baithi", ["hocsinh"]));
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }

// Lấy danh sách bài thi kèm thông tin học sinh và đề thi
router.get("/baithi", async (req, res) => {
    try {
        const baithiQuery = `
            SELECT 
                baithi.id_baithi, baithi.id_dethi, baithi.id_hocsinh, baithi.ngaylam, baithi.trangthai, baithi.diemthi,
                hocsinh.id_hocsinh, hocsinh.ten_hocsinh, hocsinh.tendangnhap, hocsinh.email, hocsinh.phone,
                dethi.id_giaovien, dethi.id_monhoc, dethi.ngay_tao, dethi.thoigianthi, dethi.thoigianbatdau, dethi.thoigianketthuc, dethi.trangthai AS trangthai_dethi
            FROM baithi
            JOIN hocsinh ON baithi.id_hocsinh = hocsinh.id_hocsinh
            JOIN dethi ON baithi.id_dethi = dethi.id_dethi
        `;
        const [rows] = await db.execute(baithiQuery);

        const result = rows.map(row => ({
            id_baithi: row.id_baithi,
            hocsinh: {
                id_hocsinh: row.id_hocsinh,
                ten_hocsinh: row.ten_hocsinh,
                tendangnhap: row.tendangnhap,
                email: row.email,
                phone: row.phone
            },
            dethi: {
                id_dethi: row.id_dethi,
                id_giaovien: row.id_giaovien,
                id_monhoc:row.id_monhoc,
                ngay_tao:row.ngay_tao,
                thoigianbatdau:row.thoigianbatdau,
                thoigianketthuc:row.thoigianketthuc,
                thoigianthi:row.thoigianthi,
                trangthai:row.trangthai,
            },
            ngaylam: row.ngaylam,
            trangthai: row.trangthai,
            diemthi: row.diemthi
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

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
