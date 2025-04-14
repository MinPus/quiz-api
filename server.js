const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const pool = require("./src/db");
const fileRoutes = require("./src/routes/fileRoutes");
const examRoutes = require("./src/routes/examRoutes");
const questionRoutes = require("./src/routes/questionRoutes");
const authRoutes = require("./src/routes/authRoutes");
const dethiRoutes = require("./src/routes/dethiRoutes"); // Fix the naming conflict

dotenv.config();

const app = express();

// Middleware cho CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Đăng ký các route
// Route upload file không cần express.json(), vì đã dùng multer
app.use("/api", fileRoutes);

// Áp dụng express.json() cho các route cần xử lý JSON
app.use("/api", express.json(), examRoutes);
app.use("/api", express.json(), questionRoutes);
app.use("/api", express.json(), authRoutes);
app.use("/api", express.json(), dethiRoutes);

// Route kiểm tra CORS
app.get("/test", (req, res) => {
  res.json({ message: "CORS đã được bật!" });
});

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  if (err instanceof require("multer").MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res
        .status(400)
        .json({ message: `Tên field không đúng, mong đợi 'file' nhưng nhận được '${err.field}'` });
    }
    return res.status(400).json({ message: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ message: "Lỗi server" });
});

async function checkDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Connected to MySQL database");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
}

const PORT = process.env.SERVER_PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await checkDatabaseConnection();
});