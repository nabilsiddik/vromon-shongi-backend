import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { sendResponse } from "../../utils/userResponse.js";
import { AdminServices } from "./admin.services.js";

const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.getAdminAnalytics();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin analytics retrieved successfully",
    data: result,
  });
});

export const AdminControllers = {
  getAdminAnalytics,
};
