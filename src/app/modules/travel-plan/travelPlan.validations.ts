import { z } from "zod";
import { TravelType } from "../../../../generated/prisma/enums.js";

const createTravelPlanSchema = z.object({
  title: z.string().optional(),
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
  budgetFrom: z.union([z.string(), z.number()]).optional(),
  budgetTo: z.union([z.string(), z.number()]).optional(),
  minMates: z.union([z.string(), z.number()]).optional(),
  maxMates: z.union([z.string(), z.number()]).optional(),
  travelType: z.nativeEnum(TravelType),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  includes: z.union([z.string(), z.array(z.string())]).optional(),
  visibility: z.string().default('PUBLIC'),
});

const updateTravelPlanSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  destination: z.string().min(1, "Destination is required").optional(),
  startDate: z.string().min(1, "Start date is required").optional(),
  endDate: z.string().min(1, "End date is required").optional(),
  budgetFrom: z.string().optional(),
  budgetTo: z.string().optional(),
  travelType: z.enum(["SOLO", "FAMILY", "FRIENDS"]).optional(),
  description: z.string().optional(),
});

export const TravelPlanValidation = {
  createTravelPlanSchema,
  updateTravelPlanSchema,
};
