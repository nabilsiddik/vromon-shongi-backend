import type { NextFunction, Request, Response } from "express"
import { StatusCodes } from "http-status-codes"
import { PrismaClientInitializationError, PrismaClientKnownRequestError, PrismaClientUnknownRequestError, PrismaClientValidationError } from "@prisma/client/runtime/client";
import { envVars } from "../config/env.config.js";

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if(envVars.NODE_ENV === 'development'){
        console.log(err)
    }
    let statusCode: number = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
    let success = false
    let message = err.message || 'Something went wrong'
    let error = err

    // Handle Database Connection Errors
    if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED') || err?.message?.includes("Can't reach database server")) {
        message = 'Database connection failed. Please ensure PostgreSQL database is running and accessible.';
        statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    }

    // Handle Prisma Client Known Request Error
    else if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            message = `Duplicate key error`
            error = err.meta
            statusCode = StatusCodes.CONFLICT
        }

        if(err.code === 'P2025'){
            message = 'Record not found'
            error = err.meta
            statusCode = StatusCodes.NOT_FOUND
        }

        if (err.code === 'P1000') {
            message = 'Authentication failed against database server'
            error = err.meta
            statusCode = StatusCodes.UNAUTHORIZED
        }

        if (err.code === 'P2003') {
            message = 'Foreign key constraint failed on the field'
            error = err.meta
            statusCode = StatusCodes.BAD_REQUEST
        }
    }

    // Handle prisma client unknown request error
    else if (err instanceof PrismaClientUnknownRequestError) {
        message = 'Unknown prisma error occured',
        error = err.message
        statusCode = StatusCodes.BAD_REQUEST
    }

    else if (err instanceof PrismaClientInitializationError) {
        message = 'Prisma client failed to initialized',
        error = err.message
        statusCode = StatusCodes.BAD_REQUEST
    }

    // Handle prisma client validation error
    else if (err instanceof PrismaClientValidationError) {
        message = 'Prisma Validation Error',
        error = err.message
        statusCode = StatusCodes.BAD_REQUEST
    }

    // Handle zod validation error
    else if (err.name === 'ZodError') {
        message = 'Zod Validation Error',
        error = error,
        statusCode = StatusCodes.BAD_REQUEST
    }

    res.status(statusCode).json({
        success,
        message,
        error,
    })
}

export default globalErrorHandler