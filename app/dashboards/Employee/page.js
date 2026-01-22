"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../AuthContext";
import { useRouter } from "next/navigation";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  getDoc,
  onSnapshot,
  runTransaction,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import TaskRow from "../../components/TaskRow";
import {
  FiUser,
  FiLogOut,
  FiSearch,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiList,
  FiChevronDown,
  FiChevronUp,
  FiMenu,
  FiX,
} from "react-icons/fi";
import Image from "next/image";
import logo from "../../assets/Navbar_logo.png";
import { motion, AnimatePresence } from "framer-motion";
import UserProfile from "../../components/userProfile";

export default function EmployeeDashboard() {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [numTasksCompleted, setNumTasksCompleted] = useState(0);
  const [numTasksPending, setNumTasksPending] = useState(0);
  const [numTasksAssigned, setNumTasksAssigned] = useState(0);
  const [inProgressTasks, setInProgressTasks] = useState(0);
  const [userData, setUserData] = useState({});
  const [selectedTaskType, setSelectedTaskType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [bossName, setBossName] = useState("");
  const [isBossLoading, setIsBossLoading] = useState(true);
  const [userRole, setUserRole] = useState("Employee");
  
  const [allHeadsData, setAllHeadsData] = useState([]);
  
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const checkAndResetTasks = useCallback(async (currentTasks) => {
    if (!currentUser) return;
    
    const now = new Date();
    const ISTOffset = 330;
    const ISTTime = new Date(now.getTime() + ISTOffset * 60 * 1000);
    const today = ISTTime.toISOString().split("T")[0];
    
    // Start of week
    const startOfWeek = new Date(ISTTime);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    // Start of month
    const startOfMonth = new Date(ISTTime.getFullYear(), ISTTime.getMonth(), 1);

    let needsUpdate = false;
    
    const updatedTasks = currentTasks.map((task) => {
        let shouldReset = false;
        let newLastReset = "";

        if (task.taskType === "daily" && task.lastReset !== today) {
            shouldReset = true;
            newLastReset = today;
        } else if (task.taskType === "weekly" && (!task.lastReset || new Date(task.lastReset) < startOfWeek)) {
            shouldReset = true;
            newLastReset = ISTTime.toISOString().split("T")[0];
        } else if (task.taskType === "monthly" && (!task.lastReset || new Date(task.lastReset) < startOfMonth)) {
            shouldReset = true;
            newLastReset = ISTTime.toISOString().split("T")[0];
        }

        if (shouldReset) {
            needsUpdate = true;
            const updatedTask = {
                ...task,
                status: "pending",
                lastReset: newLastReset,
                workInProgressNotes: [],
                endDate: (task.endDate && new Date(task.endDate) < (task.taskType === 'daily' ? new Date(today) : (task.taskType === 'weekly' ? startOfWeek : startOfMonth))) ? null : task.endDate,
            };
            delete updatedTask.statusChangedBy;
            delete updatedTask.statusChangedDate;
            return updatedTask;
        }
        return task;
    });

    if (needsUpdate) {
        try {
            const employeeDocRef = doc(db, "employees", currentUser.uid);
            await updateDoc(employeeDocRef, { tasks: updatedTasks });
            console.log("Tasks reset successfully via consolidated check.");
        } catch (err) {
            console.error("Error resetting tasks:", err);
        }
    }
  }, [currentUser]);

  // OPTIMIZATION: Fetch Heads Data Once
  useEffect(() => {
    const fetchHeads = async () => {
        try {
            const headsRef = collection(db, "heads");
            const snapshot = await getDocs(headsRef);
            const heads = snapshot.docs.map(doc => doc.data());
            setAllHeadsData(heads);
        } catch (err) {
            console.error("Error fetching heads", err);
        }
    };
    fetchHeads();
  }, []);

  const sortTasksByPriority = (taskA, taskB) => {
    if (taskA.status === "completed" && taskB.status !== "completed") return 1;
    if (taskA.status !== "completed" && taskB.status === "completed") return -1;

    if (taskA.status === "completed" && taskB.status === "completed") {
      return (
        new Date(taskB.completedDate || taskB.endDate) -
        new Date(taskA.completedDate || taskA.endDate)
      );
    }

    const statusOrder = { pending: 1, "work in progress": 2 };
    const statusComparison =
      (statusOrder[taskA.status.toLowerCase()] || 3) - (statusOrder[taskB.status.toLowerCase()] || 3);
    if (statusComparison !== 0) return statusComparison;

    const priorityOrder = { high: 1, medium: 2, low: 3 };
    const priorityComparison =
      (priorityOrder[taskA.priority] || 3) - (priorityOrder[taskB.priority] || 3);
    if (priorityComparison !== 0) return priorityComparison;

    const dateComparison =
      new Date(taskA.dueDate || taskA.endDate) -
      new Date(taskB.dueDate || taskB.endDate);
    if (dateComparison !== 0) return dateComparison;

    const taskTypeOrder = { daily: 1, weekly: 2, monthly: 3 };
    return (taskTypeOrder[taskA.taskType] || 4) - (taskTypeOrder[taskB.taskType] || 4);
  };

  const handleLogout = async () => {
    setError("");
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      setError("Failed to log out");
      console.error("Logout error", err);
    }
  };

  const fetchUserData = async () => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, "employees", currentUser.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (userDocSnapshot.exists()) {
        const userDocData = userDocSnapshot.data();
        setUserData(userDocData);
      }
    } catch (err) {
      setError("Failed to fetch user data");
      console.error("Fetch user data error", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchTasks = () => {
    if (!currentUser) return;

    const employeeDocRef = doc(db, "employees", currentUser.uid);
    try {
      const unsubscribe = onSnapshot(
        employeeDocRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const employeeData = docSnapshot.data();
            const currentTasks = employeeData.tasks || [];
            
            setTasks(currentTasks);
            
            // Run reset logic whenever data loads to ensure we are up to date
            checkAndResetTasks(currentTasks);

            setNumTasksCompleted(
              currentTasks.filter(
                (task) => task.status.toLowerCase() === "completed"
              ).length
            );
            setNumTasksPending(
              currentTasks.filter(
                (task) => task.status.toLowerCase() === "pending"
              ).length
            );
            setInProgressTasks(
              currentTasks.filter(
                (task) =>
                  task.status.trim().toLowerCase() === "work in progress"
              ).length
            );
            setNumTasksAssigned(currentTasks.length);
            setIsLoading(false); 
          } else {
            setError("No tasks found.");
            setIsLoading(false);
          }
        },
        (error) => {
          setError("Failed to fetch tasks: " + error.message);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError("An unexpected error occurred while fetching tasks.");
      setTimeout(() => setError(""), 3000);
      setIsLoading(false);
    }
  };

  useEffect(fetchTasks, [currentUser, checkAndResetTasks]);

  const handleChangeStatus = async (taskId, newStatus, fullTaskObject) => {
    const collectionsToUpdate = [
      "employees", 
      "supervisors", 
      "teamleaders", 
      "unitheads", 
      "heads"
    ];

  try {
    // We already have the updated object from TaskRow via fullTaskObject if passed
    // But we need to update status meta-data locally first before sending
    
    // Note: fullTaskObject comes from TaskRow including any note updates
    
    await runTransaction(db, async (transaction) => {
      for (const collectionName of collectionsToUpdate) {
        const querySnapshot = await getDocs(collection(db, collectionName));

        for (const docSnapshot of querySnapshot.docs) {
          const docData = docSnapshot.data();

          if (docData.tasks && Array.isArray(docData.tasks)) {
            const taskIndex = docData.tasks.findIndex(
              (task) => task.taskId === taskId
            );
            
            if (taskIndex !== -1) {
              const taskToUpdate = docData.tasks[taskIndex];
              
              // If we received a full object from TaskRow (e.g. notes updated), use it. 
              // Otherwise construct update based on current doc.
              const baseTask = fullTaskObject || taskToUpdate;

              const updatedTask = {
                ...baseTask,
                status: newStatus,
                statusChangedBy: currentUser?.displayName || currentUser?.email || "Unknown",
                statusChangedDate: new Date().toISOString(),
              };

              // Handle completion specific fields
              if (newStatus.toLowerCase() === "completed") {
                updatedTask.completedBy = currentUser?.displayName || currentUser?.email || "Unknown";
                updatedTask.completedDate = new Date().toISOString();
              } else if (taskToUpdate.status.toLowerCase() === "completed") {
                // If moving from completed to another status, clear completion fields
                updatedTask.completedBy = null;
                updatedTask.completedDate = null;
              }

              transaction.update(doc(db, collectionName, docSnapshot.id), {
                tasks: [
                  ...docData.tasks.slice(0, taskIndex),
                  updatedTask,
                  ...docData.tasks.slice(taskIndex + 1),
                ],
              });
            }
          }
        }
      }
    });

    setSuccessMessage(`Task status updated to ${newStatus}`);
    setTimeout(() => setSuccessMessage(""), 3000);
    
  } catch (err) {
    console.error("Error updating task status:", err);
    setError("Failed to update task status. Please try again.");
    setTimeout(() => setError(""), 5000);
  }
};

  const filterTasksByType = (type) => {
    setSelectedTaskType(type);
  };

  // OPTIMIZATION: Use Memo and Debounced search for filtering
  useEffect(() => {
    let filtered = tasks;

    if (selectedTaskType !== "all") {
      filtered = tasks.filter((task) => task.taskType === selectedTaskType);
    }

    if (debouncedSearch) {
      filtered = filtered.filter(
        (task) =>
          task.project &&
          task.project.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  }, [debouncedSearch, tasks, selectedTaskType]);

  useEffect(() => {
    const fetchSupervisorInfo = async () => {
      if (!currentUser?.uid) return;

      setIsBossLoading(true);
      setBossName(null);

      try {
        const supervisorsRef = collection(db, "supervisors");
        const q = query(
          supervisorsRef,
          where("assigned", "array-contains", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const supervisorDoc = querySnapshot.docs[0];
          setBossName(supervisorDoc.data().name);
        } else {
          setBossName(null);
        }
      } catch (error) {
        console.error("Error fetching supervisor info:", error);
        setBossName(null);
      } finally {
        setIsBossLoading(false);
      }
    };

    fetchSupervisorInfo();
  }, [currentUser?.uid]);

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(1px)",
          }}
        >
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      )}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Image
                  className="h-20 w-auto transition-transform duration-300"
                  src={logo}
                  alt="Company Logo"
                  priority
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setShowProfile(true)}
                className="cursor-pointer group flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="p-1.5 mr-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                    <FiUser className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <span className="text-gray-700 group-hover:text-blue-600">
                    My Profile
                  </span>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="cursor-pointer group flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="p-1.5 mr-2 rounded-lg bg-gray-100 group-hover:bg-red-100 transition-colors">
                    <FiLogOut className="h-4 w-4 text-gray-600 group-hover:text-red-600" />
                  </div>
                  <span className="text-gray-700 group-hover:text-red-600">
                    Logout
                  </span>
                </div>
              </button>
            </div>

            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="md:hidden absolute top-20 right-0 w-56 bg-white shadow-lg rounded-md z-50 border border-gray-200"
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="cursor-pointer group flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <FiUser className="mr-3 text-gray-500 group-hover:text-blue-600" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="cursor-pointer group flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <FiLogOut className="mr-3 text-gray-500 group-hover:text-red-600" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="cursor-pointer inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none transition-colors duration-200"
                aria-expanded={isMobileMenuOpen}
                aria-label="Main menu"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <FiX className="block h-6 w-6 transform transition-transform duration-200" />
                ) : (
                  <FiMenu className="block h-6 w-6 transform transition-transform duration-200" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto"
            >
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 transition-opacity"
                  aria-hidden="true"
                >
                  <div
                    className="fixed inset-0 flex items-center justify-center p-4 z-50"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      backdropFilter: "blur(1px)",
                    }}
                    onClick={() => setShowProfile(false)}
                  ></div>
                </motion.div>

                {/* Modal container */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <UserProfile
                    onBack={() => setShowProfile(false)}
                    currentUser={currentUser}
                    userRole="employee" 
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Task Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Welcome back,{" "}
            <span className="font-semibold text-blue-600">
              {userData.name || currentUser?.email}
            </span>
          </p>
          {isBossLoading ? (
            <div className="text-sm text-gray-400 mt-1">
              Loading supervisor info...
            </div>
          ) : bossName ? (
            <div className="text-sm text-gray-500 mt-1">
              Reporting to:{" "}
              <span className="font-medium text-gray-700">{bossName}</span>
              <span className="text-xs text-gray-400 ml-2">(Supervisor)</span>
            </div>
          ) : (
            <div className="text-sm text-gray-400 mt-1">
              No Supervisor assigned
            </div>
          )}
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-sm">
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        )}
        {/* Statistics Cards - Premium Style */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform hover:scale-[1.02] transition-transform duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Assigned Tasks
                  </p>
                  <p className="text-3xl font-bold mt-1 text-gray-800">
                    {numTasksAssigned}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Total tasks assigned to you
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FiList className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${
                      (numTasksAssigned / Math.max(numTasksAssigned, 1)) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform hover:scale-[1.02] transition-transform duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Pending Tasks
                  </p>
                  <p className="text-3xl font-bold mt-1 text-gray-800">
                    {numTasksPending}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tasks waiting to start
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <FiClock className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${
                      (numTasksPending / Math.max(numTasksAssigned, 1)) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform hover:scale-[1.02] transition-transform duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    In Progress
                  </p>
                  <p className="text-3xl font-bold mt-1 text-gray-800">
                    {inProgressTasks}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tasks you're working on
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <FiLoader className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${
                      (inProgressTasks / Math.max(numTasksAssigned, 1)) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform hover:scale-[1.02] transition-transform duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Completed Tasks
                  </p>
                  <p className="text-3xl font-bold mt-1 text-gray-800">
                    {numTasksCompleted}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tasks you've finished
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${
                      (numTasksCompleted / Math.max(numTasksAssigned, 1)) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        {/* Task Filter Section */}
        <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="px-6 py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Filter Tasks
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  View tasks by type and priority
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => filterTasksByType("all")}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                    selectedTaskType === "all"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Tasks
                  {selectedTaskType === "all" && (
                    <FiChevronUp className="ml-1" />
                  )}
                </button>
                <button
                  onClick={() => filterTasksByType("daily")}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                    selectedTaskType === "daily"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Daily
                  {selectedTaskType === "daily" && (
                    <FiChevronUp className="ml-1" />
                  )}
                </button>
                <button
                  onClick={() => filterTasksByType("weekly")}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                    selectedTaskType === "weekly"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Weekly
                  {selectedTaskType === "weekly" && (
                    <FiChevronUp className="ml-1" />
                  )}
                </button>
                <button
                  onClick={() => filterTasksByType("monthly")}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                    selectedTaskType === "monthly"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Monthly
                  {selectedTaskType === "monthly" && (
                    <FiChevronUp className="ml-1" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Task List Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  My Task List
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {filteredTasks.length}{" "}
                  {selectedTaskType === "all"
                    ? "tasks"
                    : selectedTaskType + " tasks"}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:text-sm text-gray-700"
                  placeholder="Search by project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-24 w-24 text-gray-400">
                  <FiList className="w-full h-full" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {searchQuery
                    ? "No matching tasks found"
                    : selectedTaskType === "daily"
                    ? "No daily tasks assigned"
                    : selectedTaskType === "weekly"
                    ? "No weekly tasks assigned"
                    : selectedTaskType === "monthly"
                    ? "No monthly tasks assigned"
                    : "No tasks assigned yet"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery
                    ? "Try a different search term"
                    : "You'll see tasks here when they're assigned to you"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTasks
                  .slice()
                  .sort(sortTasksByPriority)
                  .map((task) => (
                    <TaskRow
                      key={task.taskId}
                      task={task}
                      onChangeStatus={handleChangeStatus}
                      userRole={userRole}
                      currentUser={currentUser}
                      allHeadsData={allHeadsData}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}