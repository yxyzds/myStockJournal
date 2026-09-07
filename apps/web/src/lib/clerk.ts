export const isClerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export type Me = {
  id: string;
  email: string;
  name: string;
  username: string;
};
