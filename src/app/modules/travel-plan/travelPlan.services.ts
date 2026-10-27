import type { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import type { Request } from "express";
import type { JWTPayload } from "../../interfaces/index.js";
import AppError from "../../errorHelpers/appError.js";
import { prisma } from "../../config/prisma.config.js";
import calculatePagination from "../../utils/paginations.js";
import type { TravelPlanWhereInput } from "../../../../generated/prisma/models.js";
import { fileUploader } from "../../utils/fileUploader.js";

// create travel plan
// create travel plan
const createTravelPlan = async (req: Request & { user?: JWTPayload }) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not found");
  }

  let uploadedResult: any;
  if (req?.file) {
    try {
      uploadedResult = await fileUploader.uploadToCloudinary(req.file);
    } catch (uploadError) {
      console.error("Travel plan image upload failed:", uploadError);
    }
  }

  let bodyData = req.body;
  if (typeof req.body?.data === "string") {
    try {
      bodyData = JSON.parse(req.body.data);
    } catch {
      bodyData = req.body;
    }
  } else if (req.body?.data && typeof req.body.data === "object") {
    bodyData = req.body.data;
  }

  const merged = { ...req.body, ...bodyData };
  const {
    title,
    destination,
    startDate,
    endDate,
    budgetFrom,
    budgetTo,
    travelType,
    description,
    videoUrl,
    visibility,
    includes,
    minMates,
    maxMates
  } = merged;

  if (!startDate || isNaN(new Date(startDate).getTime())) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Valid start date is required");
  }
  if (!endDate || isNaN(new Date(endDate).getTime())) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Valid end date is required");
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (parsedEndDate <= parsedStartDate) {
    throw new AppError(StatusCodes.BAD_REQUEST, "End date must be greater than start date");
  }

  const defaultImage = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
  const planImages = uploadedResult?.secure_url
    ? [uploadedResult.secure_url]
    : [defaultImage];

  const parsedIncludes = Array.isArray(includes)
    ? includes
    : typeof includes === "string"
    ? includes.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
    : [];

  const createdPlan = await prisma.travelPlan.create({
    data: {
      userId,
      title: title || `${destination} Travel Plan`,
      destination,
      minMates: parseInt(minMates) || 1,
      maxMates: parseInt(maxMates) || 5,
      planImages,
      includes: parsedIncludes,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      budgetFrom: parseInt(budgetFrom) || 0,
      budgetTo: parseInt(budgetTo) || 0,
      travelType: travelType || "SOLO",
      description: description ?? undefined,
      videoUrl: videoUrl ?? undefined,
      visibility: visibility === "PRIVET" ? "PRIVET" : "PUBLIC",
    },
  });

  return { travelPlan: createdPlan };
};

// Get all plans with filter, seach and pagination
const getAllTravelPlans = async (
  params: any,
  options: any,
  user: JwtPayload
) => {
  const { page, limit, skip, sortOrder, sortBy } = calculatePagination(options);
  const { searchTerm, travelType, ...filterData } = params;

  const andConditions: TravelPlanWhereInput[] = [];

  const rawStart = filterData.startDate;
  const rawEnd = filterData.endDate;
  delete filterData.startDate;
  delete filterData.endDate;

  andConditions.push({ isDeleted: false });

  if (user?.role === "USER") {
    andConditions.push({
      user: {
        isDeleted: false,
      },
    });
  }

  // Search fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { destination: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // date filter
  if (rawStart && rawEnd) {
    const start = new Date(rawStart);
    const end = new Date(rawEnd);

    if (start > end) {
      throw new AppError(400, "Start date cannot be later than end date");
    }

    andConditions.push({
      AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }],
    });
  }

  if (rawStart && !rawEnd) {
    andConditions.push({ startDate: { gte: new Date(rawStart) } });
  }

  if (!rawStart && rawEnd) {
    andConditions.push({ endDate: { lte: new Date(rawEnd) } });
  }

  // Handle travelType filter
  if (travelType && travelType !== "ALL") {
    andConditions.push({ travelType: { equals: travelType } });
  }

  // Filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: filterData[key],
        },
      })),
    });
  }

  const whereCondition: TravelPlanWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const total = await prisma.travelPlan.count({ where: whereCondition });

  const result = await prisma.travelPlan.findMany({
    skip,
    take: limit,
    where: whereCondition,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
          gender: true,
          interests: true,
          visitedCountries: true,
          verifiedBadge: true,
          status: true,
        },
      },
    },
  });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

// Get travel plan by id
const getTravelPlanById = async (id: string) => {
  const result = await prisma.travelPlan.findUnique({
    where: { id, isDeleted: false },
    include: {
      user: true,
      joinRequests: true,
    },
  });

  if (!result) {
    throw new Error("Travel plan not found.");
  }

  return result;
};

// Get loged in users travel plan
const getMyTravelPlans = async (
  params: any,
  options: any,
  user: JwtPayload
) => {
  const { page, limit, skip, sortOrder, sortBy } = calculatePagination(options);
  const { searchTerm, travelType, ...filterData } = params;

  const andConditions: TravelPlanWhereInput[] = [];

  const rawStart = filterData.startDate;
  const rawEnd = filterData.endDate;
  delete filterData.startDate;
  delete filterData.endDate;

  if (user?.role === "USER") {
    andConditions.push({
      userId: user?.id,
      isDeleted: false,
    });
  }

  // Search fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        { destination: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // date filter
  if (rawStart && rawEnd) {
    const start = new Date(rawStart);
    const end = new Date(rawEnd);

    if (start > end) {
      throw new AppError(400, "Start date cannot be later than end date");
    }

    andConditions.push({
      AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }],
    });
  }

  if (rawStart && !rawEnd) {
    andConditions.push({ startDate: { gte: new Date(rawStart) } });
  }

  if (!rawStart && rawEnd) {
    andConditions.push({ endDate: { lte: new Date(rawEnd) } });
  }

  // Handle travelType filter
  if (travelType && travelType !== "ALL") {
    andConditions.push({ travelType: { equals: travelType } });
  }

  // Filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: filterData[key],
        },
      })),
    });
  }

  const whereCondition: TravelPlanWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const total = await prisma.travelPlan.count({ where: whereCondition });

  const result = await prisma.travelPlan.findMany({
    skip,
    take: limit,
    where: whereCondition,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
          gender: true,
          interests: true,
          visitedCountries: true,
          verifiedBadge: true,
          status: true,
        },
      },
    },
  });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

// Update plan
const updateTravelPlan = async (req: Request & { user?: JWTPayload }) => {
  const user = req?.user;
  const id = req.params?.id;

  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not found");
  }

  if (!id) {
    throw new AppError(StatusCodes.NOT_FOUND, "Travel id not found");
  }

  let uploadedResult;
  if (req?.file) {
    uploadedResult = await fileUploader.uploadToCloudinary(req.file);
  }

  const payload = req.body;
  const plan = await prisma.travelPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new AppError(StatusCodes.NOT_FOUND, "Travel plan not found.");
  }

  if (user?.role !== "ADMIN" && plan.userId !== user.id) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You are not allowed to update this plan."
    );
  }

  const updated = await prisma.travelPlan.update({
    where: { id },
    data: {
      ...payload,
      budgetFrom: parseInt(payload?.budgetFrom),
      budgetTo: parseInt(payload?.budgetTo),
      planImages: uploadedResult?.secure_url ? [uploadedResult?.secure_url] : plan?.planImages,
    },
  });

  return updated;
};

// Delete plan
const deleteTravelPlan = async (id: string, user: JwtPayload) => {
  const plan = await prisma.travelPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new AppError(StatusCodes.NOT_FOUND, "Travel plan not found.");
  }

  await prisma.travelPlan.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "Travel plan deleted successfully" };
};

export const TravelPlanServices = {
  createTravelPlan,
  getAllTravelPlans,
  getMyTravelPlans,
  updateTravelPlan,
  deleteTravelPlan,
  getTravelPlanById,
};
