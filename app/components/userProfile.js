"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, updatePassword } from "firebase/auth";
import { FiArrowLeft, FiUser, FiPhone, FiMapPin, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function UserProfile({ onBack, currentUser, userRole }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!currentUser) return;
        
        // OPTIMIZATION: Check all collections in parallel instead of one-by-one
        const collections = ["employees", "supervisors", "teamleaders", "unitheads", "heads"];
        const docRefs = collections.map(col => getDoc(doc(db, col, currentUser.uid)));
        
        const snapshots = await Promise.all(docRefs);
        const foundSnap = snapshots.find(snap => snap.exists());
        
        if (foundSnap) {
            const data = foundSnap.data();
            setName(data.name || "");
            setPhone(data.phone || "");
            setAddress(data.address || "");
        } else {
            setError("User profile not found in any system collection");
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setError("Failed to load profile data");
      }
    };
  
    fetchUserData();
  }, [currentUser]);

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(`/${userRole}/dashboard`);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validation checks remain the same
    const phoneRegex = /^\d{10}$/;
    if (phone && !phoneRegex.test(phone)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
  
    if (address && address.length < 5) {
      setError("Please enter a valid address (minimum 5 characters)");
      return;
    }

    if (password && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
  
    setLoading(true);
    try {
      // Determine which collections the user exists in
      const collections = ["employees", "supervisors", "teamleaders", "unitheads", "heads"];
      const batch = writeBatch(db);

      // OPTIMIZATION: Check in parallel again for updating
      const docRefs = collections.map(col => ({ ref: doc(db, col, currentUser.uid), col }));
      const snapshots = await Promise.all(docRefs.map(item => getDoc(item.ref)));

      let updated = false;
      snapshots.forEach((snap, index) => {
        if (snap.exists()) {
           batch.update(docRefs[index].ref, { 
            name, 
            phone: phone || null, 
            address: address || null 
          });
          updated = true;
        }
      });

      if (!updated) {
          throw new Error("User document not found to update.");
      }

      // Commit all document updates
      await batch.commit();

      // Update password if changed
      if (password) {
        const auth = getAuth();
        const user = auth.currentUser;
        await updatePassword(user, password);
      }
      
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => {
        if (onBack) onBack();
      }, 1500);
    } catch (error) {
      console.error("Update error:", error);
      setError(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={handleBackToDashboard}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors duration-200"
        >
          <FiArrowLeft className="mr-2" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className=" rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
            <div className="flex items-center">
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <FiUser className="h-6 w-6 text-white" />
              </div>
              <h1 className="ml-4 text-2xl font-bold text-white">My Profile</h1>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}
            
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Field */}
                  <div className="space-y-1">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <FiUser className="mr-2 text-blue-500" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                       placeholder="Your Name"
                    />
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-1">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <FiPhone className="mr-2 text-blue-500" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Phone No."
                    />
                  </div>
                </div>

                {/* Address Field */}
                <div className="space-y-1">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FiMapPin className="mr-2 text-blue-500" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Your Address"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  Change Password
                </h3>
                <p className="text-sm text-gray-500">
                  Leave blank to keep current password
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <FiLock className="mr-2 text-blue-500" />
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-blue-600"
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <FiLock className="mr-2 text-blue-500" />
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                        disabled={!password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-blue-600"
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}