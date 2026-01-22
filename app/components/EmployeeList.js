import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { useDeleteTask } from "../components/useDeleteTask";
import { FiChevronRight, FiUser, FiClipboard, FiClock, FiCheckCircle } from "react-icons/fi";

const EmployeeList = ({ employees, onFilterTasks }) => {
  const [activeFilter, setActiveFilter] = useState({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployeeTasks, setSelectedEmployeeTasks] = useState([]);
  const { currentUser } = useAuth();
  const { deleteTask } = useDeleteTask();

  // 1. OPTIMIZATION: Derive stats from props instead of fetching DB again
  // This ensures immediate updates when parent 'employees' state changes
  const taskStatistics = useMemo(() => {
    return employees.map(employee => {
        const tasksArray = employee.tasks || [];
        return {
            employeeId: employee.uid,
            numTasksCompleted: tasksArray.filter(t => t.status.toLowerCase() === "completed").length,
            numTasksPending: tasksArray.filter(t => t.status.toLowerCase() === "pending").length,
            numTasksInProgress: tasksArray.filter(t => t.status.toLowerCase() === "work in progress").length,
            numTasksAssigned: tasksArray.length,
        };
    });
  }, [employees]);

  // 2. Helper to Sort Tasks
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
    (employeeId, status) => {
      setActiveFilter(status);
      setSelectedEmployeeId(employeeId);

      const selectedEmployee = employees.find(e => e.uid === employeeId);

      if (selectedEmployee && selectedEmployee.tasks) {
        const tasksArray = selectedEmployee.tasks.filter(
          (task) => task.status.toLowerCase() === status.toLowerCase()
        );
        const sorted = sortTasks(tasksArray);
        onFilterTasks(sorted);
        setSelectedEmployeeTasks(sorted);
      } else {
        setSelectedEmployeeTasks([]);
      }
    },
    [employees, sortTasks, onFilterTasks]
  );

  const filterAssignedTasks = useCallback(
    (employeeId) => {
      setActiveFilter("assigned");
      setSelectedEmployeeId(employeeId);
  
      const selectedEmployee = employees.find(e => e.uid === employeeId);
  
      if (selectedEmployee && selectedEmployee.tasks) {
        const sorted = sortTasks(selectedEmployee.tasks);
        onFilterTasks(sorted);
        setSelectedEmployeeTasks(sorted);
      } else {
        setSelectedEmployeeTasks([]);
      }
    },
    [employees, sortTasks, onFilterTasks]
  );

  // 3. EFFECT: Refresh active selection when data updates
  // If parent adds a task, we need to refresh the list if user is currently viewing that employee
  useEffect(() => {
    if (selectedEmployeeId && activeFilter) {
        const selectedEmployee = employees.find(e => e.uid === selectedEmployeeId);
        if (selectedEmployee) {
            if (activeFilter === 'assigned') {
                const sorted = sortTasks(selectedEmployee.tasks || []);
                setSelectedEmployeeTasks(sorted);
            } else {
                 const tasksArray = (selectedEmployee.tasks || []).filter(
                  (task) => task.status.toLowerCase() === activeFilter.toLowerCase()
                );
                const sorted = sortTasks(tasksArray);
                setSelectedEmployeeTasks(sorted);
            }
        }
    }
  }, [employees, selectedEmployeeId, activeFilter, sortTasks]);

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
    setSelectedEmployeeId(null);
    onFilterTasks([]);
    setSelectedEmployeeTasks([]);
  }, [onFilterTasks]);

  const isAdmin = currentUser?.email === "admin@123.com";

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin || !selectedEmployeeId) return;
    await deleteTask(taskId, setSelectedEmployeeTasks);
    // Note: This only deletes locally in the sub-list. 
    // Ideally, you'd also want to bubble this up to parent to update 'employees' state 
    // to maintain consistency, but for now keeping existing behavior.
  };

  return (
    <div className="p-6 min-h">
      <div className="max-w-7xl mx-auto">
        {employees && employees.length > 0 ? (
          <div className="space-y-8">
            {employees.map((employee) => {
              const stats = taskStatistics.find(s => s.employeeId === employee.uid) || {};

              return (
                <div key={employee.uid} className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FiUser className="text-gray-600 text-xl" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-semibold text-gray-900">{employee.name}</h2>
                        <p className="text-sm text-gray-500">Employee</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-b border-blue-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatButton
                        active={selectedEmployeeId === employee.uid && activeFilter === "assigned"}
                        icon={<FiClipboard className="text-gray-500" />}
                        label="Total Tasks"
                        count={stats.numTasksAssigned || 0}
                        onClick={() => {
                          if (activeFilter === "assigned" && selectedEmployeeId === employee.uid) clearFilter();
                          else filterAssignedTasks(employee.uid);
                        }}
                        colorClass="bg-blue-50 border-blue-100 hover:border-blue-200"
                      />

                      <StatButton
                        active={selectedEmployeeId === employee.uid && activeFilter === "pending"}
                        icon={<FiClock className="text-red-500" />}
                        label="Pending"
                        count={stats.numTasksPending || 0}
                        onClick={() => {
                          if (activeFilter === "pending" && selectedEmployeeId === employee.uid) clearFilter();
                          else filterTasks(employee.uid, "pending");
                        }}
                        colorClass="bg-red-50 border-red-100 hover:border-red-200"
                      />

                      <StatButton
                        active={selectedEmployeeId === employee.uid && activeFilter === "Work in Progress"}
                        icon={<FiClock className="text-amber-500" />}
                        label="In Progress"
                        count={stats.numTasksInProgress || 0}
                        onClick={() => {
                          if (activeFilter === "Work in Progress" && selectedEmployeeId === employee.uid) clearFilter();
                          else filterTasks(employee.uid, "Work in Progress");
                        }}
                        colorClass="bg-amber-50 border-amber-100 hover:border-amber-200"
                      />

                      <StatButton
                        active={selectedEmployeeId === employee.uid && activeFilter === "completed"}
                        icon={<FiCheckCircle className="text-green-500" />}
                        label="Completed"
                        count={stats.numTasksCompleted || 0}
                        onClick={() => {
                          if (activeFilter === "completed" && selectedEmployeeId === employee.uid) clearFilter();
                          else filterTasks(employee.uid, "completed");
                        }}
                        colorClass="bg-green-50 border-green-100 hover:border-green-200"
                      />
                    </div>
                  </div>

                  {selectedEmployeeId === employee.uid && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {activeFilter === "assigned" ? "All Tasks" : `${activeFilter} Tasks`}
                        </h3>
                        <p className="text-gray-500">{selectedEmployeeTasks.length} tasks found</p>
                      </div>

                      {selectedEmployeeTasks.length > 0 ? (
                        <div className="space-y-4">
                          {selectedEmployeeTasks.map((task, index) => (
                            <TaskCard 
                              key={`${selectedEmployeeId}-${task.taskId || index}`}
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
                            There are no {activeFilter === "assigned" ? "" : activeFilter.toLowerCase() + " "} tasks.
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
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Employees</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              There are currently no employees assigned in the system
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
      active ? "ring-2 ring-gray-200 bg-white" : colorClass
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

export default EmployeeList;