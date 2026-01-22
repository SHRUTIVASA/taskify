import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useDeleteTask } from "./useDeleteTask";
import { FiChevronRight, FiUser, FiClipboard, FiClock, FiCheckCircle } from "react-icons/fi";

const UnitHeadList = ({ unitHeads, onFilterTasks, onUnitHeadClick }) => {
  const [activeFilter, setActiveFilter] = useState({});
  const [selectedUnitHeadId, setSelectedUnitHeadId] = useState(null);
  const [selectedUnitHeadTasks, setSelectedUnitHeadTasks] = useState([]);
  const { currentUser } = useAuth();
  const { deleteTask } = useDeleteTask();

  // 1. OPTIMIZATION: Calculate stats instantly from props
  const taskStatistics = useMemo(() => {
    return unitHeads.map(uh => {
        const tasksArray = uh.tasks || [];
        return {
            unitHeadId: uh.uid,
            numTasksCompleted: tasksArray.filter(t => t.status.toLowerCase() === "completed").length,
            numTasksPending: tasksArray.filter(t => t.status.toLowerCase() === "pending").length,
            numTasksInProgress: tasksArray.filter(t => t.status.toLowerCase() === "work in progress").length,
            numTasksAssigned: tasksArray.length,
        };
    });
  }, [unitHeads]);

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
    (unitHeadId, status) => {
      setActiveFilter(status);
      setSelectedUnitHeadId(unitHeadId);

      const selectedUnitHead = unitHeads.find(uh => uh.uid === unitHeadId);

      if (selectedUnitHead && selectedUnitHead.tasks) {
        const tasksArray = selectedUnitHead.tasks.filter(
          (task) => task.status.toLowerCase() === status.toLowerCase()
        );
        const sorted = sortTasks(tasksArray);
        onFilterTasks(sorted);
        setSelectedUnitHeadTasks(sorted);
      } else {
        setSelectedUnitHeadTasks([]);
      }
    },
    [unitHeads, sortTasks, onFilterTasks]
  );

  const filterAssignedTasks = useCallback(
    (unitHeadId) => {
      setActiveFilter("assigned");
      setSelectedUnitHeadId(unitHeadId);

      const selectedUnitHead = unitHeads.find(uh => uh.uid === unitHeadId);

      if (selectedUnitHead && selectedUnitHead.tasks) {
        const sorted = sortTasks(selectedUnitHead.tasks);
        onFilterTasks(sorted);
        setSelectedUnitHeadTasks(sorted);
      } else {
        setSelectedUnitHeadTasks([]);
      }
    },
    [unitHeads, sortTasks, onFilterTasks]
  );

  // 3. EFFECT: Refresh active selection when data updates
  useEffect(() => {
    if (selectedUnitHeadId && activeFilter) {
        const selectedUnitHead = unitHeads.find(uh => uh.uid === selectedUnitHeadId);
        if (selectedUnitHead) {
            if (activeFilter === 'assigned') {
                const sorted = sortTasks(selectedUnitHead.tasks || []);
                setSelectedUnitHeadTasks(sorted);
            } else {
                 const tasksArray = (selectedUnitHead.tasks || []).filter(
                  (task) => task.status.toLowerCase() === activeFilter.toLowerCase()
                );
                const sorted = sortTasks(tasksArray);
                setSelectedUnitHeadTasks(sorted);
            }
        }
    }
  }, [unitHeads, selectedUnitHeadId, activeFilter, sortTasks]);

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
    setSelectedUnitHeadId(null);
    onFilterTasks([]);
    setSelectedUnitHeadTasks([]);
  }, [onFilterTasks]);

  const isAdmin = currentUser?.email === "admin@123.com";

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin || !selectedUnitHeadId) return;
    await deleteTask(taskId, setSelectedUnitHeadTasks);
  };

  return (
    <div className="p-6 min-h">
      <div className="max-w-7xl mx-auto">
        {unitHeads && unitHeads.length > 0 ? (
          <div className="space-y-8">
            {unitHeads.map((unitHead) => {
              const stats = taskStatistics.find(s => s.unitHeadId === unitHead.uid) || {};

              return (
                <div key={unitHead.uid} className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <button
                      onClick={() => onUnitHeadClick(unitHead.uid)}
                      className="w-full flex justify-between items-center group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                          <FiUser className="text-blue-600 text-xl" />
                        </div>
                        <div className="text-left">
                          <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {unitHead.name}
                          </h2>
                          <p className="text-sm text-gray-500">Unit Head</p>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-500 group-hover:text-blue-600 transition-colors">
                         <span className="text-sm mr-2 hidden sm:block">View Team Leaders</span>
                        <FiChevronRight size={18} />
                      </div>
                    </button>
                  </div>

                  <div className="p-6 border-b border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatButton
                        active={selectedUnitHeadId === unitHead.uid && activeFilter === "assigned"}
                        icon={<FiClipboard className="text-blue-500" />}
                        label="Total Tasks"
                        count={stats.numTasksAssigned || 0}
                        onClick={() => {
                          if (activeFilter === "assigned" && selectedUnitHeadId === unitHead.uid) clearFilter();
                          else filterAssignedTasks(unitHead.uid);
                        }}
                        colorClass="bg-blue-50 border-blue-100 hover:border-blue-200"
                      />

                      <StatButton
                        active={selectedUnitHeadId === unitHead.uid && activeFilter === "pending"}
                        icon={<FiClock className="text-red-500" />}
                        label="Pending"
                        count={stats.numTasksPending || 0}
                        onClick={() => {
                          if (activeFilter === "pending" && selectedUnitHeadId === unitHead.uid) clearFilter();
                          else filterTasks(unitHead.uid, "pending");
                        }}
                        colorClass="bg-red-50 border-red-100 hover:border-red-200"
                      />

                      <StatButton
                        active={selectedUnitHeadId === unitHead.uid && activeFilter === "Work in Progress"}
                        icon={<FiClock className="text-amber-500" />}
                        label="In Progress"
                        count={stats.numTasksInProgress || 0}
                        onClick={() => {
                          if (activeFilter === "Work in Progress" && selectedUnitHeadId === unitHead.uid) clearFilter();
                          else filterTasks(unitHead.uid, "Work in Progress");
                        }}
                        colorClass="bg-amber-50 border-amber-100 hover:border-amber-200"
                      />

                      <StatButton
                        active={selectedUnitHeadId === unitHead.uid && activeFilter === "completed"}
                        icon={<FiCheckCircle className="text-green-500" />}
                        label="Completed"
                        count={stats.numTasksCompleted || 0}
                        onClick={() => {
                          if (activeFilter === "completed" && selectedUnitHeadId === unitHead.uid) clearFilter();
                          else filterTasks(unitHead.uid, "completed");
                        }}
                        colorClass="bg-green-50 border-green-100 hover:border-green-200"
                      />
                    </div>
                  </div>

                  {selectedUnitHeadId === unitHead.uid && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {activeFilter === "assigned" ? "All Tasks" : `${activeFilter} Tasks`}
                        </h3>
                        <p className="text-gray-500">
                          {selectedUnitHeadTasks.length} tasks found
                        </p>
                      </div>

                      {selectedUnitHeadTasks.length > 0 ? (
                        <div className="space-y-4">
                          {selectedUnitHeadTasks.map((task, index) => (
                            <TaskCard 
                              key={`${selectedUnitHeadId}-${task.taskId || index}`}
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
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Unit Heads</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              There are currently no unit heads assigned in the system
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
      active ? "ring-2 ring-blue-200 bg-white" : colorClass
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

export default UnitHeadList;