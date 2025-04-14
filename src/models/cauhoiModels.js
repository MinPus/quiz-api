const pool = require('../db');

const cauhoi = {
    create: (id_cauhoi, noidungcauhoi, dapan, id_monhoc) => ({
        id_cauhoi,
        noidungcauhoi,
        dapan,
        id_monhoc
    }),

    async saveToDB(cauhoi, connection) {
        const query = 'INSERT INTO cauhoi (id_cauhoi, noidungcauhoi, dapan, id_monhoc) VALUES (?, ?, ?, ?)';
        try {
            const db = connection || pool;
            await db.query(query, [cauhoi.id_cauhoi, cauhoi.noidungcauhoi, cauhoi.dapan, cauhoi.id_monhoc]);
            return true;
        } catch (error) {
            console.error('Lỗi khi lưu câu hỏi:', error);
            throw error;
        }
    }
};

module.exports = cauhoi;