import { useState, useMemo, memo } from "react";
// import { doc, ... } removed - no direct fetching needed here anymore
import {
  FiLoader,
  FiChevronDown,
  FiCalendar,
  FiFlag,
  FiClipboard,
  FiCheckCircle,
  FiClock,
  FiZap,
  FiTrendingUp,
  FiRefreshCw,
  FiEdit2,
  FiX,
  FiCheck,
  FiMessageSquare,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Wrapped in memo to prevent re-renders when parent state changes but task data hasn't
const TaskRow = memo(({ task, onChangeStatus, userRole, currentUser, allHeadsData = [] }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showChangeStatusOptions, setShowChangeStatusOptions] = useState(false);
  // Removed internal loadingHeads state as data is now passed via props
  const [workInProgressNote, setWorkInProgressNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const workInProgressNotes = task.workInProgressNotes || [];
  const hasActiveNotes = workInProgressNotes.some(note => !note.completed);
  const allNotesCompleted = workInProgressNotes.length > 0 && workInProgressNotes.every(note => note.completed);
  const isCompleted = task.status.toLowerCase() === 'completed';
  const isPending = task.status.toLowerCase() === 'pending';

  const handleChangeStatusClick = () => {
    if (task.status.toLowerCase() === 'completed' && !canChangeCompletedStatus) {
      return;
    }
    
    if (!isUpdating) {
      setShowChangeStatusOptions(!showChangeStatusOptions);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    
    if (newStatus.toLowerCase() === "work in progress" && workInProgressNotes.length === 0) {
      setShowNoteInput(true);
      setShowChangeStatusOptions(false);
      setIsUpdating(false);
      return;
    }
    
    // We pass the full task object context if needed by the parent's optimized updater
    await onChangeStatus(task.taskId, newStatus.toLowerCase(), task);
    setIsUpdating(false);
    setShowChangeStatusOptions(false);
  };

  const canChangeCompletedStatus = userRole === 'Head';

  const statusOptions = ["Pending", "Work in Progress", "Completed"].filter(
    (status) => status.toLowerCase() !== task.status.toLowerCase()
  );

  const priorityData = {
    high: {
      color: "text-red-600",
      bg: "bg-red-50",
      icon: <FiZap className="text-red-500" />,
    },
    medium: {
      color: "text-amber-600",
      bg: "bg-amber-50",
      icon: <FiTrendingUp className="text-amber-500" />,
    },
    low: {
      color: "text-green-600",
      bg: "bg-green-50",
      icon: <FiCheckCircle className="text-green-500" />,
    },
  };

  const statusData = {
    pending: {
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      icon: <FiClock className="text-yellow-500" />,
    },
    "work in progress": {
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: <FiLoader className="text-blue-500 animate-spin" />,
    },
    completed: {
      color: "text-green-600",
      bg: "bg-green-50",
      icon: <FiCheckCircle className="text-green-500" />,
    },
  };

  // OPTIMIZATION: Calculate head names from props instead of fetching from DB
  const headNames = useMemo(() => {
    if (!allHeadsData || allHeadsData.length === 0) return [];
    const names = [];
    allHeadsData.forEach((headData) => {
      if (headData.tasks && headData.tasks.some(t => t.taskId === task.taskId)) {
        names.push(headData.name);
      }
    });
    return names;
  }, [allHeadsData, task.taskId]);

  const formatHeadNames = () => {
    // loading state removed as data is immediate
    if (headNames.length === 0) return "your head";
    if (headNames.length === 1) return headNames[0];
    if (headNames.length === 2) return `${headNames[0]} or ${headNames[1]}`;
    return `${headNames.slice(0, -1).join(', ')} or ${headNames[headNames.length - 1]}`;
  };

  const formatDateTime = (firebaseDate) => {
    if (!firebaseDate) return '';
    const date = firebaseDate.toDate ? firebaseDate.toDate() : new Date(firebaseDate);
    if (isNaN(date.getTime())) return '';
  
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
  
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  // Helper to handle note updates via the parent status change function to maintain single source of truth
  const updateTaskNotes = async (newNotes) => {
    const updatedTask = {
      ...task,
      workInProgressNotes: newNotes,
    };
    // We treat note updates as a status update to trigger the DB transaction in parent
    await onChangeStatus(task.taskId, task.status, updatedTask);
  };

  const handleAddNote = async () => {
    if (!workInProgressNote.trim()) {
      setShowNoteInput(false);
      return;
    }

    setIsUpdating(true);
    try {
      const newNote = {
        id: Date.now().toString(),
        text: workInProgressNote,
        addedBy: currentUser?.displayName || currentUser?.email || "Unknown User",
        addedAt: new Date(),
        completed: false
      };

      const updatedNotes = [...workInProgressNotes, newNote];
      const updatedTask = {
        ...task,
        workInProgressNotes: updatedNotes,
      };

      // Ensure we switch to work in progress when adding a note
      await onChangeStatus(task.taskId, "work in progress", updatedTask);
      
      setWorkInProgressNote("");
      setShowNoteInput(false);
    } catch (error) {
      console.error("Error adding work in progress note:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEditedNote = async () => {
    if (!editingNoteText.trim()) return;

    setIsUpdating(true);
    try {
      const updatedNotes = workInProgressNotes.map(note => 
        note.id === editingNoteId 
          ? { 
              ...note, 
              text: editingNoteText, 
              lastEdited: new Date(),
              editedBy: currentUser?.name || currentUser?.email || "Unknown"
            } 
          : note
      );
      await updateTaskNotes(updatedNotes);
      setEditingNoteId(null);
      setEditingNoteText("");
    } catch (error) {
      console.error("Error editing note:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteNote = async (noteId) => {
    setIsUpdating(true);
    try {
      const updatedNotes = workInProgressNotes.map(note => 
        note.id === noteId 
          ? { 
              ...note, 
              completed: true,
              completedBy: currentUser?.displayName || currentUser?.email || "Unknown User",
              completedAt: new Date()
            } 
          : note
      );
      await updateTaskNotes(updatedNotes);
      if (updatedNotes.every(note => note.completed)) {
        setShowChangeStatusOptions(true);
      }
    } catch (error) {
      console.error("Error completing note:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to remove this note? You'll need to add a new note if you want to keep the status as 'Work in Progress'.")) {
      return;
    }

    setIsUpdating(true);
    try {
      const updatedNotes = workInProgressNotes.filter(note => note.id !== noteId);
      const updatedTask = {
        ...task,
        workInProgressNotes: updatedNotes.length > 0 ? updatedNotes : [],
      };

      // If no notes left, revert to pending, otherwise keep current status
      const nextStatus = updatedNotes.length === 0 ? "pending" : task.status;
      await onChangeStatus(task.taskId, nextStatus, updatedTask);

    } catch (error) {
      console.error("Error removing work in progress note:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentPriority = priorityData[task.priority] || priorityData.low;
  const currentStatus = statusData[task.status.toLowerCase()] || statusData.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        p-6 mb-6 bg-white rounded-xl 
        border border-gray-100
        transition-all duration-300
        shadow-sm hover:shadow-md
      `}
    >
      {/* Main Task Information Group */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Project and Task Group */}
        <div className="space-y-3 p-3 rounded-lg">
          <div className="flex items-start space-x-3">
            <div
              className={`p-2.5 rounded-lg ${currentPriority.bg} ${currentPriority.color} shadow-xs`}
            >
              <FiClipboard size={18} />
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Project
              </h3>
              <p className="text-gray-800 font-medium mt-1 text-sm">
                {task.project}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 shadow-xs">
              <FiCheckCircle size={18} />
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Task Details
              </h3>
              <div className="mt-1">
                <p className="text-gray-800 font-medium text-sm">{task.task}</p>
                {task.subtask && (
                  <p className="text-gray-600 text-xs mt-1">
                    <span className="font-medium">Subtask:</span> {task.subtask}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Priority and Due Date Group */}
        <div className="space-y-3 p-3 rounded-lg">
          <div className="flex items-start space-x-3">
            <div
              className={`p-2.5 rounded-lg ${currentPriority.bg} ${currentPriority.color} shadow-xs`}
            >
              <FiFlag size={18} />
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Priority
              </h3>
              <div className="flex items-center mt-1 space-x-2">
                {currentPriority.icon}
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${currentPriority.bg} ${currentPriority.color}`}
                >
                  {task.priority}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2">
            <div className="p-2.5 rounded-lg bg-cyan-50 text-cyan-600 shadow-xs">
              <FiCalendar size={18} />
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Due Date
              </h3>
              <p className="text-gray-800 font-medium mt-1 text-sm">
                {task.endDate}
              </p>
            </div>
          </div>
        </div>

        {/* Status Group */}
        <div className="space-y-3 p-3 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-3">
            {/* Status icon and label */}
            <div className="flex items-start space-x-3 mb-2 sm:mb-0">
              <div className={`p-2.5 rounded-lg ${currentStatus.bg} ${currentStatus.color} shadow-xs`}>
                <FiCheckCircle size={18} />
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </h3>
                <div className="flex items-center mt-1 space-x-2">
                  {currentStatus.icon}
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${currentStatus.bg} ${currentStatus.color}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            </div>
        
            {/* Status change info */}
            <div className="text-xs text-gray-500 sm:mt-1">
              <div>
                Status changed by: {task.statusChangedBy} on {formatDateTime(task.statusChangedDate)}
              </div>
              {task.status === "completed" && task.completedBy && (
                <div className="mt-1 sm:mt-0">
                  Completed by: {task.completedBy} on {formatDateTime(task.completedDate)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Work in Progress Notes Section */}
      {workInProgressNotes.length > 0 && !isCompleted && (
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <FiMessageSquare className="text-blue-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-700">Work in Progress Notes</h4>
          </div>
          <div className="space-y-3">
            {workInProgressNotes.map((note, index) => (
              <div key={note.id} className={`bg-blue-50 rounded-lg p-3 border ${
                note.completed ? 'border-green-200' : 'border-blue-100'
              }`}>
                {editingNoteId === note.id ? (
                  <div>
                    <textarea
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className="w-full p-2 border border-gray-300 text-gray-700 rounded-md text-sm mb-2"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEditedNote}
                        className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center text-xs text-gray-500 mb-1 gap-1">
                        <span className="font-medium">Note #{index + 1}</span>
                        <span className="mx-1">•</span>
                        {note.completed ? (
                          <span className="text-green-600">Completed</span>
                        ) : (
                          <span>Active</span>
                        )}
                        <span className="mx-1">•</span>
                        <span className="truncate">by {note.addedBy}</span>
                        <span className="mx-1">•</span>
                        <span>on {formatDateTime(note.addedAt)}</span>
                        {note.completedAt && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="text-green-600">
                              (Completed on {formatDateTime(note.completedAt)})
                            </span>
                          </>
                        )}
                      </div>
                      <p className={`text-sm break-words ${
                        note.completed ? 'text-gray-500 line-through' : 'text-gray-800'
                      }`}>
                        {note.text}
                      </p>
                    </div>
                    <div className="flex sm:flex-col justify-end gap-1 sm:gap-0.5">
                      {!note.completed && (
                        <>
                          <button
                            onClick={() => handleCompleteNote(note.id)}
                            className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-50"
                            disabled={isUpdating}
                          >
                            <FiCheck size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteText(note.text);
                            }}
                            className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                            disabled={isUpdating}
                          >
                            <FiEdit2 size={16} />
                          </button>
                        </>
                      )}
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleRemoveNote(note.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          disabled={isUpdating}
                        >
                          <FiX size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Another Note or Change Status Section */}
      {allNotesCompleted &&  !isCompleted && !isPending &&(
        <div className="mb-4 flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNoteInput(true)}
              className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Add Another Work in Progress Note
            </button>
            <span className="text-sm text-gray-500">or</span>
          </div>
        </div>
      )}

      {/* Note Input (shown when adding new note) */}
      {showNoteInput && !isCompleted && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center mb-2">
              <FiEdit2 className="text-blue-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">Add Work in Progress Note</h4>
            </div>
            <textarea
              value={workInProgressNote}
              onChange={(e) => setWorkInProgressNote(e.target.value)}
              placeholder="Describe what work is in progress..."
              className="w-full p-2 border border-gray-300 text-gray-700 rounded-md text-sm mb-2"
              rows={3}
              disabled={isUpdating}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNoteInput(false);
                  setWorkInProgressNote("");
                }}
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={isUpdating || !workInProgressNote.trim()}
                className={`px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors ${
                  isUpdating || !workInProgressNote.trim() ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isUpdating ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Update Button */}
      <div className="relative w-full max-w-md">
      {isCompleted && !canChangeCompletedStatus ? (
          <div className="px-5 py-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center space-x-4 text-red-600">
              <div className="p-2 rounded-md bg-red-100 text-red-500">
                <FiCheckCircle size={18} />
              </div>
              <span className="text-sm font-medium">
                Task is already completed. To change status contact {formatHeadNames()}
              </span>
            </div>
          </div>
        ) : hasActiveNotes ? (
          <div className="px-5 py-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center space-x-4 text-blue-600">
              <div className="p-2 rounded-md bg-blue-100 text-blue-500">
                <FiLoader className="animate-spin" size={18} />
              </div>
              <span className="text-sm font-medium">
                Active work in progress notes present
              </span>
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{
              backgroundColor: "#f9fafb",
              boxShadow: "0 2px 8px rgba(118, 189, 208, 0.84)",
            }}
            whileTap={{ scale: 0.98 }}
            onClick={handleChangeStatusClick}
            disabled={isUpdating}
            className={`
              relative px-5 py-3 rounded-lg
              font-medium text-gray-700
              transition-all duration-200 ease-out
              flex items-center justify-between
              w-full
              border border-blue-200
              bg-white
              ${isUpdating ? "cursor-wait" : "cursor-pointer"}
            `}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-md ${
                  isUpdating
                    ? "bg-blue-50 text-blue-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {isUpdating ? (
                  <FiLoader className="animate-spin" size={18} />
                ) : (
                  <FiRefreshCw size={18} />
                )}
              </div>
              <span className="text-sm font-medium">
                Update Status
              </span>
            </div>

            {!isUpdating && (
              <FiChevronDown
                size={18}
                className={`text-blue-400 transition-transform ${
                  showChangeStatusOptions ? "rotate-180" : ""
                }`}
              />
            )}
          </motion.button>
        )}

        {/* Status Options Dropdown */}
        <AnimatePresence>
          {showChangeStatusOptions && !isUpdating && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-md border border-gray-100"
            >
              {statusOptions.map((status, index) => (
                <div key={status}>
                  {index > 0 && (
                    <div className="border-t border-gray-100 mx-3"></div>
                  )}
                  <button
                    onClick={() => handleStatusChange(status)}
                    className="w-full px-4 py-3 flex items-center space-x-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div
                      className={`p-1.5 rounded-md ${
                        status === "Pending"
                          ? "text-amber-500 bg-amber-50"
                          : status === "Work in Progress"
                          ? "text-blue-500 bg-blue-50"
                          : "text-emerald-500 bg-emerald-50"
                      }`}
                    >
                      {status === "Pending" && <FiClock size={16} />}
                      {status === "Work in Progress" && (
                        <FiLoader className="animate-spin" size={16} />
                      )}
                      {status === "Completed" && <FiCheckCircle size={16} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {status}
                    </span>
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default TaskRow;