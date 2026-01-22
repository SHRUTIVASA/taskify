import { useEffect, useState, useCallback, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { FiChevronRight, FiUser, FiClipboard, FiClock, FiCheckCircle } from "react-icons/fi";
import { useDeleteTask } from "./useDeleteTask";

const HeadList = ({ heads, onFilterTasks, onHeadClick }) => {
  const { deleteTask } = useDeleteTask();
  const [activeFilter, setActiveFilter] = useState({});
  const [selectedHeadId, setSelectedHeadId] = useState(null);
  const [selectedHeadTasks, setSelectedHeadTasks] = useState([]);
  const { currentUser } = useAuth();

  // OPTIMIZATION: Stats derived instantly from props (No N+1 fetching)
  const taskStatistics = useMemo(() => {
    return heads.map(head => {
        const tasksArray = head.tasks || [];
        return {
            headId: head.uid,
            numTasksCompleted: tasksArray.filter(t => t.status.toLowerCase() === "completed").length,
            numTasksPending: tasksArray.filter(t => t.status.toLowerCase() === "pending").length,
            numTasksInProgress: tasksArray.filter(t => t.status.toLowerCase() === "work in progress").length,
            numTasksAssigned: tasksArray.length,
        };
    });
  }, [heads]);

  // Helper Sort Function
  const sortTasks = useCallback((tasksArray) => {
    return [...tasksArray].sort((taskA, taskB) => {
      // Prioritize Pending High Priority
      if (taskA.status === 'pending' && taskA.priority === 'high' && taskB.status !== 'pending') return -1;
      
      const priorityValues = { high: 3, medium: 2, low: 1 };
      const pDiff = (priorityValues[taskB.priority] || 0) - (priorityValues[taskA.priority] || 0);
      if (pDiff !== 0) return pDiff;
      
      return new Date(taskA.endDate) - new Date(taskB.endDate);
    });
  }, []);

  const filterTasks = useCallback(
    (headId, status) => {
      setActiveFilter(status);
      setSelectedHeadId(headId);

      const selectedHead = heads.find((head) => head.uid === headId);

      if (selectedHead && selectedHead.tasks) {
        const tasksArray = selectedHead.tasks.filter(
          (task) => task.status.toLowerCase() === status.toLowerCase()
        );
        const sorted = sortTasks(tasksArray);
        onFilterTasks(sorted);
        setSelectedHeadTasks(sorted);
      } else {
        setSelectedHeadTasks([]);
      }
    },
    [heads, sortTasks, onFilterTasks]
  );

  const filterAssignedTasks = useCallback(
    (headId) => {
      setActiveFilter("assigned");
      setSelectedHeadId(headId);

      const selectedHead = heads.find((head) => head.uid === headId);

      if (selectedHead && selectedHead.tasks) {
        const sorted = sortTasks(selectedHead.tasks);
        onFilterTasks(sorted);
        setSelectedHeadTasks(sorted);
      } else {
        setSelectedHeadTasks([]);
      }
    },
    [heads, sortTasks, onFilterTasks]
  );

  // Refresh active selection if data changes
  useEffect(() => {
    if (selectedHeadId && activeFilter) {
        const selectedHead = heads.find(h => h.uid === selectedHeadId);
        if (selectedHead) {
            if (activeFilter === 'assigned') {
                setSelectedHeadTasks(sortTasks(selectedHead.tasks || []));
            } else {
                const filtered = (selectedHead.tasks || []).filter(t => t.status.toLowerCase() === activeFilter.toLowerCase());
                setSelectedHeadTasks(sortTasks(filtered));
            }
        }
    }
  }, [heads, selectedHeadId, activeFilter, sortTasks]);

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
    setSelectedHeadId(null);
    onFilterTasks([]);
    setSelectedHeadTasks([]);
  }, [onFilterTasks]);

  const isAdmin = currentUser?.email === "admin@123.com";

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin || !selectedHeadId) return;
    await deleteTask(taskId, setSelectedHeadTasks);
  };

  return (
    <div className="p-6 min-h">
      <div className="max-w-7xl mx-auto">
        {heads && heads.length > 0 ? (
          <div className="space-y-8">
            {heads.map((head) => {
              const stats = taskStatistics.find(s => s.headId === head.uid) || {};

              return (
                <div key={head.uid} className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <button
                      onClick={() => onHeadClick(head.uid)}
                      className="w-full flex justify-between items-center group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <FiUser className="text-indigo-600 text-xl" />
                        </div>
                        <div className="text-left">
                          <h2 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {head.name}
                          </h2>
                          <p className="text-sm text-gray-500">Head of Department</p>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-500 group-hover:text-indigo-600 transition-colors">
                        <span className="text-sm mr-2">View Unitheads</span>
                        <FiChevronRight size={18} />
                      </div>
                    </button>
                  </div>

                  <div className="p-6 border-b border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatButton
                        active={selectedHeadId === head.uid && activeFilter === "assigned"}
                        icon={<FiClipboard className="text-indigo-500" />}
                        label="Total Tasks"
                        count={stats.numTasksAssigned || 0}
                        onClick={() => {
                          if (activeFilter === "assigned" && selectedHeadId === head.uid) clearFilter();
                          else filterAssignedTasks(head.uid);
                        }}
                        colorClass="bg-indigo-50 border-indigo-100 hover:border-indigo-200"
                      />

                      <StatButton
                        active={selectedHeadId === head.uid && activeFilter === "pending"}
                        icon={<FiClock className="text-red-500" />}
                        label="Pending"
                        count={stats.numTasksPending || 0}
                        onClick={() => {
                          if (activeFilter === "pending" && selectedHeadId === head.uid) clearFilter();
                          else filterTasks(head.uid, "pending");
                        }}
                        colorClass="bg-red-50 border-red-100 hover:border-red-200"
                      />

                      <StatButton
                        active={selectedHeadId === head.uid && activeFilter === "Work in Progress"}
                        icon={<FiClock className="text-amber-500" />}
                        label="In Progress"
                        count={stats.numTasksInProgress || 0}
                        onClick={() => {
                          if (activeFilter === "Work in Progress" && selectedHeadId === head.uid) clearFilter();
                          else filterTasks(head.uid, "Work in Progress");
                        }}
                        colorClass="bg-amber-50 border-amber-100 hover:border-amber-200"
                      />

                      <StatButton
                        active={selectedHeadId === head.uid && activeFilter === "completed"}
                        icon={<FiCheckCircle className="text-green-500" />}
                        label="Completed"
                        count={stats.numTasksCompleted || 0}
                        onClick={() => {
                          if (activeFilter === "completed" && selectedHeadId === head.uid) clearFilter();
                          else filterTasks(head.uid, "completed");
                        }}
                        colorClass="bg-green-50 border-green-100 hover:border-green-200"
                      />
                    </div>
                  </div>

                  {/* Tasks List */}
                  {selectedHeadId === head.uid && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {activeFilter === "assigned" ? "All Tasks" : `${activeFilter} Tasks`}
                        </h3>
                        <p className="text-gray-500">
                          {selectedHeadTasks.length} tasks found
                        </p>
                      </div>

                      {selectedHeadTasks.length > 0 ? (
                        <div className="space-y-4">
                          {selectedHeadTasks.map((task, index) => (
                            <TaskCard 
                              key={`${selectedHeadId}-${task.taskId || index}`}
                              task={task}
                              isAdmin={isAdmin}
                              onDelete={handleDeleteTask}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <FiClipboard className="text-gray-400 text-xl" />
                          </div>
                          <h4 className="text-gray-700 font-medium mb-1">No tasks found</h4>
                          <p className="text-gray-500 max-w-md mx-auto">
                            There are no {activeFilter === "assigned" ? "" : activeFilter.toLowerCase() + " "} 
                            tasks
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-2xl shadow-xs border border-gray-200">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <FiUser className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Department Heads</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              There are currently no department heads assigned in the system
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Components
const StatButton = ({ active, icon, label, count, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center ${
      active ? "ring-2 ring-indigo-200 bg-white" : colorClass
    }`}
  >
    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-xs">
      {icon}
    </div>
    <div className="text-sm text-gray-600">{label}</div>
    <div className="text-2xl font-bold text-gray-900 mt-1">{count}</div>
  </button>
);

const TaskCard = ({ task, isAdmin, onDelete }) => {
  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-green-100 text-green-800"
  };

  const statusColors = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-red-100 text-red-800",
    "work in progress": "bg-amber-100 text-amber-800"
  };

  return (
    <div className={`p-5 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow ${
      task.status.toLowerCase() === "pending" && task.priority === "high"
        ? "border-l-4 border-red-500"
        : ""
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">{task.project}</h4>
          <p className="text-gray-800">{task.task}</p>
          {task.subtask && (
            <p className="text-gray-600 text-sm mt-1">{task.subtask}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Status:</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              statusColors[task.status.toLowerCase()] || "text-gray-800"
            }`}>
              {task.status}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Priority:</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              priorityColors[task.priority.toLowerCase()] || " text-gray-800"
            }`}>
              {task.priority}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-800">
            <span className="text-gray-500">Due:</span> {task.endDate}
          </p>
          <p className="text-sm text-gray-800">
            <span className="text-gray-500">Type:</span> {task.taskType}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onDelete(task.taskId)}
            className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center space-x-1"
          >
            <span>Delete Task</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HeadList;