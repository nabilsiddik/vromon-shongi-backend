import { StatusCodes } from "http-status-codes";
import { prisma } from "../../config/prisma.config.js";
import AppError from "../../errorHelpers/appError.js";

// Trip Participant join request
const createTripParticipant = async (tripId: string, participantId: string) => {

    const trip = await prisma.travelPlan.findFirst({
        where: {
            id: tripId,
            isDeleted: false
        },
        include: {
            tripParticipants: true
        }
    })

    if(!trip){
        throw new AppError(StatusCodes.NOT_FOUND, 'Trip not found.')
    }

    if(trip?.userId === participantId){
        throw new AppError(StatusCodes.BAD_REQUEST, 'You Cannot Join Your Own Trip.')
    }

    const existingParticipant = await prisma.tripParticipant.findFirst({
        where: {
            tripId,
            userId: participantId
        }
    })

    if (existingParticipant) {
        if (existingParticipant.status === 'PENDING') {
            throw new AppError(StatusCodes.CONFLICT, 'Your join request is currently pending host approval.');
        }
        if (existingParticipant.status === 'REJECTED') {
            throw new AppError(StatusCodes.FORBIDDEN, 'Your join request was declined by the trip host. You cannot rejoin.');
        }
        if (existingParticipant.status === 'APPROVED') {
            throw new AppError(StatusCodes.CONFLICT, 'You are already an approved participant of this trip.');
        }
        if (existingParticipant.status === 'REMOVED') {
            throw new AppError(StatusCodes.FORBIDDEN, 'You were removed from this trip by the host.');
        }
        throw new AppError(StatusCodes.CONFLICT, 'You already have a request record for this trip.');
    }

    if(trip?.tripParticipants?.length > trip?.maxMates){
        throw new AppError(StatusCodes.NOT_ACCEPTABLE, 'No More Guest Allowed.')
    }

    const result = await prisma.tripParticipant.create({
        data: {
            tripId,
            userId: participantId
        }
    })

    return result;
};


// Get all approved participation of an user for join room conversation (joined + hosted)
const getAllParticipationsOfAnUser = async (userId: string) => {
    // 1. All trips where user is an approved participant
    const approvedParticipations = await prisma.tripParticipant.findMany({
        where: {
            userId: userId,
            status: 'APPROVED',
            trip: {
                isDeleted: false,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profileImage: true,
                },
            },
            trip: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    // 2. All active trips hosted by this user
    const hostedTrips = await prisma.travelPlan.findMany({
        where: {
            userId: userId,
            isDeleted: false,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profileImage: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const hostedParticipations = hostedTrips.map((trip) => ({
        id: `host-${trip.id}`,
        tripId: trip.id,
        userId: trip.userId,
        status: 'APPROVED',
        isHost: true,
        user: trip.user,
        trip: trip,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
    }));

    const existingTripIds = new Set(approvedParticipations.map((p) => p.tripId));
    const combined = [
        ...hostedParticipations.filter((h) => !existingTripIds.has(h.tripId)),
        ...approvedParticipations.map((p) => ({ ...p, isHost: false })),
    ];

    return combined;
};


// Get all my Participant join request (Incoming to my trips)
const myParticipantRequest = async (userId: string) => {
    const result = await prisma.tripParticipant.findMany({
        where: {
            trip: {
                userId,
                isDeleted: false
            }
        },
        include: {
            trip: true,
            user: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return result;
};

// Get all requests sent by this user to join other trips (Outgoing)
const getMyOutgoingTripRequests = async (userId: string) => {
    const result = await prisma.tripParticipant.findMany({
        where: {
            userId: userId,
        },
        include: {
            trip: {
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            profileImage: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return result;
};


// Get trip participant by id
const getTripParticipantById = async (participantReqId: string) => {

    const result = await prisma.tripParticipant.findUniqueOrThrow({
        where: {
            id: participantReqId
        }
    })

    return result;
};

// Get user participant status
const getUserParticipationForTrip = async (tripId: string, participantId: string) => {

    const userParticipation = await prisma.tripParticipant.findFirst({
        where: {
            tripId,
            userId: participantId
        }
    })

    return userParticipation
};


// Update participant request
const updateParticipantRequest = async (participantReqId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED') => {


    const result = await prisma.tripParticipant.update({
        where: {
            id: participantReqId
        },
        data: {
            status
        }
    })

    return result;
};


// Get participant for specific trip
const getParticipantsForSpecificTrip = async (tripId: string) => {
    const result = await prisma.tripParticipant.findMany({
        where: {
            status: 'APPROVED',
            tripId,
        },
        include: {
            trip: true,
            user: true,
        }
    })

    return result;
};



export const TripParticipantServices = {
    createTripParticipant,
    myParticipantRequest,
    getMyOutgoingTripRequests,
    getTripParticipantById,
    updateParticipantRequest,
    getParticipantsForSpecificTrip,
    getUserParticipationForTrip,
    getAllParticipationsOfAnUser
}