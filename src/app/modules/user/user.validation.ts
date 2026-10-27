import z from 'zod'

export const UserRoleEnum = z.enum(["USER", "ADMIN", 'SUPER_ADMIN']);
export const SubscriptionStatusEnum = z.enum(["NONE", "MONTHLY", "YEARLY"]);
export const UserStatusEnum = z.enum(["ACTIVE", "BLOCKED", "DELETED"]);
export const Gender = z.enum(["MALE", "FEMALE", "OTHERS"]);

// user creation input zod schema
export const createUserSchema = z.object({
    firstName: z
        .string()
        .min(1, "First Name is required"),

    lastName: z
        .string()
        .min(1, "Last Name is required"),

    email: z
        .string()
        .email("Invalid email format"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters"),

    birthDate: z.string().optional(),
});



// update user zod schema
export const updateUserZodSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    bio: z.string().optional(),
    birthDate: z.string().optional(),
    currentLocation: z.string().optional(),
    interests: z.string().optional(),
    visitedCountries: z.string().optional(),
});


export const UserValidation = {
    createUserSchema,
    updateUserZodSchema
}
