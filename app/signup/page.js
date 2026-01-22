"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import { doc, setDoc, collection, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import Image from "next/image";
import Head from "next/head";
import header_image from "../assets/vector.jpg";

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    role: "Employee"
  });
  const { signup } = useAuth();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      return setError("Passwords do not match");
    }

    try {
      setError("");
      setMessage("");
      setLoading(true);

      const userCredential = await signup(formData.email, formData.password);
      const user = userCredential.user;

      const roleCollections = {
        Employee: "employees",
        Supervisor: "supervisors",
        TeamLeader: "teamleaders",
        UnitHead: "unitheads",
        Head: "heads"
      };

      const collectionName = roleCollections[formData.role] || "employees";
      const userCollection = collection(db, collectionName);

      const userDocData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        uid: user.uid,
        tasks: [],
        phone: "",
        address: "",
      };

      await setDoc(doc(userCollection, user.uid), userDocData);

      if (formData.role === "Head") {
        await updateAdminDocument(user.uid);
      }

      const roleRoutes = {
        Employee: "/dashboards/Employee",
        Supervisor: "dashboards/Supervisor",
        TeamLeader: "/dashboards/Teamleader",
        UnitHead: "/dashboards/Unithead",
        Head: "/dashboards/Head",
      };

      setMessage("Account created successfully! Redirecting...");
      setTimeout(() => {
        router.push(roleRoutes[formData.role] || "/dashboards/Employeed");
      }, 1500);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  }

  function handleAuthError(error) {
    const errorMessages = {
      "auth/invalid-email": "Invalid email address.",
      "auth/email-already-in-use": "Email address is already in use.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/operation-not-allowed": "Account creation is currently disabled."
    };
    
    setError(errorMessages[error.code] || "Failed to create account. Please try again.");
    console.error("Signup error:", error);
  }

  return (
    <>
    <Head>
    <title>Create Account | Taskify</title>
    <meta name="description" content="Join our platform and get started" />
  </Head>
  
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex flex-col justify-center items-center p-4 sm:p-8">
    {/* Animated Background Elements */}
    <div className="fixed inset-0 overflow-hidden z-0">
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-purple-100 opacity-40 blur-xl animate-float"></div>
      <div className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full bg-blue-100 opacity-30 blur-xl animate-float-delay"></div>
    </div>

    {/* Main Content - Adjusted container width */}
    <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 relative z-10">
      {/* Illustration Section - Better proportions */}
      <div className="w-full lg:w-1/2 flex justify-center items-center">
        <div className="w-full max-w-md">
          <Image 
            src={header_image}  
            alt="Sign up illustration"
            width={700}
            height={700}
            //className="mx-auto"
            priority
            //style={{ minHeight: '400px' }}
          />
        </div>
      </div>

      {/* Signup Form Section - Slightly wider but not oversized */}
      <div className="w-full lg:w-1/2 max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-300 hover:shadow-2xl">
        {/* Rest of your form content remains exactly the same */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">
          Create Account
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Fill in your details to get started
        </p>
  
          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 animate-fade-in">
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}
  
          {message && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6 animate-fade-in">
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{message}</span>
              </div>
            </div>
          )}
  
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
  
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
  
            {/* Two-column layout for medium+ screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjE2Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik03LjQxLDguNTlMMTIsMTMuMTdsNC41OS00LjU4TDE4LDEwbC02LDZsLTYtNkw3LjQxLDguNTlaIi8+PC9zdmc+')] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem]"
                  required
                >
                  <option value="Employee">Employee</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="TeamLeader">Team Leader</option>
                  <option value="UnitHead">Unit Head</option>
                  <option value="Head">Head</option>
                </select>
              </div>
  
              {/* Empty column to balance layout */}
              <div></div>
            </div>
  
            {/* Two-column layout for passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                    minLength="6"
                  />
                </div>
              </div>
  
              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <input
                    type="password"
                    name="passwordConfirm"
                    placeholder="••••••••"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                    minLength="6"
                  />
                </div>
              </div>
            </div>
  
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-medium py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center justify-center ">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                  </svg>
                  Sign Up
                </span>
              )}
            </button>
          </form>
  
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-purple-700 hover:text-purple-800 font-bold hover:underline transition-colors cursor-pointer"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>
  
      {/* Animation styles remain the same */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(10px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delay { animation: float-delay 6s ease-in-out infinite 1s; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  </>
  );
}