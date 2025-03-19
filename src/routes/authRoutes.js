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
                id_giaovin: row.id_giaovien,
                ten_giaovien: row.ten_giaovien
            },
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

// Lấy danh sách bài thi theo môn + id sinh viên
router.get("/baithi/:id_monhoc/:id_hocsinh", async (req, res) => {
    try {
        const { id_monhoc, id_hocsinh } = req.params;
        const query = `
            SELECT * FROM baithi
            JOIN dethi ON baithi.id_dethi = dethi.id_dethi
            WHERE dethi.id_monhoc = ? AND baithi.id_hocsinh = ?
        `;
        const [rows] = await db.execute(query, [id_monhoc, id_hocsinh]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất 1 bài thi của sinh viên
router.get("/baithi/:id_baithi", async (req, res) => {
    try {
        const { id_baithi } = req.params;
        const query = "SELECT * FROM baithi WHERE id_baithi = ?";
        const [rows] = await db.execute(query, [id_baithi]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất tất cả bài thi của 1 sinh viên
router.get("/baithi/hocsinh/:id_hocsinh", async (req, res) => {
    try {
        const { id_hocsinh } = req.params;
        const query = "SELECT * FROM baithi WHERE id_hocsinh = ?";
        const [rows] = await db.execute(query, [id_hocsinh]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất tất cả đề thi của 1 giáo viên
router.get("/dethi/giaovien/:id_giaovien", async (req, res) => {
    try {
        const { id_giaovien } = req.params;
        const query = "SELECT * FROM dethi WHERE id_giaovien = ?";
        const [rows] = await db.execute(query, [id_giaovien]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất thông tin của 1 giáo viên
router.get("/giaovien/:id_giaovien", async (req, res) => {
    try {
        const { id_giaovien } = req.params;
        const query = "SELECT * FROM giaovien WHERE id_giaovien = ?";
        const [rows] = await db.execute(query, [id_giaovien]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất đề thi theo môn
router.get("/dethi/monhoc/:id_monhoc", async (req, res) => {
    try {
        const { id_monhoc } = req.params;
        const query = "SELECT * FROM dethi WHERE id_monhoc = ?";
        const [rows] = await db.execute(query, [id_monhoc]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất thông tin 1 sinh viên
router.get("/hocsinh/:id_hocsinh", async (req, res) => {
    try {
        const { id_hocsinh } = req.params;
        const query = "SELECT * FROM hocsinh WHERE id_hocsinh = ?";
        const [rows] = await db.execute(query, [id_hocsinh]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất tất cả bài thi theo ngày thi của 1 giáo viên
router.get("/baithi/giaovien/:id_giaovien/ngaythi/:ngaythi", async (req, res) => {
    try {
        const { id_giaovien, ngaythi } = req.params;
        const query = `
            SELECT baithi.* 
            FROM baithi
            JOIN dethi ON baithi.id_dethi = dethi.id_dethi
            WHERE dethi.id_giaovien = ? AND DATE(baithi.ngaylam) = ?
        `;
        const [rows] = await db.execute(query, [id_giaovien, ngaythi]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất tất cả bài thi theo đề thi
router.get("/baithi/dethi/:id_dethi", async (req, res) => {
    try {
        const { id_dethi } = req.params;
        const query = "SELECT * FROM baithi WHERE id_dethi = ?";
        const [rows] = await db.execute(query, [id_dethi]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Truy xuất tất cả bài thi theo môn của 1 giáo viên
router.get("/baithi/monhoc/:id_monhoc/giaovien/:id_giaovien", async (req, res) => {
    try {
        const { id_monhoc, id_giaovien } = req.params;
        const query = `
            SELECT baithi.* 
            FROM baithi
            JOIN dethi ON baithi.id_dethi = dethi.id_dethi
            WHERE dethi.id_monhoc = ? AND dethi.id_giaovien = ?
        `;
        const [rows] = await db.execute(query, [id_monhoc, id_giaovien]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:table', async (req, res) => {
    try {
        const table = req.params.table; // Đảm bảo lấy đúng giá trị từ URL
        const data = req.body;
        if (!table || Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Invalid table name or data" });
        }
        
        const keys = Object.keys(data).map(key => `\`${key}\``).join(',');
        const values = Object.values(data).map(value => `'${value}'`).join(',');
        const query = `INSERT INTO \`${table}\` (${keys}) VALUES (${values})`;

        await db.query(query);
        res.status(201).json({ message: `Record added to ${table} successfully` });
    } catch (error) {
        res.status(500).json({ error: `Error adding record to ${req.params.table}: ${error.message}` });
    }
});

router.put('/:table/:id', async (req, res) => {
    try {
        const table = req.params.table;
        const id = req.params.id;
        const data = req.body;
        if (!table || !id || Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Invalid table name, ID, or data" });
        }

        const updates = Object.entries(data).map(([key, value]) => `\`${key}\`='${value}'`).join(',');
        const query = `UPDATE \`${table}\` SET ${updates} WHERE id=${id}`;

        await db.query(query);
        res.status(200).json({ message: `Record in ${table} updated successfully` });
    } catch (error) {
        res.status(500).json({ error: `Error updating record in ${req.params.table}: ${error.message}` });
    }
});


router.delete('/:table/:id', async (req, res) => {
    try {
        const table = req.params.table;
        const id = req.params.id;
        if (!table || !id) {
            return res.status(400).json({ error: "Invalid table name or ID" });
        }

        const query = `DELETE FROM \`${table}\` WHERE id=${id}`;

        await db.query(query);
        res.status(200).json({ message: `Record in ${table} deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: `Error deleting record in ${req.params.table}: ${error.message}` });
    }
});

module.exports = router;
