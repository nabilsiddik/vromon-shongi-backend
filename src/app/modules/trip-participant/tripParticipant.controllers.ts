import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import { TravelPlanServices } from "../travel-plan/travelPlan.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import type { JWTPayload } from "../../interfaces/index.js";
import { TripParticipantServices } from "./tripParticipant.services.js";

// Trip Participant join request
const createTripParticipant = catchAsync(async (req: Request & {user?: JWTPayload}, res: Response) => {
  const participantId = req?.user?.id
  const {tripId} = req?.body

  if(!participantId) throw new AppError(StatusCodes.BAD_REQUEST, 'Please provide participant id')

  const result = await TripParticipantServices.createTripParticipant(tripId, participantId as string);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Participant request created.",
    data: result,
  });
});

// Get all my Participant join request
const myParticipantRequest = catchAsync(async (req: Request & {user?: JWTPayload}, res: Response) => {
  const userId = req?.user?.id

  if(!userId) throw new AppError(StatusCodes.UNAUTHORIZED, 'Please provide user id')

  const result = await TripParticipantServices.myParticipantRequest(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Participant requests retrived successfully.",
    data: result,
  });
});


// Get all requests sent by this user to join other trips (Outgoing)
const myOutgoingTripRequests = catchAsync(async (req: Request & {user?: JWTPayload}, res: Response) => {
  const userId = req?.user?.id

  if(!userId) throw new AppError(StatusCodes.UNAUTHORIZED, 'Please authenticate')

  const result = await TripParticipantServices.getMyOutgoingTripRequests(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Outgoing trip requests retrieved successfully.",
    data: result,
  });
});

// Get all approved participation of an user for join room conversation
const getAllParticipationsOfAnUser = catchAsync(async (req: Request & {user?: JWTPayload}, res: Response) => {
  const userId = req?.user?.id

  if(!userId) throw new AppError(StatusCodes.UNAUTHORIZED, 'You are unauthorized')

  const result = await TripParticipantServices.getAllParticipationsOfAnUser(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Retrived all participation of an user.",
    data: result,
  });
});



// Get trip participant by id
const getTripParticipantById = catchAsync(async (req: Request, res: Response) => {
  const participantReqId = req?.params?.id

  if(!participantReqId) throw new AppError(StatusCodes.UNAUTHORIZED, 'Please provide participant request id')

  const result = await TripParticipantServices.getTripParticipantById(participantReqId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Participant request retrived successfully.",
    data: result,
  });
});


// Get user participation for a trip
const getUserParticipationForTrip = catchAsync(async (req: Request & {user?: JWTPayload}, res: Response) => {
  const participantId = req?.user?.id
  const tripId = req?.params?.tripId

  console.log(tripId);

  if(!tripId) throw new AppError(StatusCodes.BAD_REQUEST, 'Trip id not provided.')

  if(!participantId) throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized.')

  const result = await TripParticipantServices.getUserParticipationForTrip(tripId, participantId as string);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Participation Retrived.",
    data: result,
  });
});

// Update participant request
const updateParticipantRequest = catchAsync(async (req: Request, res: Response) => {
  const participantReqId = req?.params?.id
  const {status} = req?.body


  if(!participantReqId || !status) throw new AppError(StatusCodes.UNAUTHORIZED, 'Please provide participant request id or status')

  const result = await TripParticipantServices.updateParticipantRequest(participantReqId, status);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Participant request updated successfully.",
    data: result,
  });
});


// Get participant for specific trip
const getParticipantsForSpecificTrip = catchAsync(async (req: Request, res: Response) => {
  const tripId = req?.params?.tripId


  if(!tripId) throw new AppError(StatusCodes.UNAUTHORIZED, 'Please provide trip id')

  const result = await TripParticipantServices.getParticipantsForSpecificTrip(tripId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Participants For specific trip retrived.",
    data: result,
  });
});

export const TripParticipantControllers = {
    createTripParticipant,
    myParticipantRequest,
    myOutgoingTripRequests,
    getTripParticipantById,
    updateParticipantRequest,
    getParticipantsForSpecificTrip,
    getUserParticipationForTrip,
    getAllParticipationsOfAnUser
}