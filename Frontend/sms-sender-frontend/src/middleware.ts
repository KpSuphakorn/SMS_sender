export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/history"], // ใส่หน้าที่จะต้อง login ก่อน
};