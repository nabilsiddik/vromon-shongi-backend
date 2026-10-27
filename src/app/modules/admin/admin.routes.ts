import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../../generated/prisma/enums.js";
import { AdminControllers } from "./admin.controllers.js";

const adminRouter = Router();

adminRouter.get(
  "/analytics",
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AdminControllers.getAdminAnalytics
);

export default adminRouter;
