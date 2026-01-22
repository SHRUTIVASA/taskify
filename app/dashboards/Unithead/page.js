"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  getDoc,
  writeBatch,
  onSnapshot,
  runTransaction,
  query,
  where,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import TaskRow from "../../components/TaskRow";
import { motion, AnimatePresence } from "framer-motion";
import EmployeeList from "../../components/EmployeeList";
import SupervisorList from "../../components/SupervisorList";
import TeamLeaderList from "../../components/TeamLeaderList";
import UserProfile from "../../components/userProfile";
import {
  FiMenu,
  FiX,
  FiUser,
  FiArrowLeft,
  FiLogOut,
  FiPlusCircle,
  FiList,
  FiClock,
  FiLoader,
  FiCheckCircle,
  FiChevronUp,
  FiSearch,
} from "react-icons/fi";
import logo from "../../assets/Navbar_logo.png";
import Image from "next/image";

export default function UnitHeadDashboard() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  
  // Data States
  const [userData, setUserData] = useState({});
  const [tasks, setTasks] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allHeadsData, setAllHeadsData] = useState([]); // N+1 Fix

  // UI & Selection States
  const [selectedTeamLeaderUIDs, setSelectedTeamLeaderUIDs] = useState([]);
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  
  const [showTeamLeaderList, setShowTeamLeaderList] = useState(true); // Default view
  const [showSupervisorList, setShowSupervisorList] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState("all");
  
  // Loading & Role
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [bossName, setBossName] = useState("");
  const [isBossLoading, setIsBossLoading] = useState(true);
  const userRole = "UnitHead";

  const [taskFormData, setTaskFormData] = useState({
    project: "",
    task: "",
    subtask: "",
    endDate: "",
    priority: "",
    taskType: "",
  });

  // --- 1. Debounce Search ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- 2. Initial Data Fetching ---
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Fetch Head (Boss)
    const fetchHeadInfo = async () => {
      setIsBossLoading(true);
      setBossName(null);
      try {
        const headsRef = collection(db, "heads");
        const q = query(headsRef, where("assigned", "array-contains", currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) setBossName(querySnapshot.docs[0].data().name);
      } catch (error) { console.error(error); } 
      finally { setIsBossLoading(false); }
    };

    // Fetch User Data
    const fetchUserData = async () => {
        try {
            const docSnap = await getDoc(doc(db, "unitheads", currentUser.uid));
            if (docSnap.exists()) setUserData(docSnap.data());
        } catch (e) { console.error(e); }
    };

    // Fetch Heads (Once for TaskRow)
    const fetchHeads = async () => {
        try {
            const snapshot = await getDocs(collection(db, "heads"));
            setAllHeadsData(snapshot.docs.map(d => d.data()));
        } catch (e) { console.error(e); }
    };

    fetchHeadInfo();
    fetchUserData();
    fetchHeads();
  }, [currentUser]);

  // --- 3. Consolidated Task Reset Logic ---
  const checkAndResetTasks = useCallback(async (currentTasks) => {
    if (!currentUser || !currentTasks) return;

    const now = new Date();
    const ISTOffset = 330;
    const ISTTime = new Date(now.getTime() + ISTOffset * 60 * 1000);
    const today = ISTTime.toISOString().split("T")[0];
    
    const startOfWeek = new Date(ISTTime);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const startOfMonth = new Date(ISTTime.getFullYear(), ISTTime.getMonth(), 1);

    let needsUpdate = false;

    const updatedTasks = currentTasks.map(task => {
        let shouldReset = false;
        let newResetDate = "";
        let referenceDateForRemoval = null;

        if (task.taskType === "daily" && task.lastReset !== today) {
            shouldReset = true;
            newResetDate = today;
            referenceDateForRemoval = new Date(today);
        } else if (task.taskType === "weekly" && (!task.lastReset || new Date(task.lastReset) < startOfWeek)) {
            shouldReset = true;
            newResetDate = ISTTime.toISOString().split("T")[0];
            referenceDateForRemoval = startOfWeek;
        } else if (task.taskType === "monthly" && (!task.lastReset || new Date(task.lastReset) < startOfMonth)) {
            shouldReset = true;
            newResetDate = ISTTime.toISOString().split("T")[0];
            referenceDateForRemoval = startOfMonth;
        }

        if (shouldReset) {
            needsUpdate = true;
            const { statusChangedBy, statusChangedDate, completedBy, completedDate, ...rest } = task;
            
            // Remove due date if it's in the past relative to reset cycle
            const shouldRemoveDueDate = task.endDate && new Date(task.endDate) < referenceDateForRemoval;

            return {
                ...rest,
                status: "pending",
                lastReset: newResetDate,
                workInProgressNotes: [],
                endDate: shouldRemoveDueDate ? null : task.endDate
            };
        }
        return task;
    });

    if (needsUpdate) {
        try {
            await updateDoc(doc(db, "unitheads", currentUser.uid), { tasks: updatedTasks });
            console.log("Tasks reset successfully");
        } catch (e) { console.error(e); }
    }
  }, [currentUser]);

  // --- 4. Fetch Tasks & Listeners ---
  useEffect(() => {
    if (!currentUser) return;

    // Listen to Unit Head's tasks
    const unsub = onSnapshot(doc(db, "unitheads", currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const currentTasks = data.tasks || [];
            setTasks(currentTasks);
            checkAndResetTasks(currentTasks);

            // Fetch Assigned Team Leaders
            if (data.assigned && data.assigned.length > 0) {
                fetchTeamLeaders(data.assigned);
            } else {
                setTeamLeaders([]);
            }
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    });
    return () => unsub();
  }, [currentUser, checkAndResetTasks]);

  const fetchTeamLeaders = async (teamLeaderUIDs) => {
    try {
        const teamLeadersCollection = collection(db, "teamleaders");
        // Using getDocs for simplicity (small collection usually), can optimize with 'where in'
        const snapshot = await getDocs(teamLeadersCollection);
        const tlData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(tl => teamLeaderUIDs.includes(tl.uid));
        
        setTeamLeaders(tlData);
    } catch (e) {
        console.error("Error fetching team leaders", e);
    }
  };

  // --- 5. Derived Data (Memoized) ---
  const { projectNames, taskNames, subtaskNames } = useMemo(() => {
      const allTasks = [
          ...tasks,
          ...teamLeaders.flatMap(tl => tl.tasks || [])
      ];

      return {
          projectNames: [...new Set(allTasks.map(t => t.project).filter(Boolean))],
          taskNames: [...new Set(allTasks.map(t => t.task).filter(Boolean))],
          subtaskNames: [...new Set(allTasks.map(t => t.subtask).filter(Boolean))]
      };
  }, [tasks, teamLeaders]);

  const filteredTasks = useMemo(() => {
      let result = tasks;
      if (selectedTaskType !== "all") {
          result = result.filter(t => t.taskType === selectedTaskType);
      }
      if (debouncedSearch) {
          result = result.filter(t => t.project?.toLowerCase().includes(debouncedSearch.toLowerCase()));
      }
      return result;
  }, [tasks, selectedTaskType, debouncedSearch]);

  const stats = useMemo(() => {
      return {
          completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
          pending: tasks.filter(t => t.status.toLowerCase() === 'pending').length,
          wip: tasks.filter(t => t.status.toLowerCase().includes('work in progress')).length,
          total: tasks.length
      };
  }, [tasks]);

  // --- Actions ---
  const handleTeamLeaderClick = async (teamLeaderId) => {
      setIsLoading(true);
      setSelectedTeamLeaderId(teamLeaderId);
      
      try {
          const tl = teamLeaders.find(t => t.uid === teamLeaderId);
          if (tl && tl.assigned) {
              const supervisorPromises = tl.assigned.map(uid => getDoc(doc(db, "supervisors", uid)));
              const snaps = await Promise.all(supervisorPromises);
              const supData = snaps.filter(s => s.exists()).map(s => s.data());
              setSupervisors(supData);
              setShowSupervisorList(true);
              setShowTeamLeaderList(false);
          } else {
              setSupervisors([]);
              setShowSupervisorList(true);
              setShowTeamLeaderList(false);
          }
      } catch (e) { setError("Failed to fetch supervisors"); }
      finally { setIsLoading(false); }
  };

  const handleSupervisorClick = async (supervisorId) => {
      setIsLoading(true);
      setSelectedSupervisorId(supervisorId);

      try {
          const sup = supervisors.find(s => s.uid === supervisorId);
          if (sup && sup.assigned) {
              const empPromises = sup.assigned.map(uid => getDoc(doc(db, "employees", uid)));
              const snaps = await Promise.all(empPromises);
              const empData = snaps.filter(s => s.exists()).map(s => s.data());
              setEmployees(empData);
              setShowEmployeeList(true);
              setShowSupervisorList(false);
          } else {
              setEmployees([]);
              setShowEmployeeList(true);
              setShowSupervisorList(false);
          }
      } catch (e) { setError("Failed to fetch employees"); }
      finally { setIsLoading(false); }
  };

  const sortTasksByPriority = (taskA, taskB) => {
    if (taskA.status === "completed" && taskB.status !== "completed") return 1;
    if (taskA.status !== "completed" && taskB.status === "completed") return -1;
    const pOrder = { high: 1, medium: 2, low: 3 };
    const pDiff = (pOrder[taskA.priority] || 3) - (pOrder[taskB.priority] || 3);
    if (pDiff !== 0) return pDiff;
    return new Date(taskA.endDate) - new Date(taskB.endDate);
  };

  const handleLogout = async () => {
    try { await logout(); router.push("/login"); } 
    catch (e) { setError("Logout failed"); }
  };

    const showError = (message) => {
  setError(message);
  setTimeout(() => {
    setError("");
  }, 3000);
};

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (isAssigning) return;

    const { project, task, subtask, endDate, priority, taskType } = taskFormData;
    if (!project || !task || !subtask || !endDate || !priority || !taskType) {
        showError("All fields are compulsory.");
        return;
    }
    if (selectedTeamLeaderUIDs.length === 0) {
        showError("Select at least one team leader.");
        return;
    }

    const selectedDate = new Date(endDate);
    selectedDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (selectedDate < today) {
        setError("Due date cannot be in the past.");
        return;
    }

    setIsAssigning(true);

    try {
        const taskId = uuidv4();
        const newTask = {
            taskId, project, task, subtask, endDate, priority, taskType,
            status: "pending",
            lastReset: new Date().toISOString().split("T")[0]
        };

        const batch = writeBatch(db);
        const updates = await Promise.all(selectedTeamLeaderUIDs.map(async (uid) => {
             const ref = doc(db, "teamleaders", uid);
             const snap = await getDoc(ref);
             if (!snap.exists()) return null;

             const existingTasks = snap.data().tasks || [];
             if (existingTasks.some(t => t.project === project && t.task === task && t.subtask === subtask)) {
                 return null; 
             }
             return { ref, tasks: [...existingTasks, newTask] };
        }));

        const validUpdates = updates.filter(Boolean);
        if (validUpdates.length === 0) {
            setError("Task already assigned or invalid team leader.");
            setIsAssigning(false);
            return;
        }

        validUpdates.forEach(u => batch.update(u.ref, { tasks: u.tasks }));
        await batch.commit();

        // --- OPTIMISTIC UPDATE ---
        setTeamLeaders(prev => prev.map(tl => {
            if (selectedTeamLeaderUIDs.includes(tl.uid)) {
                return { ...tl, tasks: [...(tl.tasks || []), newTask] };
            }
            return tl;
        }));

        setSuccessMessage("Task assigned successfully");
        setTaskFormData({ project: "", task: "", subtask: "", endDate: "", priority: "", taskType: "" });
        setSelectedTeamLeaderUIDs([]);
        setShowTaskForm(false);
    } catch (e) {
        setError("Failed to assign task");
        console.error(e);
    } finally {
        setIsAssigning(false);
    }
  };

  const handleChangeStatus = async (taskId, newStatus, fullTaskObject) => {
      const collections = ["unitheads", "teamleaders", "supervisors", "employees", "heads"];
      try {
          await runTransaction(db, async (transaction) => {
              for (const col of collections) {
                  const snapshot = await getDocs(collection(db, col));
                  for (const docSnap of snapshot.docs) {
                      const data = docSnap.data();
                      if (data.tasks) {
                          const idx = data.tasks.findIndex(t => t.taskId === taskId);
                          if (idx !== -1) {
                              const taskToUpdate = data.tasks[idx];
                              const baseTask = fullTaskObject || taskToUpdate;
                              const updatedTask = {
                                  ...baseTask,
                                  status: newStatus,
                                  statusChangedBy: currentUser?.name || currentUser?.email,
                                  statusChangedDate: new Date().toISOString()
                              };
                              if (newStatus === "completed") {
                                  updatedTask.completedBy = currentUser?.name || currentUser?.email;
                                  updatedTask.completedDate = new Date().toISOString();
                              } else if (taskToUpdate.status === "completed") {
                                  updatedTask.completedBy = null;
                                  updatedTask.completedDate = null;
                              }
                              const newTasks = [...data.tasks];
                              newTasks[idx] = updatedTask;
                              transaction.update(doc(db, col, docSnap.id), { tasks: newTasks });
                          }
                      }
                  }
              }
          });
          setSuccessMessage(`Updated to ${newStatus}`);
          setTimeout(() => setSuccessMessage(""), 2000);
      } catch (e) { console.error(e); setError("Update failed"); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-[1px]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Image className="h-20 w-auto" src={logo} alt="Logo" priority />
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <NavButton onClick={() => setShowTaskForm(true)} icon={<FiPlusCircle/>} label="Assign Task" color="blue" />
              <NavButton onClick={() => setShowProfile(true)} icon={<FiUser/>} label="My Profile" color="blue" />
              <NavButton onClick={handleLogout} icon={<FiLogOut/>} label="Logout" color="red" />
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-700 hover:bg-gray-100">
                {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
            {isMobileMenuOpen && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="md:hidden absolute top-20 right-0 w-full bg-white shadow-lg z-50 border-b">
                    <div className="py-2 px-4 space-y-2">
                        <button onClick={() => { setShowTaskForm(true); setIsMobileMenuOpen(false); }} className="flex w-full items-center py-2 text-gray-700"><FiPlusCircle className="mr-3"/> Assign Task</button>
                        <button onClick={() => { setShowProfile(true); setIsMobileMenuOpen(false); }} className="flex w-full items-center py-2 text-gray-700"><FiUser className="mr-3"/> My Profile</button>
                        <button onClick={handleLogout} className="flex w-full items-center py-2 text-red-600"><FiLogOut className="mr-3"/> Logout</button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showProfile && (
           <ModalWrapper onClose={() => setShowProfile(false)}>
              <UserProfile onBack={() => setShowProfile(false)} currentUser={currentUser} userRole="unithead" />
           </ModalWrapper>
        )}
        
        {showTaskForm && (
           <ModalWrapper onClose={() => setShowTaskForm(false)}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Assign New Task</h3>
                    <button onClick={() => setShowTaskForm(false)} className="text-gray-500 hover:text-gray-700"><FiX size={24} /></button>
                  </div>
                  <form onSubmit={handleAddTask} className="space-y-4">
                      {/* Form Inputs with text-gray-700 styling */}
                      <SelectInput label="Project" value={taskFormData.project} onChange={e => setTaskFormData({...taskFormData, project: e.target.value})} options={projectNames} />
                      <SelectInput label="Task" value={taskFormData.task} onChange={e => setTaskFormData({...taskFormData, task: e.target.value})} options={taskNames} />
                      <SelectInput label="Subtask" value={taskFormData.subtask} onChange={e => setTaskFormData({...taskFormData, subtask: e.target.value})} options={subtaskNames} />
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" value={taskFormData.endDate} onChange={e => setTaskFormData({...taskFormData, endDate: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md text-gray-700" required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select value={taskFormData.priority} onChange={e => setTaskFormData({...taskFormData, priority: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md text-gray-700">
                                <option className="text-gray-700" value="">Select Priority</option>
                                <option className="text-gray-700" value="low">Low</option>
                                <option className="text-gray-700" value="medium">Medium</option>
                                <option className="text-gray-700" value="high">High</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={taskFormData.taskType} onChange={e => setTaskFormData({...taskFormData, taskType: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md text-gray-700">
                                <option className="text-gray-700" value="">Select Task Type</option>
                                <option className="text-gray-700" value="daily">Daily</option>
                                <option className="text-gray-700" value="weekly">Weekly</option>
                                <option className="text-gray-700" value="monthly">Monthly</option>
                            </select>
                         </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Team Leaders</label>
                          {teamLeaders.length === 0 ? (
                             <p className="text-gray-500 text-sm">No team leaders available.</p>
                          ) : (
                              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2 space-y-1">
                                  {teamLeaders.map(tl => (
                                      <div key={tl.uid} className="flex items-center">
                                          <input type="checkbox" checked={selectedTeamLeaderUIDs.includes(tl.uid)} 
                                                 onChange={e => {
                                                     if(e.target.checked) setSelectedTeamLeaderUIDs([...selectedTeamLeaderUIDs, tl.uid]);
                                                     else setSelectedTeamLeaderUIDs(selectedTeamLeaderUIDs.filter(id => id !== tl.uid));
                                                 }}
                                                 className="mr-2 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                          />
                                          <span className="text-sm text-gray-700">{tl.name}</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      <button type="submit" disabled={isAssigning} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {isAssigning ? "Assigning..." : "Assign Task"}
                      </button>
                  </form>
              </div>
           </ModalWrapper>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Unit Head Dashboard</h1>
            <div className="mt-2">
                <p className="text-lg text-gray-600">Welcome back, <span className="font-semibold text-blue-600">{userData?.name || currentUser?.email}</span></p>
                <p className="text-sm text-gray-500 mt-1">
                    {isBossLoading ? "Loading info..." : bossName ? `Reporting to: ${bossName} (Head)` : "No Head assigned"}
                </p>
            </div>
         </div>

         <AnimatePresence>
            {error && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</motion.div>}
            {successMessage && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">{successMessage}</motion.div>}
         </AnimatePresence>

         {showEmployeeList ? (
             <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                    <div>
                         <h3 className="text-lg font-semibold text-gray-800">Employee Team</h3>
                         <p className="text-sm text-gray-500 mt-1">Employees under selected supervisor</p>
                    </div>
                    <button onClick={() => setShowEmployeeList(false)} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
                        <FiArrowLeft className="mr-1"/> Back to Supervisors
                    </button>
                </div>
                <div className="p-6">
                    <EmployeeList employees={employees} onFilterTasks={() => {}} onEmployeeClick={() => {}} />
                </div>
             </div>
         ) : showSupervisorList ? (
             <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                    <div>
                         <h3 className="text-lg font-semibold text-gray-800">Supervisor Team</h3>
                         <p className="text-sm text-gray-500 mt-1">Supervisors under selected team leader</p>
                    </div>
                    <button onClick={() => setShowSupervisorList(false)} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
                        <FiArrowLeft className="mr-1"/> Back to Team Leaders
                    </button>
                </div>
                <div className="p-6">
                    <SupervisorList supervisors={supervisors} onFilterTasks={() => {}} onSupervisorClick={handleSupervisorClick} />
                </div>
             </div>
         ) : (
             <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="px-6 py-5 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">My Team Leaders</h3>
                    <p className="text-sm text-gray-500 mt-1">Team Leaders under your leadership</p>
                </div>
                <div className="p-6">
                    <TeamLeaderList teamLeaders={teamLeaders} onTeamLeaderClick={handleTeamLeaderClick} onFilterTasks={() => {}} />
                </div>
             </div>
         )}

         {/* Statistics Cards */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Assigned Tasks" value={stats.total} icon={<FiList/>} color="blue" />
            <StatCard label="Pending" value={stats.pending} icon={<FiClock/>} color="red" />
            <StatCard label="In Progress" value={stats.wip} icon={<FiLoader/>} color="amber" />
            <StatCard label="Completed" value={stats.completed} icon={<FiCheckCircle/>} color="green" />
         </div>

         {/* Filters */}
         <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 flex-wrap">
                    {['all', 'daily', 'weekly', 'monthly'].map(type => (
                        <button key={type} onClick={() => setSelectedTaskType(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${selectedTaskType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {type}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3 top-3 text-gray-400"/>
                    <input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>
         </div>

         {/* Task List */}
         <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Unit Task List</h3>
                <p className="text-sm text-gray-500">Showing {filteredTasks.length} tasks</p>
            </div>
            <div className="p-6 space-y-4">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No tasks found.</div>
                ) : (
                    filteredTasks.sort(sortTasksByPriority).map(task => (
                        <div key={task.taskId} className="bg-white rounded-lg border border-gray-100 shadow-sm p-2">
                             <TaskRow 
                                task={task} 
                                onChangeStatus={handleChangeStatus} 
                                userRole={userRole} 
                                currentUser={currentUser}
                                allHeadsData={allHeadsData}
                            />
                        </div>
                    ))
                )}
            </div>
         </div>
      </main>
    </div>
  );
}

// Helpers
function NavButton({ onClick, icon, label, color }) {
    return (
        <button onClick={onClick} className="group flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all">
            <div className={`p-1.5 mr-2 rounded-lg bg-gray-100 group-hover:bg-${color}-100`}>
                <span className={`text-gray-600 group-hover:text-${color}-600`}>{icon}</span>
            </div>
            <span className={`text-gray-700 group-hover:text-${color}-600`}>{label}</span>
        </button>
    );
}

function StatCard({ label, value, icon, color }) {
    const colors = { blue: "bg-blue-100 text-blue-600", red: "bg-red-100 text-red-600", amber: "bg-amber-100 text-amber-600", green: "bg-green-100 text-green-600" };
    const barColors = { blue: "bg-blue-500", red: "bg-red-500", amber: "bg-amber-500", green: "bg-green-500" };
    
    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 overflow-hidden">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="text-3xl font-bold mt-1 text-gray-800">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${colors[color]}`}>{icon}</div>
            </div>
            <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barColors[color]}`} style={{ width: '100%' }}></div>
            </div>
        </div>
    )
}

function ModalWrapper({ onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    {children}
                </div>
            </div>
        </div>
    )
}

function SelectInput({ label, value, onChange, options }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md text-gray-700">
                <option className="text-gray-700" value="">Select {label}</option>
                {options.map(opt => <option key={opt} className="text-gray-700" value={opt}>{opt}</option>)}
            </select>
        </div>
    )
}