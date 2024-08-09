import { userSchemaZod } from '../schemas/userSchema.js';

export const validateUserData = (data) => {
  return userSchemaZod.safeParse(data);
};
