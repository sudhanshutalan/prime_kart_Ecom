import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import database from "../db/db.js";
import { v2 as cloudinary } from "cloudinary";

export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  const totalUsersResult = await database.query(
    `SELECT COUNT(*) FROM users WHERE role ILIKE $1`,
    ["user"]
  );

  const totalUser = parseInt(totalUsersResult.rows[0].count);

  const offset = (page - 1) * 10;

  const users = await database.query(
    `SELECT * FROM users WHERE role ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    ["user", 10, offset]
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers: totalUser,
        currentPage: page,
        users: users.rows,
      },
      "All users fetched successfully"
    )
  );
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await database.query(
    `DELETE FROM users WHERE id = $1 RETURNING*`,
    [userId]
  );

  if (user.rows.length === 0) {
    throw new ApiError(400, "Either user not exists Or failed to delete user");
  }

  const avatar = user.rows[0].avatar;
  if (avatar?.public_id) {
    await cloudinary.uploader.destroy(avatar?.public_id);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedUser: user.rows[0] },
        "user deleted successfully"
      )
    );
});

export const dashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  const todayDate = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split("T")[0];

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  );
  const previousMonthStart = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );

  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const totalRevenueAllTimeQuery = await database.query(
    `SELECT SUM(total_price) FROM orders`
  );
  const totalRevenueAllTime = parseFloat(totalRevenueAllTimeQuery.rows[0]) || 0;

  //Total Users
  const totalUsersQuery = await database.query(
    `SELECT COUNT(*) FROM users WHERE role ILIKE $1`,
    ["user"]
  );
  const totalUsers = parseInt(totalUsersQuery.rows[0]) || 0;

  //Order status Count
  const orderStatusCountsQuery = await database.query(
    `SELECT order_status, COUNT(*) FROM orders GROUP BY order_status`
  );

  const orderStatusCount = {
    Processing: 0,
    Shipped: 0,
    Delievered: 0,
    Cancelled: 0,
  };
  orderStatusCountsQuery.rows.forEach((row) => {
    orderStatusCount[row.order_status] = parseInt(row.count);
  });

  // Todays Revenue
  const todaysRevenueQuery = await database.query(
    `SELECT SUM(total_price) FROM orders WHERE created_at::date = $1`,
    [todayDate]
  );
  const todaysRevenue = parseFloat(todaysRevenueQuery.rows[0]) || 0;

  // yesterdays Revenue
  const yesterdaysRevenueQuery = await database.query(
    `SELECT SUM(total_price) FROM orders WHERE created_at::date = $1`,
    [yesterdayDate]
  );
  const yesterdaysRevenue = parseFloat(yesterdaysRevenueQuery.rows[0]) || 0;

  // MonthlySales FOr lineChart
  const monthlySalesQuery = await database.query(
    `SELECT 
    TO_CHAR(created_at, 'Mon YYYY') AS month,
    DATE_TRUNC('month' created_at) AS date,
    SUM(total_price) as totalSales,
    FROM orders
    GROUP BY month,date
    ORDER BY date ASC
    `
  );

  const monthlySales = monthlySalesQuery.rows.map((row) => ({
    month: row.month,
    totalSales: parseFloat(row.totalSales) || 0,
  }));

  //Top 5 most sold products
  const topSellingProductQuery = await database.query(
    `SELECT p.name,
    p.images->0->>'url' AS image,
    p.category,
    p.ratings,
    SUM(oi.quantity) AS total_sold
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    GROUP BY p.name,p.images,p.category,p.ratings
    ORDER BY total_sold DESC
    LIMIT 5
    `
  );
  const topSellingProducts = topSellingProductQuery.rows;

  // TotalSale of CurrentMonth
  const currentMonthSalesQuery = await database.query(
    `
    SELECT SUM(total_price) AS total FROM orders
    WHERE created_at >= $1 AND created_at <=$2
    `,
    [currentMonthStart, currentMonthEnd]
  );
  const currentMonthSales =
    parseFloat(currentMonthSalesQuery.rows[0].total) || 0;

  // product with stock <=5
  const lowStockProductQuery = await database.query(
    `   SELECT name,stock FROM products WHERE stock <=5`
  );
  const lowStockProducts = lowStockProductQuery.rows;

  //Revenue Growth Rate
  const lastMonthRevenueQuery = await database.query(
    `
    SELECT SUM(total_price) AS total FROM orders WHERE created_at BETWEEN $1 AND $2`,
    [previousMonthStart, previousMonthEnd]
  );
  const lastMonthRevenue = parseFloat(lastMonthRevenueQuery.rows[0].total) || 0;

  // Revenue Growth
  let revenueGrowth = "0%";

  if (lastMonthRevenue > 0) {
    const growthRate =
      ((currentMonthSales - lastMonthRevenue) / lastMonthRevenue) * 100;
    revenueGrowth = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(2)}%`;
  }

  //new users in current Month
  const newUsersThisMonthQuery = await database.query(
    `SELECT COUNT(*) FROM users WHERE created_at >=$1`,
    [currentMonthStart]
  );

  const newUsersThisMonth = parseInt(newUsersThisMonthQuery.rows[0].count) || 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalRevenueAllTime,
        totalUsers,
        orderStatusCount,
        todaysRevenue,
        yesterdaysRevenue,
        monthlySales,
        topSellingProducts,
        currentMonthSales,
        lowStockProducts,
        revenueGrowth,
        newUsersThisMonth,
      },
      "Dashboard stats fetched successfully"
    )
  );
});
