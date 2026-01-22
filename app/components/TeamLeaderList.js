import { useEffect, useState, useCallback } from "react";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { useDeleteTask } from "./useDeleteTask";
import { FiChevronRight, FiUser, FiClipboard, FiClock, FiCheckCircle } from "react-icons/fi";

const TeamLeaderList = ({ teamLeaders, onFilterTasks, onTeamLeaderClick }) => {
  const [taskStatistics, setTaskStatistics] = useState([]);
  const [activeFilter, setActiveFilter] = useState({});
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState(null);
  const [selectedTeamLeaderTasks, setSelectedTeamLeaderTasks] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [tasks, setTasks] = useState([]);
  const { currentUser, logout } = useAuth();
  const { deleteTask } = useDeleteTask();

  useEffect(() => {
    const fetchTaskStatistics = async (teamLeaderId) => {
      try {
        const TeamLeaderDocRef = doc(db, "teamleaders", teamLeaderId);
        const TeamLeaderDocSnapshot = await getDoc(TeamLeaderDocRef);

        if (TeamLeaderDocSnapshot.exists()) {
          const TeamLeaderData = TeamLeaderDocSnapshot.data();
          const tasksArray = TeamLeaderData.tasks || [];

          const numTasksCompleted = tasksArray.filter(
            (task) => task.status.toLowerCase() === "completed"
          ).length;
          const numTasksPending = tasksArray.filter(
            (task) => task.status.toLowerCase() === "pending"
          ).length;
          const numTasksInProgress = tasksArray.filter(
            (task) => task.status.toLowerCase() === "work in progress"
          ).length;

          const teamLeaderStatistics = {
            teamLeaderId,
            numTasksCompleted,
            numTasksPending,
            numTasksAssigned: tasksArray.length,
            numTasksInProgress,
          };

          setTaskStatistics((prevStatistics) => [
            ...prevStatistics.filter((stat) => stat.teamLeaderId !== teamLeaderId),
            teamLeaderStatistics,
          ]);
        }
      } catch (err) {
        console.error("Error fetching task statistics:", err);
      }
    };

    teamLeaders.forEach((teamLeader) => {
      fetchTaskStatistics(teamLeader.uid);
    });
  }, [teamLeaders]);

  const filterTasks = useCallback(
    async (teamLeaderId, status) => {
      setActiveFilter(status);
      setSelectedTeamLeaderId(teamLeaderId);

      const selectedTeamLeader = teamLeaders.find(
        (teamLeader) => teamLeader.uid === teamLeaderId
      );

      if (selectedTeamLeader && selectedTeamLeader.tasks) {
        const tasksArray = selectedTeamLeader.tasks || [];

        const filteredTasks = tasksArray.filter(
          (task) => task.status.toLowerCase() === status.toLowerCase()
        );

        onFilterTasks(filteredTasks);
        setSelectedTeamLeaderTasks(filteredTasks);
      }
    },
    [teamLeaders]
  );

  const filterAssignedTasks = useCallback(
    async (teamLeaderId) => {
      setActiveFilter("assigned");
      setSelectedTeamLeaderId(teamLeaderId);

      const selectedTeamLeader = teamLeaders.find(
        (teamLeader) => teamLeader.uid === teamLeaderId
      );

      if (selectedTeamLeader && selectedTeamLeader.tasks) {
        let tasksArray = selectedTeamLeader.tasks || [];

        tasksArray = tasksArray.sort((taskA, taskB) => {
          if (taskA.status === 'completed' && taskB.status !== 'completed') return 1;
          if (taskA.status !== 'completed' && taskB.status === 'completed') return -1;
          
          const statusOrder = { 'pending': 1, 'work in progress': 2 };
          const statusComparison = statusOrder[taskA.status] - statusOrder[taskB.status];
          if (statusComparison !== 0) return statusComparison;
          
          const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
          const priorityComparison = priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
          if (priorityComparison !== 0) return priorityComparison;
          
          return new Date(taskA.dueDate || taskA.endDate) - new Date(taskB.dueDate || taskB.endDate);
        });

        onFilterTasks(tasksArray);
        setSelectedTeamLeaderTasks(tasksArray);
      }
    },
    [teamLeaders]
  );

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
    setSelectedTeamLeaderId(null);
    onFilterTasks([]);
    setSelectedTeamLeaderTasks([]);
  }, []);

  const isAdmin = currentUser?.email === "admin@123.com";

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin || !selectedTeamLeaderId) return;

    await deleteTask(taskId, setSelectedTeamLeaderTasks);
    setTasks((prevTasks) => prevTasks.filter((task) => task.taskId !== taskId));
  };

  return (
    <div className="p-6 min-h">
      <div className="max-w-7xl mx-auto">
        {/*<div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Leaders</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Overview of tasks assigned to each team leader with detailed status tracking
          </p>
        </div>*/}

        {teamLeaders && teamLeaders.length > 0 ? (
          <div className="space-y-8">
            {teamLeaders.map((teamLeader) => {
              const teamLeaderStatistics = taskStatistics.find(
                (stats) => stats.teamLeaderId === teamLeader.uid
              );

              return (
                <div key={teamLeader.uid} className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                  {/* Team Leader Card Header */}
                  <div className="p-6 border-b border-gray-100">
                    <button
                      onClick={() => onTeamLeaderClick(teamLeader.uid)}
                      className="w-full flex justify-between items-center group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                          <FiUser className="text-purple-600 text-xl" />
                        </div>
                        <div className="text-left">
                          <h2 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {teamLeader.name}
                          </h2>
                          <p className="text-sm text-gray-500">Team Leader</p>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-500 group-hover:text-purple-600 transition-colors">
                         {/*<span className="text-sm mr-2">View Supervisors</span>*/}
                        <FiChevronRight size={18} />
                      </div>
                    </button>
                  </div>

                  {/* Stats Filters */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatButton
                        active={selectedTeamLeaderId === teamLeader.uid && activeFilter === "assigned"}
                        icon={<FiClipboard className="text-blue-500" />}
                        label="Total Tasks"
                        count={teamLeaderStatistics?.numTasksAssigned || 0}
                        onClick={() => {
                          if (activeFilter === "assigned") clearFilter();
                          else filterAssignedTasks(teamLeader.uid);
                        }}
                        colorClass="bg-blue-50 border-blue-100 hover:border-blue-200"
                      />

                      <StatButton
                        active={selectedTeamLeaderId === teamLeader.uid && activeFilter === "pending"}
                        icon={<FiClock className="text-red-500" />}
                        label="Pending"
                        count={teamLeaderStatistics?.numTasksPending || 0}
                        onClick={() => {
                          if (activeFilter === "pending") clearFilter();
                          else filterTasks(teamLeader.uid, "pending");
                        }}
                        colorClass="bg-red-50 border-red-100 hover:border-red-200"
                      />

                      <StatButton
                        active={selectedTeamLeaderId === teamLeader.uid && activeFilter === "Work in Progress"}
                        icon={<FiClock className="text-amber-500" />}
                        label="In Progress"
                        count={teamLeaderStatistics?.numTasksInProgress || 0}
                        onClick={() => {
                          if (activeFilter === "Work in Progress") clearFilter();
                          else filterTasks(teamLeader.uid, "Work in Progress");
                        }}
                        colorClass="bg-amber-50 border-amber-100 hover:border-amber-200"
                      />

                      <StatButton
                        active={selectedTeamLeaderId === teamLeader.uid && activeFilter === "completed"}
                        icon={<FiCheckCircle className="text-green-500" />}
                        label="Completed"
                        count={teamLeaderStatistics?.numTasksCompleted || 0}
                        onClick={() => {
                          if (activeFilter === "completed") clearFilter();
                          else filterTasks(teamLeader.uid, "completed");
                        }}
                        colorClass="bg-green-50 border-green-100 hover:border-green-200"
                      />
                    </div>
                  </div>

                  {/* Tasks List */}
                  {selectedTeamLeaderId === teamLeader.uid && (
                    <div className="p-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {activeFilter === "assigned" ? "All Tasks" : `${activeFilter} Tasks`}
                        </h3>
                        <p className="text-gray-500">
                          {selectedTeamLeaderTasks.length} tasks found
                        </p>
                      </div>

                      {selectedTeamLeaderTasks.length > 0 ? (
                        <div className="space-y-4">
                          {selectedTeamLeaderTasks.map((task, index) => (
                            <TaskCard 
                              key={`${selectedTeamLeaderId}-${task.id || index}`}
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
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Team Leaders</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              There are currently no team leaders assigned in the system
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Stat Button Component
const StatButton = ({ active, icon, label, count, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center ${
      active ? "ring-2 ring-purple-200 bg-white" : colorClass
    }`}
  >
    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-xs">
      {icon}
    </div>
    <div className="text-sm text-gray-600">{label}</div>
    <div className="text-2xl font-bold text-gray-900 mt-1">{count}</div>
  </button>
);

// Reusable Task Card Component
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

export default TeamLeaderList;