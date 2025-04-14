const pool = require('../db');

const cautraloi = {
    create: (id_cautraloi, id_cauhoi, noidungcautraloi) => ({
        id_cautraloi,
        id_cauhoi,
        noidungcautraloi
    }),

    async saveToDB(cautraloi, connection) {
        const query = 'INSERT INTO cautraloi (id_cautraloi, id_cauhoi, noidungcautraloi) VALUES (?, ?, ?)';
        try {
            const db = connection || pool;
            // Sửa cauhoi.id_cauhoi thành cautraloi.id_cauhoi
            await db.query(query, [cautraloi.id_cautraloi, cautraloi.id_cauhoi, cautraloi.noidungcautraloi]);
            return true;
        } catch (error) {
            console.error('Lỗi khi lưu câu trả lời:', error);
            throw error;
        }
    }
};

module.exports = cautraloi;