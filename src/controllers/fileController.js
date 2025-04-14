const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cauhoi = require('../models/cauhoiModels');
const cautraloi = require('../models/cautraloiModels');
const pool = require('../db');

const processFile = async (req, res) => {
    let connection;
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng upload file' });
        }

        const { id_monhoc, examId } = req.body;
        if (!id_monhoc || !examId) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Vui lòng cung cấp id_monhoc và examId' });
        }

        const filePath = req.file.path;
        const originalFileName = req.file.originalname.toLowerCase();
        console.log('Original file name:', originalFileName);
        let text;

        if (originalFileName.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        } else if (originalFileName.endsWith('.pdf')) {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            text = data.text;
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Định dạng file không hỗ trợ' });
        }

        const lines = text.split('\n').filter(line => line.trim() !== '');
        console.log('Lines extracted from file:', lines);

        if (lines.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'File không chứa nội dung hợp lệ' });
        }

        let currentQuestion = null;
        let answers = [];
        let correctAnswer = null;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const line of lines) {
            const trimmedLine = line.trim();
            console.log('Processing line:', trimmedLine);

            if (trimmedLine.match(/^\d+\./)) {
                if (currentQuestion) {
                    if (answers.length !== 4) {
                        console.warn(`Câu hỏi "${currentQuestion.noidungcauhoi}" chỉ có ${answers.length} đáp án, mong đợi 4.`);
                    }
                    currentQuestion.dapan = correctAnswer || '';
                    await saveQuestionAndAnswers(currentQuestion, answers, connection, examId);
                }
                const questionContent = trimmedLine.replace(/^\d+\.\s*/, '');
                if (!questionContent) {
                    console.warn('Câu hỏi không có nội dung, bỏ qua');
                    currentQuestion = null;
                    continue;
                }
                currentQuestion = cauhoi.create(
                    `CH${uuidv4()}`,
                    questionContent,
                    null,
                    id_monhoc
                );
                answers = [];
                correctAnswer = null;
            } else if (trimmedLine.match(/^[A-D]\./i)) {
                if (!currentQuestion) continue; // Bỏ qua nếu không có câu hỏi hiện tại
                const answerContent = trimmedLine.replace(/^[A-D]\.\s*/i, '');
                if (!answerContent) continue; // Bỏ qua nếu đáp án rỗng
                answers.push(cautraloi.create(
                    `TL${uuidv4()}`,
                    currentQuestion.id_cauhoi,
                    answerContent
                ));
            } else if (trimmedLine.includes('Đáp án:') || trimmedLine.includes('Đáp án đúng:')) {
                if (!currentQuestion) continue; // Bỏ qua nếu không có câu hỏi hiện tại
                const answerLabel = trimmedLine.split(':')[1]?.trim();
                if (!answerLabel) continue; // Bỏ qua nếu không có nhãn đáp án
                console.log('Detected answer label:', answerLabel);
                const correctAnswerObj = answers.find(ans => {
                    const answerIndex = answers.indexOf(ans);
                    const labels = ['A', 'B', 'C', 'D'];
                    return labels[answerIndex] === answerLabel;
                });
                correctAnswer = correctAnswerObj ? correctAnswerObj.noidungcautraloi : '';
            }
        }

        if (currentQuestion) {
            if (answers.length !== 4) {
                console.warn(`Câu hỏi cuối "${currentQuestion.noidungcauhoi}" chỉ có ${answers.length} đáp án, mong đợi 4.`);
            }
            currentQuestion.dapan = correctAnswer || '';
            await saveQuestionAndAnswers(currentQuestion, answers, connection, examId);
        }

        await connection.commit();

        fs.unlinkSync(filePath);
        return res.status(200).json({ message: 'Xử lý file thành công và lưu vào database' });
    } catch (error) {
        console.error('Lỗi chi tiết:', error);
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

async function saveQuestionAndAnswers(question, answers, connection, examId) {
    if (!question || answers.length === 0) {
        console.warn('Không có câu hỏi hoặc đáp án để lưu, bỏ qua');
        return;
    }

    console.log('Saving question:', question);
    console.log('Saving answers:', answers);
    await cauhoi.saveToDB(question, connection);
    for (const answer of answers) {
        await cautraloi.saveToDB(answer, connection);
    }

    // Liên kết câu hỏi với đề thi trong bảng dethi_cauhoi
    const queryDethiCauhoi = `
        INSERT INTO dethi_cauhoi (id_dethi, id_cauhoi)
        VALUES (?, ?)
    `;
    await connection.query(queryDethiCauhoi, [examId, question.id_cauhoi]);
}

module.exports = { processFile };