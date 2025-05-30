export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/"], // ใส่หน้าที่จะต้อง login ก่อน
};