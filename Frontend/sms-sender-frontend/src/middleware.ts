export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/mainmenu/:path*", "/history", "/all-data/:path*"], // Add more as needed
};