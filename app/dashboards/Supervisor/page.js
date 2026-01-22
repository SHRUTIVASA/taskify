"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../AuthContext";
import { useRouter } from "next/navigation";
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
import { db } from "../../firebase";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import UserProfile from "../../components/userProfile";
import EmployeeList from "../../components/EmployeeList";
import TaskRow from "../../components/TaskRow";
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiPlusCircle,
  FiList,
  FiClock,
  FiLoader,
  FiCheckCircle,
  FiSearch,
} from "react-icons/fi";
import logo from "../../assets/Navbar_logo.png";
import Image from "next/image";

export default function SupervisorDashboard() {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  
  // Data States
  const [userData, setUserData] = useState({});
  const [tasks, setTasks] = useState([]); 
  const [employees, setEmployees] = useState([]); 
  const [allHeadsData, setAllHeadsData] = useState([]); 

  // UI/Selection States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployeeTasks, setSelectedEmployeeTasks] = useState([]);
  const [selectedEmployeeUIDs, setSelectedEmployeeUIDs] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState("all");
  
  // Loading & Role States
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [bossName, setBossName] = useState("");
  const [isBossLoading, setIsBossLoading] = useState(true);
  const userRole = "Supervisor";

  const [taskFormData, setTaskFormData] = useState({
    project: "",
    task: "",
    subtask: "",
    endDate: "",
    priority: "Select Priority",
    taskType: "Select Task Type",
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

    // Fetch User Data
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "supervisors", currentUser.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      } catch (e) { console.error(e); }
    };

    // Fetch Boss (Team Leader)
    const fetchTeamleaderInfo = async () => {
      setIsBossLoading(true);
      try {
        const q = query(
          collection(db, "teamleaders"),
          where("assigned", "array-contains", currentUser.uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) setBossName(snapshot.docs[0].data().name);
        else setBossName(null);
      } catch (e) {
        console.error("Error fetching teamleader:", e);
      } finally {
        setIsBossLoading(false);
      }
    };

    // Fetch Heads
    const fetchHeads = async () => {
      try {
        const snapshot = await getDocs(collection(db, "heads"));
        setAllHeadsData(snapshot.docs.map(d => d.data()));
      } catch (e) { console.error(e); }
    };

    fetchUserData();
    fetchTeamleaderInfo();
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

        if (task.taskType === "daily" && task.lastReset !== today) {
            shouldReset = true;
            newResetDate = today;
        } else if (task.taskType === "weekly" && (!task.lastReset || new Date(task.lastReset) < startOfWeek)) {
            shouldReset = true;
            newResetDate = ISTTime.toISOString().split("T")[0];
        } else if (task.taskType === "monthly" && (!task.lastReset || new Date(task.lastReset) < startOfMonth)) {
            shouldReset = true;
            newResetDate = ISTTime.toISOString().split("T")[0];
        }

        if (shouldReset) {
            needsUpdate = true;
            const { statusChangedBy, statusChangedDate, completedBy, completedDate, ...rest } = task;
            return {
                ...rest,
                status: "pending",
                lastReset: newResetDate,
                workInProgressNotes: []
            };
        }
        return task;
    });

    if (needsUpdate) {
        try {
            await updateDoc(doc(db, "supervisors", currentUser.uid), { tasks: updatedTasks });
        } catch (e) { console.error(e); }
    }
  }, [currentUser]);

  // --- 4. Fetch Tasks & Real-time Listeners ---
  useEffect(() => {
    if (!currentUser) return;

    const unsub = onSnapshot(doc(db, "supervisors", currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const currentTasks = data.tasks || [];
            setTasks(currentTasks);
            checkAndResetTasks(currentTasks);
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    }, (err) => {
        setError("Failed to fetch tasks");
        setIsLoading(false);
    });

    return () => unsub();
  }, [currentUser, checkAndResetTasks]);

  // --- 5. Fetch Assigned Employees ---
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsub = onSnapshot(doc(db, "supervisors", currentUser.uid), async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const employeeUIDs = data.assigned || [];

            if (employeeUIDs.length > 0) {
                try {
                    const q = query(collection(db, "employees"), where("uid", "in", employeeUIDs.slice(0, 30))); 
                    const snaps = await getDocs(q);
                    const empData = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
                    setEmployees(empData);
                } catch (e) {
                    console.error("Error fetching employees:", e);
                }
            } else {
                setEmployees([]);
            }
        }
    });
    return () => unsub();
  }, [currentUser]);

  // --- 6. Derived Names for Dropdowns ---
  const { projectNames, taskNames, subtaskNames } = useMemo(() => {
    const allTasks = [
        ...tasks, 
        ...employees.flatMap(e => e.tasks || [])
    ];
    
    return {
        projectNames: [...new Set(allTasks.map(t => t.project).filter(Boolean))],
        taskNames: [...new Set(allTasks.map(t => t.task).filter(Boolean))],
        subtaskNames: [...new Set(allTasks.map(t => t.subtask).filter(Boolean))]
    };
  }, [tasks, employees]);

  // --- 7. Task Filtering ---
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (selectedTaskType !== "all") {
        result = result.filter(t => t.taskType === selectedTaskType);
    }

    if (debouncedSearch) {
        result = result.filter(t => 
            t.project?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }
    
    return result;
  }, [tasks, selectedTaskType, debouncedSearch]);

  // --- 8. Stats ---
  const stats = useMemo(() => {
    return {
        completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
        pending: tasks.filter(t => t.status.toLowerCase() === 'pending').length,
        wip: tasks.filter(t => t.status.toLowerCase().includes('work in progress')).length,
        total: tasks.length
    };
  }, [tasks]); 

  // --- Actions ---
  const handleEmployeeClick = (employeeId) => {
    setSelectedEmployeeId(employeeId);
  };

  const handleLogout = async () => {
    try { await logout(); router.push("/login"); } 
    catch (e) { setError("Logout failed"); }
  };

  const sortTasksByPriority = (taskA, taskB) => {
    if (taskA.status === "completed" && taskB.status !== "completed") return 1;
    if (taskA.status !== "completed" && taskB.status === "completed") return -1;
    
    const pOrder = { high: 1, medium: 2, low: 3 };
    const pDiff = (pOrder[taskA.priority] || 3) - (pOrder[taskB.priority] || 3);
    if (pDiff !== 0) return pDiff;

    return new Date(taskA.endDate) - new Date(taskB.endDate);
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

  if (
    !project ||
    !task ||
    !subtask ||
    !endDate ||
    priority === "Select Priority" ||
    taskType === "Select Task Type"
  ) {
    showError("All fields are compulsory.");
    return;
  }

  if (selectedEmployeeUIDs.length === 0) {
    showError("Select at least one employee.");
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
        
        const updates = await Promise.all(selectedEmployeeUIDs.map(async (uid) => {
            const ref = doc(db, "employees", uid);
            const snap = await getDoc(ref);
            if (!snap.exists()) return null;
            
            const existingTasks = snap.data().tasks || [];
            if (existingTasks.some(t => t.project === project && t.task === task && t.subtask === subtask)) {
                return null;
            }
            return { ref, tasks: [...existingTasks, newTask] };
        }));

        const validUpdates = updates.filter(Boolean);
        if (validUpdates.length === 0 && selectedEmployeeUIDs.length > 0) {
            setError("Task already assigned to selected employees.");
            setIsAssigning(false);
            return;
        }

        validUpdates.forEach(u => batch.update(u.ref, { tasks: u.tasks }));
        await batch.commit();

        // ---------------------------------------------------------
        // KEY CHANGE: Manually update local state to reflect change immediately
        // ---------------------------------------------------------
        setEmployees(prevEmps => prevEmps.map(emp => {
            if (selectedEmployeeUIDs.includes(emp.uid)) {
                return {
                    ...emp,
                    tasks: [...(emp.tasks || []), newTask]
                };
            }
            return emp;
        }));

        setSuccessMessage("Task assigned successfully");
        setTaskFormData({
            project: "", task: "", subtask: "", endDate: "",
            priority: "Select Priority", taskType: "Select Task Type"
        });
        setSelectedEmployeeUIDs([]);
        setShowTaskForm(false);
    } catch (e) {
        setError("Failed to assign task");
        console.error(e);
    } finally {
        setIsAssigning(false);
    }
  };

  // Status Change Handler
  const handleChangeStatus = async (taskId, newStatus, fullTaskObject) => {
    const collections = ["supervisors", "employees", "teamleaders", "unitheads", "heads"];
    
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
    } catch (e) {
        console.error(e);
        setError("Update failed");
    }
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
              <UserProfile onBack={() => setShowProfile(false)} currentUser={currentUser} userRole="supervisor" />
           </ModalWrapper>
        )}
        {showTaskForm && (
           <ModalWrapper onClose={() => setShowTaskForm(false)}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Assign New Task</h3>
                    <button onClick={() => setShowTaskForm(false)} className="text-gray-500 hover:text-gray-700"><FiX size={24} /></button>
                  </div>
                  <form onSubmit={handleAddTask} className="space-y-4 text-gray-700">
                      <SelectInput label="Project" value={taskFormData.project} onChange={e => setTaskFormData({...taskFormData, project: e.target.value})} options={projectNames} />
                      <SelectInput label="Task" value={taskFormData.task} onChange={e => setTaskFormData({...taskFormData, task: e.target.value})} options={taskNames} />
                      <SelectInput label="Subtask" value={taskFormData.subtask} onChange={e => setTaskFormData({...taskFormData, subtask: e.target.value})} options={subtaskNames} />
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" value={taskFormData.endDate} onChange={e => setTaskFormData({...taskFormData, endDate: e.target.value})} className="w-full p-2 border rounded-md text-gray-700" required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select value={taskFormData.priority} onChange={e => setTaskFormData({...taskFormData, priority: e.target.value})} className="w-full p-2 border rounded-md text-gray-700">
                                <option>Select Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={taskFormData.taskType} onChange={e => setTaskFormData({...taskFormData, taskType: e.target.value})} className="w-full p-2 border rounded-md text-gray-700">
                                <option>Select Task Type</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                            </select>
                         </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
                          <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 text-gray-700">
                              {employees.map(emp => (
                                  <div key={emp.uid} className="flex items-center">
                                      <input type="checkbox" checked={selectedEmployeeUIDs.includes(emp.uid)} 
                                             onChange={e => {
                                                 if(e.target.checked) setSelectedEmployeeUIDs([...selectedEmployeeUIDs, emp.uid]);
                                                 else setSelectedEmployeeUIDs(selectedEmployeeUIDs.filter(id => id !== emp.uid));
                                             }}
                                             className="mr-2"
                                      />
                                      <span className="text-sm">{emp.name}</span>
                                  </div>
                              ))}
                          </div>
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
         {/* Header */}
         <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
            <div className="mt-2">
                <p className="text-lg text-gray-600">Welcome back, <span className="font-semibold text-blue-600">{userData?.name || currentUser?.email}</span></p>
                <p className="text-sm text-gray-500 mt-1">
                    {isBossLoading ? "Loading info..." : bossName ? `Reporting to: ${bossName} (Team Leader)` : "No Team Leader assigned"}
                </p>
            </div>
         </div>

         <AnimatePresence>
            {error && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</motion.div>}
            {successMessage && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">{successMessage}</motion.div>}
         </AnimatePresence>

         {/* Employee List */}
         <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b">
                <h3 className="text-lg font-semibold text-gray-800">My Team</h3>
            </div>
            <div className="p-6">
                <EmployeeList 
                    employees={employees} 
                    onFilterTasks={(status) => { /* Optional local filtering impl */ }}
                    onEmployeeClick={handleEmployeeClick}
                    setSelectedEmployeeTasks={setSelectedEmployeeTasks}
                />
            </div>
         </div>

         {/* Stats */}
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
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>
         </div>

         {/* Task List */}
         <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Team Task List</h3>
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
            <select value={value} onChange={onChange} className="w-full p-2 border rounded-md">
                <option value="">Select {label}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    )
}