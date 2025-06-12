"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/",
    });

    if (res?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-xl">
        <div className="flex justify-center mb-6">
          <Image src="/ccib-logo.png" alt="Logo" width={150} height={150} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Log in</h1>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm mb-2">Email</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <button
          onClick={handleLogin}
          className="bg-blue-700 text-white cursor-pointer px-4 py-2 rounded w-full mb-4 hover:bg-blue-800"
        >
          Log in
        </button>
        <p className="text-center text-sm">
          By continuing, you agree to the{" "}
          <a href="#" className="underline cursor-pointer hover:text-blue-500">
            Terms of use
          </a>{" "}
          and{" "}
          <a href="#" className="underline cursor-pointer hover:text-blue-500">
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
}