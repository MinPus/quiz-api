const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../db"); // Kết nối database

        // Hàm kiểm tra trùng lặp tài khoản
const checkDuplicate = async (table, column, value) => {
const [results] = await db.query(`SELECT * FROM ${table} WHERE ${column} = ?`, [value]);
return results.length > 0;
};

// Hàm thêm bản ghi mới vào database
const insertRecord = async (table, data) => {
const keys = Object.keys(data).join(", ");
const values = Object.values(data);
const placeholders = values.map(() => "?").join(", ");
await db.query(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`, values);
};

// Đăng ký học sinh
router.post("/hocsinh/register", async (req, res) => {
    try {
        console.log("Dữ liệu nhận được:", req.body);

        // Kiểm tra body có rỗng không
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "Không nhận được dữ liệu trong body" });
        }

        const { id_hocsinh, ten_hocsinh, tendangnhap, matkhau, email, phone } = req.body;

        // Kiểm tra các field bắt buộc
        if (!id_hocsinh || !ten_hocsinh || !tendangnhap || !matkhau || !email || !phone) {
            return res.status(400).json({ 
                message: "Vui lòng cung cấp đầy đủ thông tin: id_hocsinh, ten_hocsinh, tendangnhap, matkhau, email, phone" 
            });
        }

        // Kiểm tra trùng lặp tài khoản
        if (await checkDuplicate("hocsinh", "tendangnhap", tendangnhap)) {
            return res.status(400).json({ message: "Tài khoản học sinh đã tồn tại" });
        }

        // Mã hóa mật khẩu
        const hashedPass = await bcrypt.hash(matkhau, 10);

        const data = {
            id_hocsinh,
            ten_hocsinh,
            tendangnhap,
            matkhau: hashedPass,
            email,
            phone,
        };

        await insertRecord("hocsinh", data);

        res.status(201).json({ message: "Đăng ký học sinh thành công" });
    } catch (err) {
        console.error("Lỗi chi tiết:", err.message, err.stack);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

// Đăng nhập học sinh
router.post("/hocsinh/login", async (req, res) => {
try {
    const { tendangnhap, matkhau } = req.body;

    // Tìm học sinh theo tendangnhap
    const [results] = await db.query("SELECT * FROM hocsinh WHERE tendangnhap = ?", [tendangnhap]);
    if (results.length === 0) {
        return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const hocsinh = results[0];
    const isMatch = await bcrypt.compare(matkhau, hocsinh.matkhau);
    if (!isMatch) {
        return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    // Tạo JWT token
    const token = jwt.sign(
        { id_hocsinh: hocsinh.id_hocsinh, tendangnhap: hocsinh.tendangnhap },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ message: "Đăng nhập học sinh thành công", token });
} catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
}
});

// Đăng ký giáo viên
router.post("/giaovien/register", async (req, res) => {
try {
    const { id_giaovien, ten_giaovien, tendangnhap_gv, matkhau_gv, email_gv, phone_gv, monchinh, lopdaychinh } = req.body;

    // Kiểm tra trùng lặp tài khoản
    if (await checkDuplicate("giaovien", "tendangnhap_gv", tendangnhap_gv)) {
        return res.status(400).json({ message: "Tài khoản giáo viên đã tồn tại" });
    }

    // Mã hóa mật khẩu
    const hashedPass = await bcrypt.hash(matkhau_gv, 10);

    // Dữ liệu giáo viên
    const data = {
        id_giaovien,
        ten_giaovien,
        tendangnhap_gv,
        matkhau_gv: hashedPass,
        email_gv,
        phone_gv,
        monchinh,
        lopdaychinh,
    };

    // Thêm giáo viên mới
    await insertRecord("giaovien", data);

    res.status(201).json({ message: "Đăng ký giáo viên thành công" });
} catch (err) {
    console.error("Lỗi chi tiết:", err.message, err.stack);
res.status(500).json({ message: "Lỗi server", error: err.message })
}
});

// Đăng nhập giáo viên
router.post("/giaovien/login", async (req, res) => {
try {
    const { tendangnhap_gv, matkhau_gv } = req.body;
    console.log("Dữ liệu đăng nhập:", { tendangnhap_gv, matkhau_gv });

    if (!tendangnhap_gv || !matkhau_gv) {
        return res.status(400).json({ message: "Thiếu tên đăng nhập hoặc mật khẩu" });
    }

    const [results] = await db.query("SELECT * FROM giaovien WHERE tendangnhap_gv = ?", [tendangnhap_gv]);
    console.log("Dữ liệu từ DB:", results);

    if (results.length === 0) {
        return res.status(400).json({ message: "Tài khoản không tồn tại" });
    }

    const giaovien = results[0];
    const isMatch = await bcrypt.compare(matkhau_gv, giaovien.matkhau_gv);
    console.log("Mật khẩu gửi:", matkhau_gv, "Mật khẩu DB:", giaovien.matkhau_gv, "Khớp:", isMatch);

    if (!isMatch) {
        return res.status(400).json({ message: "Mật khẩu không đúng" });
    }

    // Kiểm tra JWT_SECRET trước khi tạo token
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET không được định nghĩa trong biến môi trường");
    }
    console.log("JWT_SECRET:", process.env.JWT_SECRET);

    const token = jwt.sign(
        { id_giaovien: giaovien.id_giaovien, tendangnhap_gv: giaovien.tendangnhap_gv },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
    res.json({ message: "Đăng nhập giáo viên thành công", token });
} catch (err) {
    console.error("Lỗi đăng nhập giáo viên:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
}
});
// Middleware xác thực token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded; // Lưu thông tin admin vào request
        next();
    } catch (err) {
        return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};
// Đăng ký admin
router.post("/register", async (req, res) => {
    const { id_admin, ten_admin, login, pass } = req.body;

    // Kiểm tra trùng lặp tài khoản
    db.query("SELECT * FROM admins WHERE login = ?", [login], async (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi server" });
        if (results.length > 0) return res.status(400).json({ message: "Tài khoản đã tồn tại" });
        
        // Mã hóa mật khẩu
        const hashedPass = await bcrypt.hash(pass, 10);
        
        // Thêm admin mới
        db.query("INSERT INTO admins (id_admin, ten_admin, login, pass) VALUES (?, ?, ?, ?)", 
            [id_admin, ten_admin, login, hashedPass], 
            (err, result) => {
                if (err) return res.status(500).json({ message: "Lỗi server" });
                res.status(201).json({ message: "Đăng ký thành công" });
            }
        );
    });
});

// Đăng nhập admin
router.post("/login", (req, res) => {
    const { login, pass } = req.body;
    
    // Tìm admin theo login
    db.query("SELECT * FROM admins WHERE login = ?", [login], async (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi server" });
        if (results.length === 0) return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu" });
        
        const admin = results[0];
        const isMatch = await bcrypt.compare(pass, admin.pass);
        if (!isMatch) return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu" });
        
        // Tạo JWT token
        const token = jwt.sign(
            { id_admin: admin.id_admin, login: admin.login }, 
            process.env.JWT_SECRET, 
            { expiresIn: "1h" }
        );
        res.json({ message: "Đăng nhập thành công", token });
    });
});

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
                dethi.id_giaovien, dethi.id_monhoc, dethi.tendethi, dethi.ngay_tao, dethi.thoigianthi, dethi.thoigianbatdau, dethi.thoigianketthuc, dethi.trangthai AS trangthai_dethi
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
                tendethi: row.tendethi,
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

//get theo id
router.get("/baithi/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const baithiQuery = `
            SELECT 
                baithi.id_baithi, baithi.id_dethi, baithi.id_hocsinh, baithi.ngaylam, baithi.trangthai, baithi.diemthi,
                hocsinh.id_hocsinh, hocsinh.ten_hocsinh, hocsinh.tendangnhap, hocsinh.email, hocsinh.phone,
                dethi.id_giaovien, dethi.id_monhoc, dethi.tendethi, dethi.ngay_tao, dethi.thoigianthi, dethi.thoigianbatdau, dethi.thoigianketthuc, dethi.trangthai AS trangthai_dethi
            FROM baithi
            JOIN hocsinh ON baithi.id_hocsinh = hocsinh.id_hocsinh
            JOIN dethi ON baithi.id_dethi = dethi.id_dethi
            WHERE baithi.id_baithi = ?
        `;
        const [rows] = await db.execute(baithiQuery, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Bài thi không tồn tại" });
        }

        const row = rows[0];
        const result = {
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
                id_monhoc: row.id_monhoc,
                tendethi: row.tendethi,
                ngay_tao: row.ngay_tao,
                thoigianbatdau: row.thoigianbatdau,
                thoigianketthuc: row.thoigianketthuc,
                thoigianthi: row.thoigianthi,
                trangthai: row.trangthai_dethi
            },
            ngaylam: row.ngaylam,
            trangthai: row.trangthai,
            diemthi: row.diemthi
        };

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

//get theo id
router.get("/giaovien/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const giaovienQuery = `
            SELECT 
                giaovien.id_giaovien, giaovien.ten_giaovien, giaovien.tendangnhap_gv, giaovien.email_gv, giaovien.phone_gv,
                giaovien.monchinh, giaovien.lopdaychinh,
                monhoc.tenmonhoc
            FROM giaovien
            JOIN monhoc ON giaovien.monchinh = monhoc.id_monhoc
            WHERE giaovien.id_giaovien = ?
        `;
        const [rows] = await db.execute(giaovienQuery, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Giáo viên không tồn tại" });
        }

        const row = rows[0];
        const result = {
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
        };

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API lấy danh sách dethi_cauhoi
router.get("/dethi_cauhoi", async (req, res) => {
try {
    const query = `
        SELECT 
            id_dethi, id_cauhoi
        FROM dethi_cauhoi
    `;
    const [rows] = await db.execute(query);
    
    const result = rows.map(row => ({
        id_dethi: row.id_dethi,
        id_cauhoi: row.id_cauhoi
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
                dethi.id_dethi, dethi.id_giaovien, dethi.id_monhoc, dethi.tendethi, dethi.ngay_tao, dethi.thoigianthi, dethi.thoigianbatdau, dethi.thoigianketthuc, dethi.trangthai,
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
            tendethi: row.tendethi,
            thoigianthi: row.thoigianthi,
            thoigianbatdau: row.thoigianbatdau,
            thoigianketthuc: row.thoigianketthuc,
            trangthai: row.trangthai,
            giaovien: {
                id_giaovien: row.id_giaovien,
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

//get theo id
router.get("/dethi/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const dethiQuery = `
            SELECT 
                dethi.id_dethi, dethi.id_giaovien, dethi.id_monhoc, dethi_tendethi, dethi.ngay_tao, dethi.thoigianthi, dethi.thoigianbatdau, dethi.thoigianketthuc, dethi.trangthai,
                giaovien.ten_giaovien,
                monhoc.tenmonhoc
            FROM dethi
            JOIN giaovien ON dethi.id_giaovien = giaovien.id_giaovien
            JOIN monhoc ON dethi.id_monhoc = monhoc.id_monhoc
            WHERE dethi.id_dethi = ?
        `;
        const [rows] = await db.execute(dethiQuery, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Đề thi không tồn tại" });
        }

        const row = rows[0];
        const result = {
            id_dethi: row.id_dethi,
            ngay_tao: row.ngay_tao,
            thoigianthi: row.thoigianthi,
            thoigianbatdau: row.thoigianbatdau,
            thoigianketthuc: row.thoigianketthuc,
            trangthai: row.trangthai,
            giaovien: {
                id_giaovien: row.id_giaovien,
                ten_giaovien: row.ten_giaovien
            },
            monhoc: {
                id_monhoc: row.id_monhoc,
                tenmonhoc: row.tenmonhoc,
                tendethi: row.tendethi
            }
        };

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

        // Lấy tên cột khóa chính của bảng
        const [primaryKey] = await db.query(`SHOW KEYS FROM \`${table}\` WHERE Key_name = 'PRIMARY'`);
        if (!primaryKey || primaryKey.length === 0) {
            return res.status(400).json({ error: `Table ${table} has no primary key` });
        }

        const primaryKeyColumn = primaryKey[0].Column_name; // Lấy tên cột khóa chính

        // Tạo câu lệnh cập nhật
        const updates = Object.entries(data).map(([key, value]) => `\`${key}\`='${value}'`).join(',');
        const query = `UPDATE \`${table}\` SET ${updates} WHERE \`${primaryKeyColumn}\`='${id}'`;

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

        // Lấy thông tin cột khóa chính
        const [primaryKey] = await db.query(`SHOW KEYS FROM \`${table}\` WHERE Key_name = 'PRIMARY'`);
        if (!primaryKey || primaryKey.length === 0) {
            return res.status(400).json({ error: `Table ${table} has no primary key` });
        }

        const primaryKeyColumn = primaryKey[0].Column_name;
        const query = `DELETE FROM \`${table}\` WHERE \`${primaryKeyColumn}\`='${id}'`;

        await db.query(query);
        res.status(200).json({ message: `Record in ${table} deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: `Error deleting record in ${req.params.table}: ${error.message}` });
    }
});


module.exports = router;