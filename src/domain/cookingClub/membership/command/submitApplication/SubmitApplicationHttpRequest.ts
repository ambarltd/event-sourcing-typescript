import { z } from 'zod';

export const submitApplicationHttpRequestSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    favoriteCuisine: z.string().min(1, "Favorite cuisine is required").max(100),
    yearsOfProfessionalExperience: z.number()
        .min(0, "Years of experience cannot be negative")
        .max(100, "Please enter a valid number of years"),
    numberOfCookingBooksRead: z.number()
        .int("Must be a whole number")
        .min(0, "Number of books cannot be negative")
});

export type SubmitApplicationHttpRequest = z.infer<typeof submitApplicationHttpRequestSchema>;