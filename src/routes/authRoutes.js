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

// Lấy danh sách câu hỏi kèm thông tin môn học
router.get("/cauhoi", async (req, res) => {
    try {
        const cauhoiQuery = `
            SELECT 
                cauhoi.id_cauhoi, cauhoi.noidungcauhoi, cauhoi.dapan, cauhoi.id_monhoc,
                monhoc.tenmonhoc
            FROM cauhoi
            JOIN monhoc ON cauhoi.id_monhoc = monhoc.id_monhoc
        `;
        const [rows] = await db.execute(cauhoiQuery);
        
        const result = rows.map(row => ({
            id_cauhoi: row.id_cauhoi,
            noidungcauhoi: row.noidungcauhoi,
            dapan: row.dapan,
            monhoc: {
                id_monhoc: row.id_monhoc,
                tenmonhoc: row.tenmonhoc
            }
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách giáo viên kèm thông tin môn học chính và lớp dạy chính
router.get("/giaovien", async (req, res) => {
    try {
        const giaovienQuery = `
            SELECT 
                giaovien.id_giaovien, giaovien.ten_giaovien, giaovien.tendangnhap_gv, giaovien.email_gv, giaovien.phone_gv,
                giaovien.monchinh, giaovien.lopdaychinh,
                monhoc.tenmonhoc
            FROM giaovien
            JOIN monhoc ON giaovien.monchinh = monhoc.id_monhoc
        `;
        const [rows] = await db.execute(giaovienQuery);
        
        const result = rows.map(row => ({
            id_giaovien: row.id_giaovien,
            ten_giaovien: row.ten_giaovien,
            tendangnhap_gv: row.tendangnhap_gv,
            email_gv: row.email_gv,
            phone_gv: row.phone_gv,
            lopdaychinh: row.lopdaychinh,
            monhoc: {
                id_monhoc: row.monchinh,
                tenmonhoc: row.tenmonhoc
            }
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách đề thi kèm thông tin giáo viên và môn học
router.get("/dethi", async (req, res) => {
    try {
        const dethiQuery = `
            SELECT 
                dethi.id_dethi, dethi.id_giaovien, dethi.id_monhoc, dethi.ngay_tao, dethi.thoigianthi, dethi.thoigianbatdau, dethi.thoigianketthuc, dethi.trangthai,
                giaovien.ten_giaovien,
                monhoc.tenmonhoc
            FROM dethi
            JOIN giaovien ON dethi.id_giaovien = giaovien.id_giaovien
            JOIN monhoc ON dethi.id_monhoc = monhoc.id_monhoc
        `;
        const [rows] = await db.execute(dethiQuery);
        
        const result = rows.map(row => ({
            id_dethi: row.id_dethi,
            ngay_tao: row.ngay_tao,
            thoigianthi: row.thoigianthi,
            thoigianbatdau: row.thoigianbatdau,
            thoigianketthuc: row.thoigianketthuc,
            trangthai: row.trangthai,
            giaovien: {
                ten_giaovien: row.ten_giaovien
            },
            monhoc: {
                tenmonhoc: row.tenmonhoc
            }
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách học sinh
router.get("/hocsinh", async (req, res) => {
    try {
        const hocsinhQuery = `
            SELECT 
                id_hocsinh, ten_hocsinh, tendangnhap, email, phone
            FROM hocsinh
        `;
        const [rows] = await db.execute(hocsinhQuery);
        
        const result = rows.map(row => ({
            id_hocsinh: row.id_hocsinh,
            ten_hocsinh: row.ten_hocsinh,
            tendangnhap: row.tendangnhap,
            email: row.email,
            phone: row.phone
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách câu trả lời kèm thông tin câu hỏi
router.get("/cautraloi", async (req, res) => {
    try {
        const cautraloiQuery = `
            SELECT 
                cautraloi.id_cautraloi, cautraloi.id_cauhoi, cautraloi.noidungcautraloi,
                cauhoi.noidungcauhoi, cauhoi.dapan, cauhoi.id_monhoc,
                monhoc.tenmonhoc
            FROM cautraloi
            JOIN cauhoi ON cautraloi.id_cauhoi = cauhoi.id_cauhoi
            JOIN monhoc ON cauhoi.id_monhoc = monhoc.id_monhoc
        `;
        const [rows] = await db.execute(cautraloiQuery);
        
        const result = rows.map(row => ({
            id_cautraloi: row.id_cautraloi,
            noidungcautraloi: row.noidungcautraloi,
            cauhoi: {
                id_cauhoi: row.id_cauhoi,
                noidungcauhoi: row.noidungcauhoi,
                dapan: row.dapan,
                monhoc: {
                    id_monhoc: row.id_monhoc,
                    tenmonhoc: row.tenmonhoc
                }
            }
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách admin
router.get("/admin", async (req, res) => {
    try {
        const adminQuery = `
            SELECT 
                id_admin, ten_admin, login
            FROM admin
        `;
        const [rows] = await db.execute(adminQuery);
        
        const result = rows.map(row => ({
            id_admin: row.id_admin,
            ten_admin: row.ten_admin,
            login: row.login
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách môn học
router.get("/monhoc", async (req, res) => {
    try {
        const monhocQuery = `
            SELECT 
                id_monhoc, tenmonhoc
            FROM monhoc
        `;
        const [rows] = await db.execute(monhocQuery);
        
        const result = rows.map(row => ({
            id_monhoc: row.id_monhoc,
            tenmonhoc: row.tenmonhoc
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
