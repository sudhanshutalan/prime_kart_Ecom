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
import Stripe from "stripe";
import database from "./db/db.js";

const app = express();

config({ path: "./config/config.env" });

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "PUT", "POST", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Stripe Integration
app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = Stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      return res.status(400).send(`WebHook Error: ${error.message || error}`);
    }

    // handling the events
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent_client_secret = event.data.object.client_secret;
      try {
        //FINDING and update payment
        const updatedPaymentStatus = "Paid";
        const paymentTableUpdateResult = await database.query(
          `UPDATE payments SET payment_status = $1 WHERE payment_intent_id =$2 RETURNING*`,
          [updatedPaymentStatus, paymentIntent_client_secret]
        );
        const orderTableUpdateResult = await database.query(
          `UPDATE orders SET paid_at = NOW() where id = $1 RETURNING*`,
          [paymentTableUpdateResult.rows[0].order_id]
        );

        // Reduce stock for each product
        const orderId = paymentTableUpdateResult.rows[0].order_id;
        const { rows: orderedItems } = await database.query(
          `SELECT product_id,quantity FROM order_items WHERE order_id = $1`,
          [orderId]
        );

        // for each ordered item reduce the product stock
        for (const item of orderedItems) {
          await database.query(
            `UPDATE products SET stock = stock - $1 WHERE id = $2`,
            [item.quantity, item.product_id]
          );
        }
      } catch (error) {
        return res
          .status(500)
          .send(`Error Updating paid_at timestamp in orders table ${error}`);
      }
    }
    return res.status(200).send({ recieved: true });
  }
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
