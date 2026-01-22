"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import Image from "next/image";
import Head from "next/head";
import header_image from "../assets/vector.jpg";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const { login, currentUser } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const verifyUserRole = async (uid, selectedRole, userEmail) => {
    const roleCollections = {
      Employee: "employees",
      Supervisor: "supervisors",
      TeamLeader: "teamleaders",
      UnitHead: "unitheads",
      Head: "heads",
    };

    if (selectedRole === "Admin") {
      const adminEmails = ["admin@123.com"];

      if (!adminEmails.includes(userEmail)) {
        throw new Error("admin_email_unauthorized");
      }

      return { role: "Admin", email: userEmail };
    }

    const collectionName = roleCollections[selectedRole];
    if (!collectionName) {
      throw new Error("Invalid role selected");
    }

    const userDocRef = doc(db, collectionName, uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error(`role_not_found`);
    }

    const userData = userDoc.data();

    if (userData.role !== selectedRole) {
      throw new Error(`role_mismatch`);
    }

    return userData;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);

      if (!email || !role || !password) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
      }

      const userCredential = await login(email, password);
      const user = userCredential.user;

      await verifyUserRole(user.uid, role, user.email);

      const roleRoutes = {
        Employee: "/dashboards/Employee",
        Admin: "/dashboards/Admin",
        Supervisor: "/dashboards/Supervisor",
        TeamLeader: "/dashboards/Teamleader",
        UnitHead: "/dashboards/Unithead",
        Head: "/dashboards/Head",
      };

      router.push(roleRoutes[role]);
    } catch (error) {
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password.");
      } else if (error.message === "role_not_found") {
        setError(
          "Account not found for the selected role. Please check your role selection."
        );
      } else if (error.message === "role_mismatch") {
        setError("Role mismatch. Please contact administrator.");
      } else if (error.message === "admin_email_unauthorized") {
        setError(
          "Unauthorized admin access. Please use a registered admin email."
        );
      } else {
        setError("Login failed. Please try again.");
      }
    }

    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>Login</title>
        <meta name="description" content="Login to your account" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8">

          <div className="w-full lg:w-1/2 max-w-md lg:max-w-none mb-8 lg:mb-0">
            <Image
              src={header_image}
              alt="Vector illustration"
              width={500}
              height={500}
              className="opacity-90 mx-auto"
              priority
            />
          </div>

          <div className="w-full lg:w-1/2 max-w-md bg-white bg-opacity-80 backdrop-blur-lg rounded-xl shadow-lg border border-white border-opacity-30 p-6">
            <h1 className="text-3xl font-bold text-black text-center mb-6 tracking-wide">
              Welcome Back
            </h1>

            {error && (
              <div className="text-red-600 text-center mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Select */}
              <div className="w-full">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 text-sm sm:text-base rounded-lg border border-gray-200 bg-white bg-opacity-60 focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                  required
                >
                  <option value="">Select a role</option>
                  <option value="Admin">Admin</option>
                  <option value="Employee">Employee</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="TeamLeader">Team Leader</option>
                  <option value="UnitHead">Unit Head</option>
                  <option value="Head">Head</option>
                </select>
              </div>

              {/* Email Input */}
              <div className="w-full">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="w-full">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-700 to-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
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
                    Processing...
                  </span>
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <Link
                href="/ForgotPassword"
                className="text-purple-700 font-semibold text-sm hover:underline cursor-pointer"
              >
                Forgot Password?
              </Link>

              <div className="text-sm">
                <span className="text-black">Don't have an account? </span>
                <a
                  onClick={() => router.push("/signup")}
                  className="text-purple-700 font-semibold hover:underline cursor-pointer"
                >
                  Sign Up
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
