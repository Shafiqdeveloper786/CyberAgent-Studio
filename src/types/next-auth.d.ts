import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      /** MongoDB _id as a string */
      id:           string;
      name?:        string | null;
      email?:       string | null;
      image?:       string | null;
      role:         string;
      subscription: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?:       string;
    role?:         string;
    subscription?: string;
  }
}
