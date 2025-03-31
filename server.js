const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const pool = require("./src/db"); // Import kết nối MySQL
const authRoutes = require("./src/routes/authRoutes");

// Load biến môi trường từ .env
dotenv.config();
console.log("JWT_SECRET từ .env:", process.env.JWT_SECRET); // Debug ngay sau khi load

const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use("/api", authRoutes);

// Route test
app.get("/test", (req, res) => {
    res.json({ message: "CORS đã được bật!" });
});

async function checkDatabaseConnection() {
    try {
        await pool.query("SELECT 1");
        console.log("✅ Connected to MySQL database");
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
    }
}

// Dùng SERVER_PORT nếu có, nếu không mặc định 3000
const PORT = process.env.SERVER_PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await checkDatabaseConnection();
});
