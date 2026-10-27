import dotenv from 'dotenv'
dotenv.config()

interface EnvConfig {
    PORT: string,
    NODE_ENV: string,
    DATABASE_URL: string,
    SALT_ROUND: string,
    CLIENT_URL: string,
    JWT: {
        JWT_ACCESS_SECRET: string,
        JWT_ACCESS_EXPIRES: string,
        JWT_REFRESH_SECRET: string
    }
    CLOUDINARY: {
        CLOUDINARY_CLOUD_NAME: string,
        CLOUDINARY_API_KEY: string,
        CLOUDINARY_API_SECRET: string
    },
    STRIPE: {
        STRIPE_SECRET_KEY: string,
        STRIPE_PRICE_MONTHLY: string,
        STRIPE_PRICE_YEARLY: string,
        STRIPE_WEBHOOK_SECRET: string
    }
}

const loadEnvVariables = (): EnvConfig => {
    const isProduction = process.env.NODE_ENV === 'production';
    const requiredEnvVars: string[] = isProduction
        ? ['PORT', 'DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_ACCESS_EXPIRES', 'JWT_REFRESH_SECRET', 'CLIENT_URL']
        : [];

    requiredEnvVars.forEach((key: string) => {
        if (!process.env[key]) {
            throw new Error(`Env Variable ${key} is missing on .env file.`)
        }
    })

    return {
        PORT: process.env.PORT || process.env.port || '5000',
        DATABASE_URL: process.env.DATABASE_URL || '',
        NODE_ENV: process.env.NODE_ENV || 'development',
        SALT_ROUND: process.env.SALT_ROUND || '10',
        CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
        JWT: {
            JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_key_32chars_long!',
            JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '7d',
            JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_key_32chars_long!',
        },
        CLOUDINARY: {
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
        },
        STRIPE: {
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
            STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY || '',
            STRIPE_PRICE_YEARLY: process.env.STRIPE_PRICE_YEARLY || '',
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
        }
    }
}

export const envVars = loadEnvVariables()