// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      _id: string;
      name: string;
      email: string;
      role: string;
      token: string;
    };
  }

  interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    token: string;
  }

  interface JWT {
    _id: string;
    name: string;
    email: string;
    role: string;
    token: string;
  }
}
