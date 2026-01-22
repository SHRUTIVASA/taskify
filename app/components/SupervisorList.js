import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useDeleteTask } from "./useDeleteTask";
import { FiChevronRight, FiUser, FiClipboard, FiClock, FiCheckCircle } from "react-icons/fi";

const SupervisorList = ({ supervisors, onFilterTasks, onSupervisorClick }) => {
  const [activeFilter, setActiveFilter] = useState({});
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
  const [selectedSupervisorTasks, setSelectedSupervisorTasks] = useState([]);
  const { currentUser } = useAuth();
  const { deleteTask } = useDeleteTask();

  // 1. OPTIMIZATION: Calculate stats instantly from props
  const taskStatistics = useMemo(() => {
    return supervisors.map(sup => {
        const tasksArray = sup.tasks || [];
        return {
            supervisorId: sup.uid,
            numTasksCompleted: tasksArray.filter(t => t.status.toLowerCase() === "completed").length,
            numTasksPending: tasksArray.filter(t => t.status.toLowerCase() === "pending").length,
            numTasksInProgress: tasksArray.filter(t => t.status.toLowerCase() === "work in progress").length,
            numTasksAssigned: tasksArray.length,
        };
    });
  }, [supervisors]);

  // 2. Helper Sort function
  const sortTasks = useCallback((tasksArray) => {
    return [...tasksArray].sort((taskA, taskB) => {
      if (taskA.status === 'completed' && taskB.status !== 'completed') return 1;
      if (taskA.status !== 'completed' && taskB.status === 'completed') return -1;
      if (taskA.status === 'completed' && taskB.status === 'completed') {
        return new Date(taskB.completedDate || taskB.endDate) - new Date(taskA.completedDate || taskA.endDate);
      }
      const statusOrder = { 'pending': 1, 'work in progress': 2 };
      const statusComparison = statusOrder[taskA.status.toLowerCase()] - statusOrder[taskB.status.toLowerCase()];
      if (statusComparison !== 0) return statusComparison;
    
      const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
      const priorityComparison = priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
      if (priorityComparison !== 0) return priorityComparison;
    
      return new Date(taskA.dueDate || taskA.endDate) - new Date(taskB.dueDate || taskB.endDate);
    });
  }, []);

  const filterTasks = useCallback(
    (supervisorId, status) => {
      setActiveFilter(status);
      setSelectedSupervisorId(supervisorId);

      const selectedSupervisor = supervisors.find(s => s.uid === supervisorId);

      if (selectedSupervisor && selectedSupervisor.tasks) {
        const tasksArray = selectedSupervisor.tasks.filter(
          (task) => task.status.toLowerCase() === status.toLowerCase()
        );
        const sorted = sortTasks(tasksArray);
        onFilterTasks(sorted);
        setSelectedSupervisorTasks(sorted);
      } else {
        setSelectedSupervisorTasks([]);
      }
    },
    [supervisors, sortTasks, onFilterTasks]
  );

  const filterAssignedTasks = useCallback(
    (supervisorId) => {
      setActiveFilter("assigned");
      setSelectedSupervisorId(supervisorId);

      const selectedSupervisor = supervisors.find(s => s.uid === supervisorId);

      if (selectedSupervisor && selectedSupervisor.tasks) {
        const sorted = sortTasks(selectedSupervisor.tasks);
        onFilterTasks(sorted);
        setSelectedSupervisorTasks(sorted);
      } else {
        setSelectedSupervisorTasks([]);
      }
    },
    [supervisors, sortTasks, onFilterTasks]
  );

  // 3. EFFECT: Refresh active selection when data updates
  useEffect(() => {
    if (selectedSupervisorId && activeFilter) {
        const selectedSupervisor = supervisors.find(s => s.uid === selectedSupervisorId);
        if (selectedSupervisor) {
            if (activeFilter === 'assigned') {
                const sorted = sortTasks(selectedSupervisor.tasks || []);
                setSelectedSupervisorTasks(sorted);
            } else {
                 const tasksArray = (selectedSupervisor.tasks || []).filter(
                  (task) => task.status.toLowerCase() === activeFilter.toLowerCase()
                );
                const sorted = sortTasks(tasksArray);
                setSelectedSupervisorTasks(sorted);
            }
        }
    }
  }, [supervisors, selectedSupervisorId, activeFilter, sortTasks]);

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
    setSelectedSupervisorId(null);
    onFilterTasks([]);
    setSelectedSupervisorTasks([]);
  }, [onFilterTasks]);

  const isAdmin = currentUser?.email === "admin@123.com";

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin || !selectedSupervisorId) return;
    await deleteTask(taskId, setSelectedSupervisorTasks);
  };

  return (
    <div className="p-6 min-h">
      <div className="max-w-7xl mx-auto">
        {supervisors && supervisors.length > 0 ? (
          <div className="space-y-8">
            {supervisors.map((supervisor) => {
              const stats = taskStatistics.find(s => s.supervisorId === supervisor.uid) || {};

              return (
                <div key={supervisor.uid} className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <button
                        onClick={() => onSupervisorClick(supervisor.uid)}
                        className="w-full flex justify-between items-center group"
                    >
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-teal-50 flex-shrink-0 flex items-center justify-center">
                            <FiUser className="text-teal-600 text-lg sm:text-xl" />
                        </div>
                        <div className="text-left min-w-0 overflow-hidden">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors truncate">
                            {supervisor.name}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500">Supervisor</p>
                        </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center text-gray-500 group-hover:text-teal-600 transition-colors ml-2">
                            <span className="hidden xs:inline-block text-xs sm:text-sm mr-1 sm:mr-2 whitespace-nowrap">
                                View Employees
                            </span>
                            <FiChevronRight size={16} className="sm:size-[18px]" />
                        </div>
                    </button>
                  </div>

                  <div className="p-6 border-b border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatButton
                        active={selectedSupervisorId === supervisor.uid && activeFilter === "assigned"}
                        icon={<FiClipboard className="text-blue-500" />}
                        label="Total Tasks"
                        count={stats.numTasksAssigned || 0}
                        onClick={() => {
                          if (activeFilter === "assigned" && selectedSupervisorId === supervisor.uid) clearFilter();
                          else filterAssignedTasks(supervisor.uid);
                        }}
                        colorClass="bg-blue-50 border-blue-100 hover:border-blue-200"
                      />

                      <StatButton
                        active={selectedSupervisorId === supervisor.uid && activeFilter === "pending"}
                        icon={<FiClock className="text-red-500" />}
                        label="Pending"
                        count={stats.numTasksPending || 0}
                        onClick={() => {
                          if (activeFilter === "pending" && selectedSupervisorId === supervisor.uid) clearFilter();
                          else filterTasks(supervisor.uid, "pending");
                        }}
                        colorClass="bg-red-50 border-red-100 hover:border-red-200"
                      />

                      <StatButton
                        active={selectedSupervisorId === supervisor.uid && activeFilter === "Work in Progress"}
                        icon={<FiClock className="text-amber-500" />}
                        label="In Progress"
                        count={stats.numTasksInProgress || 0}
                        onClick={() => {
                          if (activeFilter === "Work in Progress" && selectedSupervisorId === supervisor.uid) clearFilter();
                          else filterTasks(supervisor.uid, "Work in Progress");
                        }}
                        colorClass="bg-amber-50 border-amber-100 hover:border-amber-200"
                      />

                      <StatButton
                        active={selectedSupervisorId === supervisor.uid && activeFilter === "completed"}
                        icon={<FiCheckCircle className="text-green-500" />}
                        label="Completed"
                        count={stats.numTasksCompleted || 0}
                        onClick={() => {
                          if (activeFilter === "completed" && selectedSupervisorId === supervisor.uid) clearFilter();
                          else filterTasks(supervisor.uid, "completed");
                        }}
                        colorClass="bg-green-50 border-green-100 hover:border-green-200"
                      />
                    </div>
                  </div>

                  {selectedSupervisorId === supervisor.uid && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {activeFilter === "assigned" ? "All Tasks" : `${activeFilter} Tasks`}
                        </h3>
                        <p className="text-gray-500">
                          {selectedSupervisorTasks.length} tasks found
                        </p>
                      </div>

                      {selectedSupervisorTasks.length > 0 ? (
                        <div className="space-y-4">
                          {selectedSupervisorTasks.map((task, index) => (
                            <TaskCard 
                              key={`${selectedSupervisorId}-${task.taskId || index}`}
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
                            tasks.
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
            <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <FiUser className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Supervisors</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              There are currently no supervisors assigned in the system
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const StatButton = ({ active, icon, label, count, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center ${
      active ? "ring-2 ring-teal-200 bg-white" : colorClass
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
              statusColors[task.status.toLowerCase()] || "bg-gray-100 text-gray-800"
            }`}>
              {task.status}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Priority:</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              priorityColors[task.priority.toLowerCase()] || "bg-gray-100 text-gray-800"
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

export default SupervisorList;