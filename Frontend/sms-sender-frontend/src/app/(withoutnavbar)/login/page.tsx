"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Redirect to main menu if user is already logged in
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/mainmenu");
    }
  }, [status, session, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-xl">
          <div className="flex justify-center mb-6">
            <Image src="/ccib-logo.png" alt="Logo" width={150} height={150} />
          </div>
          <div className="text-center">
            <svg 
              className="animate-spin mx-auto h-8 w-8 text-blue-600 mb-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-600">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render login form if user is authenticated (prevents flash)
  if (status === "authenticated") {
    return null;
  }

  const handleLogin = async () => {
    // Clear previous errors and set loading state
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: true,
        email,
        password,
        callbackUrl: "/mainmenu",
      });

      if (res?.error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleLogin();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-xl">
        <div className="flex justify-center mb-6">
          <Image src="/ccib-logo.png" alt="Logo" width={150} height={150} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Log in</h1>
        {error && (
          <div className="text-red-500 text-center mb-4 p-2 bg-red-50 rounded border border-red-200">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm mb-2">Email</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            spellCheck={false}
            disabled={isLoading}
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`
            text-white cursor-pointer px-4 py-2 rounded w-full mb-4 
            transition duration-200 flex items-center justify-center
            ${isLoading 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 transform active:scale-95'
            }
          `}
        >
          {isLoading ? (
            <>
              <svg 
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                ></circle>
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              กำลังเข้าสู่ระบบ...
            </>
          ) : (
            'Log in'
          )}
        </button>
        <div className="text-center text-sm">
          By continuing, you agree to the{" "}
          <a href="/term" className="underline cursor-pointer hover:text-blue-500 transition duration-200">
            Terms of use
          </a>{" "}
          and{" "}
          <a href="/policy" className="underline cursor-pointer hover:text-blue-500 transition duration-200">
            Privacy Policy
          </a>.
        </div>
      </div>
    </div>
  );
}