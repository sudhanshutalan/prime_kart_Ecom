import { createUserTable } from "../models/userTable.js";
import { createOrderItemTable } from "../models/orderItemsTable.js";
import { createShippingInfoTable } from "../models/shippinginfoTable.js";
import { createPaymentsTable } from "../models/paymentsTable.js";
import { createOrdersTable } from "../models/ordersTable.js";
import { createProductsTable } from "../models/productTable.js";
import { createProductReviewsTable } from "../models/productReviewsTable.js";

export const createTables = async () => {
  try {
    await createUserTable();
    await createProductsTable();
    await createOrdersTable();
    await createOrderItemTable();
    await createShippingInfoTable();
    await createPaymentsTable();
    await createProductReviewsTable();
    console.log("All tables created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};
