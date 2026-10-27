import bcrypt from "bcryptjs";
import type { Secret, SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/prisma.config.js";
import type { userLoginInput } from "./auth.interfaces.js";
import { UserStatus } from "../../../../generated/prisma/enums.js";
import AppError from "../../errorHelpers/appError.js";
import { generateJwtToken, verifyToken } from "../../utils/jwtToken.js";
import { envVars } from "../../config/env.config.js";
import { StatusCodes } from "http-status-codes";
// Demo user fallback profiles
const DEMO_USERS: Record<string, any> = {
  "admindemo@gmail.com": {
    id: "7825a03d-4e8a-460e-b0e5-988788e88d8b",
    firstName: "Admin",
    lastName: "Demo",
    email: "admindemo@gmail.com",
    role: "ADMIN",
    status: "ACTIVE",
    verifiedBadge: false,
    birthDate: new Date("2002-01-15T18:00:00.000Z"),
  },
  "userdemo@gmail.com": {
    id: "30cb9415-41db-4aef-ba0c-f534c17cc4d7",
    firstName: "User",
    lastName: "Demo",
    email: "userdemo@gmail.com",
    role: "USER",
    status: "ACTIVE",
    verifiedBadge: true,
    birthDate: new Date("1998-01-14T18:00:00.000Z"),
  },
};

// User login
const userLogin = async (payload: userLoginInput) => {
  let existingUser: any = null;

  try {
    existingUser = await prisma.user.findUnique({
      where: {
        email: payload?.email,
      },
    });
  } catch (error) {
    console.warn("Database connection issue during login:", error);
  }

  // If user not in DB but it's a demo account with password 123456
  if (!existingUser && DEMO_USERS[payload?.email] && payload?.password === "123456") {
    try {
      const demoData = DEMO_USERS[payload.email];
      const hashedPassword = await bcrypt.hash("123456", Number(envVars.SALT_ROUND || 10));
      existingUser = await prisma.user.create({
        data: {
          id: demoData.id,
          firstName: demoData.firstName,
          lastName: demoData.lastName,
          email: demoData.email,
          role: demoData.role,
          status: demoData.status,
          verifiedBadge: demoData.verifiedBadge,
          birthDate: demoData.birthDate,
          password: hashedPassword,
        },
      });
    } catch {
      // Fallback in-memory if DB is not reachable
      existingUser = DEMO_USERS[payload.email];
    }
  }

  if (!existingUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found with this email");
  }

  if (existingUser?.status === "DELETED") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Sorry this account is Deleted"
    );
  }

  if (existingUser?.password) {
    const isPasswordMatch = await bcrypt.compare(
      payload?.password,
      existingUser?.password
    );

    if (!isPasswordMatch) {
      throw new AppError(400, "Password is incorrect");
    }
  } else if (DEMO_USERS[payload?.email]) {
    if (payload?.password !== "123456") {
      throw new AppError(400, "Password is incorrect");
    }
  }

  // Generate access Token
  const accessToken = generateJwtToken(
    {
      email: existingUser?.email,
      role: existingUser?.role,
      id: existingUser.id,
      verifiedBadge: existingUser?.verifiedBadge || false,
    },
    envVars.JWT.JWT_ACCESS_SECRET,
    envVars.JWT.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"]
  );

  // Generate refresh Token
  const refreshToken = generateJwtToken(
    {
      email: existingUser?.email,
      role: existingUser?.role,
      id: existingUser.id,
      verifiedBadge: existingUser?.verifiedBadge || false,
    },
    envVars.JWT.JWT_REFRESH_SECRET,
    "30d"
  );

  return {
    accessToken,
    refreshToken,
  };
};

// Get current loged in user
const getMe = async (session: any) => {
  const accessToken = session?.accessToken;

  if (!accessToken) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized. No access token provided.");
  }

  const decodedData = verifyToken(
    accessToken,
    envVars.JWT.JWT_ACCESS_SECRET as Secret
  );

  let userData: any = null;
  try {
    userData = await prisma.user.findUnique({
      where: {
        email: decodedData.email,
        status: UserStatus.ACTIVE,
      },
    });
  } catch (error) {
    console.warn("Database connection issue during getMe:", error);
  }

  if (!userData && DEMO_USERS[decodedData?.email]) {
    userData = DEMO_USERS[decodedData.email];
  }

  if (!userData) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  const { password, ...rest } = userData;

  return rest;
};

// Generate accesstoken by refreshtoken
const refreshToken = async (token: string) => {
  let decodedData;
  try {
    decodedData = verifyToken(token, envVars.JWT.JWT_REFRESH_SECRET as Secret);
  } catch (err) {
    throw new Error("You are not authorized!");
  }

  let userData: any = null;
  try {
    userData = await prisma.user.findUnique({
      where: {
        email: decodedData.email,
        status: UserStatus.ACTIVE,
      },
    });
  } catch (error) {
    console.warn("Database connection issue during refreshToken:", error);
  }

  if (!userData && DEMO_USERS[decodedData?.email]) {
    userData = DEMO_USERS[decodedData.email];
  }

  if (!userData) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  const accessToken = generateJwtToken(
    {
      email: userData.email,
      role: userData.role,
      id: userData.id,
      verifiedBadge: userData?.verifiedBadge || false,
    },
    envVars.JWT.JWT_ACCESS_SECRET as Secret,
    envVars.JWT.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"]
  );

  return {
    accessToken,
  };
};

export const AuthServices = {
  userLogin,
  getMe,
  refreshToken,
};
