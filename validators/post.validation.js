const { z } = require('zod');

const createPostSchema = z.object({
    title: z.string().max(50, 'Title cannot exceed 50 characters').optional().or(z.literal('')),
    description: z.string().min(1, 'Description is required').max(5000, 'Description cannot exceed 5000 characters'),
    link: z.string().url('Invalid URL format').optional().or(z.literal('')),
    aspectRatio: z.enum(['1:1', '4:5', '16:9', 'original']).optional(),
});

const updatePostSchema = z.object({
    id: z.string().min(1, 'Post ID is required'),
    title: z.string().max(50, 'Title cannot exceed 50 characters').optional().or(z.literal('')),
    description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
    link: z.string().url('Invalid URL format').optional().or(z.literal('')),
    aspectRatio: z.enum(['1:1', '4:5', '16:9', 'original']).optional(),
});

module.exports = { createPostSchema, updatePostSchema };
