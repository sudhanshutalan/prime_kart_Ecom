import express from "express";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import { createTables } from "./utils/createTables.js";
import { errorHandler } from "./middlewares/error.middlewares.js";

//route imports
import authRouter from "./routes/authRouter.js";
import productRouter from "./routes/productRouter.js";
import adminRouter from "./routes/adminRoutes.js";

const app = express();

config({ path: "./config/config.env" });

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "PUT", "POST", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    tempFileDir: "./uploads",
    useTempFiles: true,
  })
);

createTables()
  .then(() => {
    console.log("Database tables are set up.");
  })
  .catch((err) => {
    console.error("Failed to set up database tables:", err);
  });

// routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/admin", adminRouter);

// app.use(errorMiddleware);
app.use(errorHandler);

export default app;
