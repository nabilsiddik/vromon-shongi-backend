import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { AuthServices } from "./auth.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";


// User login
const userLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.userLogin(req.body);
  const { accessToken, refreshToken } = result

  res.cookie("accessToken", accessToken, {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24
  });

  res.cookie('refreshToken', refreshToken, {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 90
  })

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User Loged in Successfully',
    data: {
      accessToken,
      refreshToken,
    }
  })
})

// Get logedin user info
const getMe = catchAsync(async (req: Request, res: Response) => {
  let token = req.cookies?.accessToken;
  const authHeader = req.headers.authorization;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  const userSession = { ...req.cookies, accessToken: token };

  const result = await AuthServices.getMe(userSession);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User retrive successfully!",
    data: result,
  });
});

// Generate access token using refresh token
const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;

    const result = await AuthServices.refreshToken(refreshToken);
    res.cookie("accessToken", result.accessToken, {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60,
    });

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Access token genereated successfully!",
        data: {
            message: "Access token genereated successfully!",
        },
    });
});



export const AuthControllers = {
  userLogin,
  getMe,
  refreshToken
}