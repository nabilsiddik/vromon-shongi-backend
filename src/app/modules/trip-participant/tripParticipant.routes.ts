import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../../generated/prisma/enums.js";
import { TripParticipantControllers } from "./tripParticipant.controllers.js";

const tripParticipantRouter = Router();

// Create trip participant
tripParticipantRouter.post(
  "/",
  checkAuth(UserRole.ADMIN, UserRole.USER),
  TripParticipantControllers.createTripParticipant
);

// Get all incoming participant requests for my trips (host view)
tripParticipantRouter.get(
  "/",
  checkAuth(UserRole.ADMIN, UserRole.USER),
  TripParticipantControllers.myParticipantRequest
);

// Get all requests sent by this user to join other trips (outgoing view)
tripParticipantRouter.get(
  "/outgoing",
  checkAuth(UserRole.ADMIN, UserRole.USER),
  TripParticipantControllers.myOutgoingTripRequests
);

// Get all approved participation of an user for join room conversation
tripParticipantRouter.get(
  "/joined",
  checkAuth(UserRole.ADMIN, UserRole.USER),
  TripParticipantControllers.getAllParticipationsOfAnUser
);

// Get user participation status for a specific trip
tripParticipantRouter.get(
  "/participation-status/:tripId",
  checkAuth(UserRole.ADMIN, UserRole.USER),
  TripParticipantControllers.getUserParticipationForTrip
);

// Get participant for specific trip
tripParticipantRouter.get(
  "/participants/:tripId",
  TripParticipantControllers.getParticipantsForSpecificTrip
);

// Get trip participant by id
tripParticipantRouter.get(
  "/:id",
  checkAuth(UserRole.ADMIN, UserRole.USER),
  TripParticipantControllers.getTripParticipantById
);

// Update participant request
tripParticipantRouter.patch(
  "/:id",
  checkAuth(UserRole.ADMIN, UserRole.USER),
  TripParticipantControllers.updateParticipantRequest
);

export default tripParticipantRouter;
