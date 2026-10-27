import type { Request } from "express";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import { fileUploader } from "../../utils/fileUploader.js";
import { prisma } from "../../config/prisma.config.js";
import AppError from "../../errorHelpers/appError.js";
import { envVars } from "../../config/env.config.js";
import calculatePagination from "../../utils/paginations.js";
import type { UserWhereInput } from "../../../../generated/prisma/models.js";
import { userSearchableFields } from "./user.constants.js";
import type { JWTPayload } from "../../interfaces/index.js";
import { UserRole, UserStatus } from "../../../../generated/prisma/enums.js";
import { parseBoolean } from "../../utils/parseQueryToBoolian.js";
import { INVALID } from "zod/v3";

// Create user
const createUser = async (req: Request) => {
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
  const firstName = merged.firstName;
  const lastName = merged.lastName;
  const email = merged.email ? String(merged.email).trim().toLowerCase() : undefined;
  const password = merged.password;
  const birthDate = merged.birthDate;

  if (!email) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Email is required to create an account."
    );
  }

  if (!password) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Password is required to create an account."
    );
  }

  let uploadedResult;
  if (req?.file) {
    try {
      uploadedResult = await fileUploader.uploadToCloudinary(req.file);
    } catch (uploadError) {
      console.error("Profile photo upload failed:", uploadError);
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "An account with this email already exists."
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(envVars.SALT_ROUND) || 10
  );

  let parsedBirthDate: Date | null = null;
  if (birthDate && !isNaN(Date.parse(birthDate))) {
    parsedBirthDate = new Date(birthDate);
  }

  const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    (firstName || "") + " " + (lastName || "")
  )}`;

  const createdUser = await prisma.user.create({
    data: {
      firstName: firstName || "",
      lastName: lastName || "",
      email,
      birthDate: parsedBirthDate,
      password: hashedPassword,
      profileImage: uploadedResult?.secure_url || fallbackAvatar,
    },
  });

  const { password: userPassword, ...rest } = createdUser;

  return rest;
};

// Get all users from db
const getAllUsers = async (params: any, options: any) => {
  const { page, limit, skip, sortOrder, sortBy } = calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  Object.keys(filterData).forEach((key) => {
    filterData[key] = parseBoolean(filterData[key]);
  });

  const andConditions: UserWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: userSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: filterData[key],
        },
      })),
    });
  }

  const whereConditions: UserWhereInput =
    andConditions.length > 0
      ? {
        AND: andConditions,
      }
      : {};

  const total = await prisma.user.count({
    where: whereConditions,
  });

  const result = await prisma.user.findMany({
    skip,
    take: limit,
    where: whereConditions,
    include: {
      travelPlans: true,
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Get user by id
const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id, isDeleted: false },
    include: {
      travelPlans: {
        where: {
          isDeleted: false,
        },
      },
      receivedReviews: {
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              verifiedBadge: true,
            },
          },
        },
      },

      givenReviews: {
        include: {
          targetUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              verifiedBadge: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  const ratingStats = await prisma.review.aggregate({
    where: { targetUserId: id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const averageRating = ratingStats?._avg?.rating ?? 0;
  const reviewsCount = ratingStats?._count?.rating ?? 0;

  // Remove password before sending
  const { password, ...rest } = user;

  return {
    ...rest,
    averageRating: Number(averageRating.toFixed(1)),
    reviewsCount,
  };
};

// get top rated user
const getTopRatedUsers = async () => {
  const topUsers = await prisma.review.groupBy({
    where: { isDeleted: false },
    by: ["targetUserId"],
    _avg: {
      rating: true,
    },
    orderBy: {
      _avg: {
        rating: "desc",
      },
    },
    take: 4,
  });

  const users = await prisma.user.findMany({
    where: {
      id: { in: topUsers.map((user) => user.targetUserId) },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImage: true,
    },
  });

  const topRatedUsers = topUsers.map((userGroup) => {
    const user = users.find((user) => user.id === userGroup.targetUserId);
    return {
      ...user,
      averageRating: userGroup._avg.rating,
    };
  });

  return topRatedUsers;
};

export const getUserReviewsWithAvgRating = async (userId: string) => {
  // Get average rating
  const ratingAggregate = await prisma.review.aggregate({
    where: { targetUserId: userId },
    _avg: { rating: true },
    _count: { id: true },
  });

  // Get recent reviews (latest 5)
  const recentReviews = await prisma.review.findMany({
    where: { targetUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      reviewer: {
        select: { id: true, firstName: true, lastName: true, profileImage: true },
      },
      rating: true,
      comment: true,
      createdAt: true,
    },
  });

  return {
    averageRating: ratingAggregate._avg.rating || 0,
    reviewCount: ratingAggregate._count.id,
    recentReviews,
  };
};

// Get profile info
const getMyProfile = async (user: JWTPayload) => {
  try {
    const userInfo = await prisma.user.findUnique({
      where: {
        email: user.email,
        status: UserStatus.ACTIVE,
        isDeleted: false,
      },
      include: {
        travelPlans: {
          where: { isDeleted: false },
          select: {
            id: true,
            destination: true,
            startDate: true,
            endDate: true,
            travelType: true,
            createdAt: true,
          },
        },

        receivedReviews: {
          where: { isDeleted: false },
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                verifiedBadge: true,
              },
            },
            plan: {
              select: {
                id: true,
                destination: true,
              },
            },
          },
        },

        givenReviews: {
          where: { isDeleted: false },
          include: {
            targetUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                verifiedBadge: true,
              },
            },
            plan: {
              select: {
                id: true,
                destination: true,
              },
            },
          },
        },
      },
    });

    if (!userInfo) {
      if (user.email === "admindemo@gmail.com") {
        return {
          id: "7825a03d-4e8a-460e-b0e5-988788e88d8b",
          firstName: "Admin",
          lastName: "Demo",
          email: "admindemo@gmail.com",
          role: "ADMIN",
          status: "ACTIVE",
          verifiedBadge: false,
          birthDate: new Date("2002-01-15T18:00:00.000Z"),
          travelPlans: [],
          receivedReviews: [],
          givenReviews: [],
          averageRating: 5.0,
          reviewsCount: 0,
        };
      } else if (user.email === "userdemo@gmail.com") {
        return {
          id: "30cb9415-41db-4aef-ba0c-f534c17cc4d7",
          firstName: "User",
          lastName: "Demo",
          email: "userdemo@gmail.com",
          role: "USER",
          status: "ACTIVE",
          verifiedBadge: true,
          birthDate: new Date("1998-01-14T18:00:00.000Z"),
          travelPlans: [],
          receivedReviews: [],
          givenReviews: [],
          averageRating: 5.0,
          reviewsCount: 0,
        };
      }
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    let profileData;

    if (userInfo.role === UserRole.USER) {
      profileData = await prisma.user.findUnique({
        where: {
          email: userInfo.email,
        },
      });
    }

    const ratingStats = await prisma.review.aggregate({
      where: { targetUserId: userInfo?.id, isDeleted: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = ratingStats?._avg?.rating ?? 0;
    const reviewsCount = ratingStats?._count?.rating ?? 0;

    return {
      ...userInfo,
      ...profileData,
      averageRating: Number(averageRating.toFixed(1)),
      reviewsCount,
    };
  } catch (err: any) {
    if (user.email === "admindemo@gmail.com") {
      return {
        id: "7825a03d-4e8a-460e-b0e5-988788e88d8b",
        firstName: "Admin",
        lastName: "Demo",
        email: "admindemo@gmail.com",
        role: "ADMIN",
        status: "ACTIVE",
        verifiedBadge: false,
        birthDate: new Date("2002-01-15T18:00:00.000Z"),
        travelPlans: [],
        receivedReviews: [],
        givenReviews: [],
        averageRating: 5.0,
        reviewsCount: 0,
      };
    } else if (user.email === "userdemo@gmail.com") {
      return {
        id: "30cb9415-41db-4aef-ba0c-f534c17cc4d7",
        firstName: "User",
        lastName: "Demo",
        email: "userdemo@gmail.com",
        role: "USER",
        status: "ACTIVE",
        verifiedBadge: true,
        birthDate: new Date("1998-01-14T18:00:00.000Z"),
        travelPlans: [],
        receivedReviews: [],
        givenReviews: [],
        averageRating: 5.0,
        reviewsCount: 0,
      };
    }
    throw err;
  }
};

// Update user
const updateUser = async (userId: string, req: Request) => {
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
  const { firstName, lastName, bio, currentLocation, visitedCountries, interests, birthDate } = merged;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  let uploadedResult;
  if (req?.file) {
    try {
      uploadedResult = await fileUploader.uploadToCloudinary(req.file);
    } catch (uploadError) {
      console.error("Profile photo update upload failed:", uploadError);
    }
  }

  const interestsArray =
    interests
      ?.toString()
      .split(",")
      .map((i: any) => i.trim().toLowerCase())
      .filter(Boolean) || [];

  const visitedCountriesArray =
    visitedCountries
      ?.toString()
      .split(",")
      .map((i: any) => i.trim().toLowerCase())
      .filter(Boolean) || [];

  let parsedBirthDate: Date | undefined;
  if (birthDate && !isNaN(Date.parse(birthDate))) {
    parsedBirthDate = new Date(birthDate);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      bio,
      currentLocation,
      interests: interestsArray,
      visitedCountries: visitedCountriesArray,
      profileImage: uploadedResult?.secure_url || user?.profileImage,
      ...(parsedBirthDate ? { birthDate: parsedBirthDate } : {}),
    },
  });

  return updatedUser;
};

// Delete user
const deleteUser = async (userId: string) => {
  if (!userId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User id not provided");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found while deleting");
  }

  const deletedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isDeleted: true,
      status: "DELETED",
    },
  });

  return deletedUser;
};

// Get all travelers
const getAllTravelers = async () => {
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    include: {
      travelPlans: true,
    },
  });

  const travelers = users.filter((user) => user?.travelPlans?.length > 0);

  return travelers;
};

// get matched travelers with logged in traveler
export const getMatchedTravelers = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      interests: true,
      visitedCountries: true,
      currentLocation: true,
    },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  const orConditions: any[] = [];

  if (user.interests && user.interests.length > 0) {
    orConditions.push({
      interests: {
        hasSome: user.interests,
      },
    });
  }

  if (user.visitedCountries && user.visitedCountries.length > 0) {
    orConditions.push({
      visitedCountries: {
        hasSome: user.visitedCountries,
      },
    });
  }

  if (user.currentLocation && user.currentLocation.trim().length > 0) {
    orConditions.push({
      currentLocation: {
        equals: user.currentLocation,
        mode: "insensitive",
      },
    });
  }

  const whereClause: any = {
    id: { not: userId },
    isDeleted: false,
    status: "ACTIVE",
  };

  if (orConditions.length > 0) {
    whereClause.OR = orConditions;
  }

  let travelers = await prisma.user.findMany({
    where: whereClause,
    take: 12,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bio: true,
      profileImage: true,
      currentLocation: true,
      interests: true,
      visitedCountries: true,
      verifiedBadge: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // If specific match returned 0 and conditions were provided, fallback to other active travelers so user still gets matches
  if (travelers.length === 0 && orConditions.length > 0) {
    travelers = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isDeleted: false,
        status: "ACTIVE",
      },
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bio: true,
        profileImage: true,
        currentLocation: true,
        interests: true,
        visitedCountries: true,
        verifiedBadge: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return travelers;
};

export const UserServices = {
  createUser,
  getAllUsers,
  getMyProfile,
  updateUser,
  getUserById,
  getTopRatedUsers,
  getUserReviewsWithAvgRating,
  deleteUser,
  getAllTravelers,
  getMatchedTravelers,
};
