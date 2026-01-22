"use client";

import { useState, useEffect, useWindowDimensions } from "react";
import { useAuth } from "../../AuthContext";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
import {
  collection,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  getDoc,
  writeBatch,
  query,
  where,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../firebase";
import SupervisorList from "../../components/SupervisorList";
import EmployeeList from "../../components/EmployeeList";
import UnitHeadList from "../../components/UnitHeadList";
import TeamLeaderList from "../../components/TeamLeaderList";
import HeadList from "../../components/HeadList";
import AssignEmployee from "../../components/AssignEmployee";
import AssignSupervisor from "../../components/AssignSupervisor";
import AssignTeamLeader from "../../components/AssignTeamLeader";
import AssignUnitHead from "../../components/AssignUnitHead";
import { FiMenu, FiX, FiPlus, FiUsers, FiLogOut, FiChevronDown, FiChevronUp, FiArrowLeft } from "react-icons/fi";
import { FiCalendar, FiBriefcase, FiFlag, FiClipboard, FiUser } from 'react-icons/fi';

import logo from '../../assets/Navbar_logo.png'
import Image from "next/image";
import Head from "next/head";

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [unitHeads, setUnitHeads] = useState([]);
  const [heads, setHeads] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAssignRolesOpen, setIsAssignRolesOpen] = useState(false);

  const [formData, setFormData] = useState({
    project: "",
    task: "",
    subtask: "",
    status: "",
    heads: [],
    unitheads: [],
    TeamLeaders: [],
    supervisors: [],
    employees: [],
    endDate: "",
    priority: "Select Priority",
    taskType: "Select Task Type",
  });

  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState(null);
  const [projectNames, setProjectNames] = useState([]);
  const [taskNames, setTaskNames] = useState([]);
  const [subtaskNames, setSubtaskNames] = useState([]);
  const [selectedSupervisorTasks, setSelectedSupervisorTasks] = useState([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
  const [showSupervisorBoxes, setShowSupervisorBoxes] = useState(false);
  const [selectedHeadTasks, setSelectedHeadTasks] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [numTasksCompleted, setNumTasksCompleted] = useState(0);
  const [numTasksPending, setNumTasksPending] = useState(0);
  const [numTasksAssigned, setNumTasksAssigned] = useState(0);
  const [numTasksinProgress, setNumTasksinProgress] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [selectedUnitHeadInfo, setSelectedUnitHeadInfo] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [showEmployeeBoxes, setShowEmployeeBoxes] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedUnitHeadId, setSelectedUnitHeadId] = useState(null);
  const [selectedUnitHeadTasks, setSelectedUnitHeadTasks] = useState([]);
  const [showUnitHeadList, setShowUnitHeadList] = useState(true);
  const [showTeamLeaderList, setShowTeamLeaderList] = useState(false);
  const [showSupervisorList, setShowSupervisorList] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [showUnitHeadBoxes, setShowUnitHeadBoxes] = useState(false);
  const [selectedHeadId, setSelectedHeadId] = useState(null);
  const [showHeadBoxes, setShowHeadBoxes] = useState(false);
  const [showHeadList, setShowHeadList] = useState(true);
  const [showEmployeeData, setShowEmployeeData] = useState(false);
  const [showHeads, setShowHeads] = useState(false);
  const [showUnitHeads, setShowUnitHeads] = useState(false);
  const [showTeamLeaders, setShowTeamLeaders] = useState(false);
  const [showSupervisors, setShowSupervisors] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [showAssignEmployee, setShowAssignEmployee] = useState(false);
  const [showAssignSupervisor, setShowAssignSupervisor] = useState(false);
  const [showAssignTeamleader, setShowAssignTeamleader] = useState(false);
  const [showAssignUnitHead, setShowAssignUnitHead] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState([]);
  const [filteredUnitHeads, setFilteredUnitHeads] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignRoles, setShowAssignRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const closeModal = () => setSelectedRole(null);

  const sortTasksByPriority = (taskA, taskB) => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
  };

  useEffect(() => {
    if (searchQuery) {
      setFilteredTasks(
        tasks.filter(
          (task) =>
            task.project &&
            task.project.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredTasks(tasks);
    }
  }, [searchQuery, tasks]);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    if (currentUser) {
      setUserData(currentUser);
    }
  }, [currentUser]);

  const onFilterTasks = (status) => {
    const filteredTasks = tasks.filter((task) => task.status === status);
    setFilteredTasks(filteredTasks);
  };

  const filterTasks = (status) => {
    onFilterTasks(status);
  };

  useEffect(() => {
    const fetchHeads = async () => {
      try {
        const HeadsCollectionRef = collection(db, "heads");
        const querySnapshot = await getDocs(HeadsCollectionRef);
        const HeadsData = querySnapshot.docs.map((doc) => {
          return { id: doc.id, ...doc.data() };
        });
        setHeads(HeadsData);
      } catch (err) {
        console.error("Fetch unit heads error", err);
      }
    };

    const fetchunitheads = async () => {
      try {
        const unitheadsCollectionRef = collection(db, "unitheads");
        const querySnapshot = await getDocs(unitheadsCollectionRef);
        const unitheadsData = querySnapshot.docs.map((doc) => {
          return { id: doc.id, ...doc.data() };
        });
        setUnitHeads(unitheadsData);
      } catch (err) {
        console.error("Fetch unit heads error", err);
      }
    };

    const fetchTeamLeaders = async () => {
      try {
        const TeamLeadersCollectionRef = collection(db, "teamleaders");
        const querySnapshot = await getDocs(TeamLeadersCollectionRef);
        const TeamLeadersData = querySnapshot.docs.map((doc) => {
          return { id: doc.id, ...doc.data() };
        });
        setTeamLeaders(TeamLeadersData);
      } catch (err) {
        console.error("Fetch team leaders error", err);
      }
    };

    const fetchSupervisors = async () => {
      try {
        const supervisorsCollectionRef = collection(db, "supervisors");
        const querySnapshot = await getDocs(supervisorsCollectionRef);
        const supervisorsData = querySnapshot.docs.map((doc) => {
          return { id: doc.id, ...doc.data() };
        });
        setSupervisors(supervisorsData);
      } catch (err) {
        console.error("Fetch supervisors error", err);
      }
    };

    const fetchEmployees = async () => {
      try {
        const employeesCollectionRef = collection(db, "employees");
        const querySnapshot = await getDocs(employeesCollectionRef);
        const employeesData = querySnapshot.docs.map((doc) => {
          return { id: doc.id, ...doc.data() };
        });
        setEmployees(employeesData);
      } catch (err) {
        console.error("Fetch employees error", err);
      }
    };

    fetchHeads();
    fetchunitheads();
    fetchTeamLeaders();
    fetchSupervisors();
    fetchEmployees();
  }, []);

  const handleInputChange = (name, value) => {
    if (
      name === "heads" ||
      name === "unitheads" ||
      name === "TeamLeaders" ||
      name === "supervisors" ||
      name === "employees"
    ) {
      const currentArray = formData[name] || [];
      if (currentArray.includes(value)) {
        setFormData({
          ...formData,
          [name]: formData[name].filter((item) => item !== value),
        });
      } else {
        setFormData({
          ...formData,
          [name]: [...formData[name], value],
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const fetchTasks = async () => {
    try {
      const HeadsDocRef = doc(db, "heads", currentUser.uid);
      const HeadsDocSnapshot = await getDoc(HeadsDocRef);

      if (HeadsDocSnapshot.exists()) {
        const HeadsDocData = HeadsDocSnapshot.data();
        const HeadsTasks = HeadsDocData.tasks || [];

        setTasks(HeadsTasks);

        const completedTasks = HeadsTasks.filter(
          (task) => task.status === "completed"
        ).length;
        const pendingTasks = HeadsTasks.filter(
          (task) => task.status === "pending"
        ).length;
        const inProgressTasks = HeadsTasks.filter(
          (task) => task.status === "Work in Progress"
        ).length;
        const assignedTasks = HeadsTasks.length;

        setNumTasksCompleted(completedTasks);
        setNumTasksPending(pendingTasks);
        setNumTasksAssigned(assignedTasks);
        setCompletedTasks(completedTasks);
        setPendingTasks(pendingTasks);
        setNumTasksinProgress(inProgressTasks);
      }
    } catch (err) {
      setError("Failed to fetch tasks");
      setTimeout(() => setError(""), 3000);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser]);

  const handleEmployeeClick = (employeeId) => {
    setSelectedEmployeeId(employeeId);
  };

  const fetchSupervisor = async (teamLeaderId) => {
    try {
      const teamLeaderDocRef = doc(db, "teamleaders", teamLeaderId);
      const teamLeaderDocSnapshot = await getDoc(teamLeaderDocRef);

      if (teamLeaderDocSnapshot.exists()) {
        const teamLeaderData = teamLeaderDocSnapshot.data();

        if (teamLeaderData.assigned && teamLeaderData.assigned.length > 0) {
          const supervisorUIDs = teamLeaderData.assigned;

          const supervisorsCollection = collection(db, "supervisors");
          const supervisorsSnapshot = await getDocs(supervisorsCollection);
          const supervisorsData = supervisorsSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((supervisor) => supervisorUIDs.includes(supervisor.uid));

          setSupervisors(supervisorsData);
        }
      }
    } catch (error) {
      setError("Failed to fetch supervisor: " + error.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchSupervisor(currentUser.uid);
    }
  }, [currentUser]);

  const fetchEmployee = async (supervisorId) => {
    try {
      const supervisorDocRef = doc(db, "supervisors", supervisorId);
      const supervisorDocSnapshot = await getDoc(supervisorDocRef);

      if (supervisorDocSnapshot.exists()) {
        const supervisorData = supervisorDocSnapshot.data();

        if (supervisorData.assigned && supervisorData.assigned.length > 0) {
          const employeeUIDs = supervisorData.assigned;

          const employeesCollection = collection(db, "employees");
          const employeesSnapshot = await getDocs(employeesCollection);
          const employeesData = employeesSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((employee) => employeeUIDs.includes(employee.uid));

          setEmployees(employeesData);
        }
      }
    } catch (error) {
      setError("Failed to fetch employees: " + error.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleFilterTasks = (filteredTasks) => {
    setSelectedSupervisorTasks(filteredTasks);
  };

  const handleAddTask = async (e) => {
    try {
      e.preventDefault();
  
      // Authentication Validation
      if (!currentUser) {
        setError("Please log in to assign tasks.");
        setTimeout(() => setError(""), 3000);
        setShowTaskForm(false);
        return;
      }
  
      // Authorization Validation
      if (currentUser.email !== "admin@123.com") {
        setError("You do not have the required permissions to assign tasks.");
        setTimeout(() => setError(""), 3000);
        setShowTaskForm(false);
        return;
      }
  
      // Required Field Validation
      const requiredFields = [
        formData.project,
        formData.task,
        formData.subtask,
        formData.endDate,
        formData.priority,
        formData.taskType,
      ];
  
      if (requiredFields.some((field) => !field || field === "Select Priority" || field === "Select Task Type")) {
        setError("All fields are compulsory.");
        setTimeout(() => setError(""), 3000);
        setShowTaskForm(false);
        setIsAssigning(false);
        return;
      }
  
      // Date Validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();
      const ISTOffset = 330;
      const ISTTime = new Date(now.getTime() + ISTOffset * 60 * 1000);
      const todayIST = new Date(ISTTime.setHours(0, 0, 0, 0));

      const selectedDate = new Date(formData.endDate);
      selectedDate.setHours(0, 0, 0, 0);
      
      // Compare dates
      if (selectedDate < todayIST) {
        setError("Due date cannot be in the past. Please select today or a future date.");
        setTimeout(() => setError(""), 3000);
        setIsAssigning(false);
        setShowTaskForm(false);
        return;
      }
  
      // Recipient Validation
      const recipientTypes = ['heads', 'unitheads', 'TeamLeaders', 'supervisors', 'employees'];
      const hasRecipients = recipientTypes.some(type => 
        formData[type] && formData[type].length > 0
      );
  
      if (!hasRecipients) {
        setError("Please select at least one recipient");
        setTimeout(() => setError(""), 3000);
        setShowTaskForm(false);
        return;
      }
  
      // Generate UUID
      const taskId = uuidv4();
  
      // Create the new task object
      const newTask = {
        taskId,
        project: formData.project.trim(),
        task: formData.task.trim(),
        subtask: formData.subtask.trim(),
        status: "pending",
        endDate: formData.endDate,
        priority: formData.priority.toLowerCase(),
        taskType: formData.taskType.toLowerCase(),
        lastReset: today.toISOString().split("T")[0],
      };
  
      // Array to store Firestore update operations
      const updates = [];
      const batch = writeBatch(db);
  
      // Process recipients by type
      const recipientMap = {
        heads: "heads",
        unitheads: "unitheads",
        TeamLeaders: "teamleaders",
        supervisors: "supervisors",
        employees: "employees"
      };
  
      for (const [formKey, collectionName] of Object.entries(recipientMap)) {
        if (formData[formKey]?.length > 0) {
          formData[formKey].forEach(uid => {
            const docRef = doc(db, collectionName, uid);
            batch.update(docRef, {
              tasks: arrayUnion(newTask),
              updatedAt: new Date().toISOString()
            });
          });
        }
      }
  
      // Execute all Firestore updates in a single batch
      await batch.commit();
  
      // Success handling
      setShowTaskForm(false);
      setSuccessMessage("Task assigned successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
  
      // Reset form with preserved type options
      setFormData({
        project: "",
        task: "",
        subtask: "",
        status: "pending",
        heads: [],
        unitheads: [],
        TeamLeaders: [],
        supervisors: [],
        employees: [],
        endDate: "",
        priority: "Select Priority",
        taskType: "Select Task Type",
      });
  
    } catch (error) {
      console.error("Error assigning task:", error);
      
      let errorMessage = "Failed to assign task. Please try again.";
      setShowTaskForm(false);
      if (error.code === "permission-denied") {
        errorMessage = "You don't have permission to perform this action.";
        setShowTaskForm(false);
      } else if (error.code === "resource-exhausted") {
        errorMessage = "Too many requests. Please try again later.";
        setShowTaskForm(false);
      }
  
      setError(errorMessage);
      setTimeout(() => setError(""), 3000);
      setShowTaskForm(false);
    }
  };

  const handleSupervisorClick = async (supervisorId) => {
    setSelectedSupervisorId(supervisorId);

    try {
      const supervisorDocRef = doc(db, "supervisors", supervisorId);
      const supervisorDocSnapshot = await getDoc(supervisorDocRef);

      if (supervisorDocSnapshot.exists()) {
        const supervisorData = supervisorDocSnapshot.data();
        setSelectedSupervisor(supervisorData);

        const assignedEmployeeUids = supervisorData.assigned || [];
        const employeesData = [];

        for (const employeeUid of assignedEmployeeUids) {
          const employeeDocRef = doc(db, "employees", employeeUid);
          const employeeDocSnapshot = await getDoc(employeeDocRef);

          if (employeeDocSnapshot.exists()) {
            employeesData.push(employeeDocSnapshot.data());
          }
        }

        setEmployees(employeesData);
        setShowEmployeeList(true);
      } else {
        console.log("Supervisor document does not exist.");
      }
    } catch (err) {
      setError("Failed to fetch supervisor's data: " + err.message);
      setTimeout(() => setError(""), 3000);
      console.error("Fetch supervisor data error", err);
    }
  };

  const toggleEmployeeBoxes = () => {
    setShowEmployeeBoxes(!showEmployeeBoxes);
  };

  const toggleEmployeeList = () => {
    setShowEmployeeList(!showEmployeeList);
  };

  useEffect(() => {
    if (currentUser) {
      currentUser.email = "admin@123.com";
    }
  }, [currentUser]);

  const handleLogout = async () => {
    setError("");
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      setError("Failed to log out");
      setTimeout(() => setError(""), 3000);
      console.error("Logout error", err);
    }
  };

  const fetchTeamLeader = async (unitHeadId) => {
    try {
      const unitHeadDocRef = doc(db, "unitheads", unitHeadId);
      const unitHeadDocSnapshot = await getDoc(unitHeadDocRef);

      if (unitHeadDocSnapshot.exists()) {
        const unitHeadData = unitHeadDocSnapshot.data();

        if (unitHeadData.assigned && unitHeadData.assigned.length > 0) {
          const teamLeaderUIDs = unitHeadData.assigned;

          const teamLeadersCollection = collection(db, "teamleaders");
          const teamLeadersSnapshot = await getDocs(teamLeadersCollection);
          const teamLeadersData = teamLeadersSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((teamLeader) => teamLeaderUIDs.includes(teamLeader.uid));

          setTeamLeaders(teamLeadersData);
        }
      }
    } catch (error) {
      setError("Failed to fetch team leader: " + error.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTeamLeader(currentUser.uid);
    }
  }, [currentUser]);

  const fetchUnitHead = async (headId) => {
    try {
      const headDocRef = doc(db, "heads", headId);
      const headDocSnapshot = await getDoc(headDocRef);

      if (headDocSnapshot.exists()) {
        const headData = headDocSnapshot.data();

        if (headData.assigned && headData.assigned.length > 0) {
          const unitHeadUIDs = headData.assigned;

          const unitHeadsCollection = collection(db, "unitheads");
          const unitHeadsSnapshot = await getDocs(unitHeadsCollection);
          const unitHeadsData = unitHeadsSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((unitHead) => unitHeadUIDs.includes(unitHead.uid));

          setUnitHeads(unitHeadsData);
        }
      }
    } catch (error) {
      setError("Failed to fetch unit heads: " + error.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  useEffect(() => {
    fetchUnitHead(currentUser.uid);
  }, []);

  const handleUnitHeadClick = async (unitHeadId, event) => {
    setSelectedUnitHeadId(unitHeadId);

    const selectedUnitHead = unitHeads.find(
      (unitHead) => unitHead.uid === unitHeadId
    );
    setSelectedUnitHeadInfo(selectedUnitHead);

    try {
      const unitHeadDocRef = doc(db, "unitheads", unitHeadId);
      const unitHeadDocSnapshot = await getDoc(unitHeadDocRef);

      if (unitHeadDocSnapshot.exists()) {
        const unitHeadData = unitHeadDocSnapshot.data();
        setSelectedUnitHeadTasks(unitHeadData.tasks || []);
      }
    } catch (err) {
      setError("Failed to fetch unit head's tasks: " + err.message);
      setTimeout(() => setError(""), 3000);
    }

    try {
      const unitHeadDocRef = doc(db, "unitheads", unitHeadId);
      const unitHeadDocSnapshot = await getDoc(unitHeadDocRef);

      if (unitHeadDocSnapshot.exists()) {
        const unitHeadData = unitHeadDocSnapshot.data();
        const assignedTeamLeaderUids = unitHeadData.assigned || [];

        const teamLeadersCollection = collection(db, "teamleaders");
        const teamLeadersQuery = query(
          teamLeadersCollection,
          where("uid", "in", assignedTeamLeaderUids)
        );
        const teamLeadersSnapshot = await getDocs(teamLeadersQuery);

        const teamLeadersData = teamLeadersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTeamLeaders(teamLeadersData);
      }
    } catch (err) {
      setError("Failed to fetch TeamLeaders: " + err.message);
      setTimeout(() => setError(""), 3000);
    }

    setShowTeamLeaderList(true);
    setShowUnitHeadList(false);
  };

  const toggleunitHeadBoxes = () => {
    setShowUnitHeadBoxes(!showUnitHeadBoxes);
  };

  const handleTeamLeaderClick = async (teamLeaderId, event) => {
    setSelectedTeamLeaderId(teamLeaderId);

    try {
      const teamLeaderDocRef = doc(db, "teamleaders", teamLeaderId);
      const teamLeaderDocSnapshot = await getDoc(teamLeaderDocRef);

      if (teamLeaderDocSnapshot.exists()) {
        const teamLeaderData = teamLeaderDocSnapshot.data();
        setSelectedTeamLeader(teamLeaderData);

        const supervisorUIDs = teamLeaderData.assigned || [];
        const supervisorsData = [];

        for (const supervisorUid of supervisorUIDs) {
          const supervisorDocRef = doc(db, "supervisors", supervisorUid);
          const supervisorDocSnapshot = await getDoc(supervisorDocRef);

          if (supervisorDocSnapshot.exists()) {
            supervisorsData.push(supervisorDocSnapshot.data());
          }
        }
        setSupervisors(supervisorsData);
        setShowSupervisorList(true);
      } else {
        console.log("Team Leader document does not exist.");
      }
    } catch (err) {
      setError("Failed to fetch Team Leader's tasks: " + err.message);
      setTimeout(() => setError(""), 3000);
    }
    setShowTeamLeaderList(false);
  };

  const toggleSupervisorBoxes = () => {
    setShowSupervisorBoxes(!showSupervisorBoxes);
  };

  const fetchHeads = async () => {
    try {
      const headsCollection = collection(db, "heads");
      const headsSnapshot = await getDocs(headsCollection);
      const headsData = headsSnapshot.docs.map((doc) => doc.data());

      setHeads(headsData);
    } catch (err) {
      setError("Failed to fetch heads: " + err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  useEffect(() => {
    fetchHeads();
  }, []);

  const handleHeadClick = async (headId, event) => {
    setSelectedHeadId(headId);

    try {
      const headDocRef = doc(db, "heads", headId);
      const headDocSnapshot = await getDoc(headDocRef);

      if (headDocSnapshot.exists()) {
        const headData = headDocSnapshot.data();
        const assignedUnitHeadUids = headData.assigned || [];

        if (assignedUnitHeadUids.length === 0) {
          setFilteredUnitHeads([]);
          setError("No unit head assigned to this head.");
          return;
        }

        const unitheadsCollection = collection(db, "unitheads");
        const unitheadsQuery = query(
          unitheadsCollection,
          where("uid", "in", assignedUnitHeadUids)
        );
        const unitheadsSnapshot = await getDocs(unitheadsQuery);

        const unitheadsData = unitheadsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUnitHeads(unitheadsData);
      }
    } catch (err) {
      setError("Failed to fetch Unit Heads: " + err.message);
      setTimeout(() => setError(""), 3000);
    }

    setShowHeadList(false);
    setShowUnitHeadList(true);
  };

  const toggleHeadBoxes = () => {
    setShowHeadBoxes(!showHeadBoxes);
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const updatedTasks = tasks.filter((task) => task.id !== taskId);

      setTasks(updatedTasks);

      const HeadDocRef = doc(db, "heads", currentUser.uid);
      await updateDoc(HeadDocRef, {
        tasks: updatedTasks,
      });

      setSuccessMessage("Task deleted successfully");
      setError("");
      setTimeout(() => {
        setSuccessMessage("");
      }, 1000);
      fetchTasks();
    } catch (err) {
      setError("Failed to delete task: " + err.message);
      console.error("Delete task error", err);
      setTimeout(() => {
        setSuccessMessage("");
      }, 1000);
    }
  };

  const handleShowEmployeeData = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setShowEmployeeData(true);
  };

  const onHeadClick = (headId, event) => {};

  const onUnitHeadClick = (unitHeadId, event) => {};

  const onTeamLeaderClick = (teamLeaderId, event) => {};

  const onSupervisorClick = (supervisorId, event) => {};

  const onEmployeeClick = (employeeId, event) => {};

  const handleHeadButtonClick = () => {
    setShowHeads(!showHeads);
    setShowUnitHeads(false);
    setShowTeamLeaders(false);
    setShowSupervisors(false);
    setShowEmployees(false);
  };

  const handleUnitHeadButtonClick = () => {
    setShowUnitHeads(!showUnitHeads);
    setShowHeads(false);
    setShowTeamLeaders(false);
    setShowSupervisors(false);
    setShowEmployees(false);
  };

  const handleTeamLeaderButtonClick = () => {
    setShowTeamLeaders(!showTeamLeaders);
    setShowHeads(false);
    setShowUnitHeads(false);
    setShowSupervisors(false);
    setShowEmployees(false);
  };

  const handleSupervisorButtonClick = () => {
    setShowSupervisors(!showSupervisors);
    setShowHeads(false);
    setShowUnitHeads(false);
    setShowTeamLeaders(false);
    setShowEmployees(false);
  };

  const handleEmployeeButtonClick = () => {
    setShowEmployees(!showEmployees);
    setShowHeads(false);
    setShowUnitHeads(false);
    setShowTeamLeaders(false);
    setShowSupervisors(false);
  };

  const handleAssignEmployee = async (selectedSupervisor, selectedEmployees) => {
    try {  
      const batch = writeBatch(db);
      
      for (const employeeId of selectedEmployees) {
        const employeeRef = doc(db, "employees", employeeId);
        
        batch.update(employeeRef, {
          boss: selectedSupervisor
        });
      }
  
      const supervisorRef = doc(db, "supervisors", selectedSupervisor);
      const supervisorDoc = await getDoc(supervisorRef);
      
      const currentAssigned = supervisorDoc.exists() 
        ? supervisorDoc.data().assigned || [] 
        : [];
      
      const updatedAssigned = [...new Set([...currentAssigned, ...selectedEmployees])];
      
      batch.update(supervisorRef, {
        assigned: updatedAssigned
      });
      await batch.commit();
  
      setShowAssignEmployee(false);
      setSuccessMessage("Employees assigned successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setError("");
      
    } catch (error) {
      console.error("Assignment error:", error);
      setError(`Failed to assign employees: ${error.message}`);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleAssignSupervisor = async (selectedTeamLeader, selectedSupervisors) => {
    try {
      const batch = writeBatch(db);
      
      for (const supervisorId of selectedSupervisors) {
        const supervisorRef = doc(db, "supervisors", supervisorId);
        
        batch.update(supervisorRef, {
          boss: selectedTeamLeader
        });
      }
  
      const teamLeaderRef = doc(db, "teamleaders", selectedTeamLeader);
      const teamLeaderDoc = await getDoc(teamLeaderRef);
      
      const currentAssigned = teamLeaderDoc.exists() 
        ? teamLeaderDoc.data().assigned || [] 
        : [];
      
      const updatedAssigned = [...new Set([...currentAssigned, ...selectedSupervisors])];
      
      batch.update(teamLeaderRef, {
        assigned: updatedAssigned
      });
  
      await batch.commit();
  
      setShowAssignSupervisor(false);
      setSuccessMessage("Supervisors assigned successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setError("");
      
    } catch (error) {
      console.error("Assignment error:", error);
      setError(`Failed to assign supervisors: ${error.message}`);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleAssignTeamLeader = async (selectedUnitHead, selectedTeamLeaders) => {
    try {
       const batch = writeBatch(db);
      
      for (const teamLeaderId of selectedTeamLeaders) {
        const teamLeaderRef = doc(db, "teamleaders", teamLeaderId);
        console.log(`Updating team leader ${teamLeaderId} with boss ${selectedUnitHead}`);
        
        batch.update(teamLeaderRef, {
          boss: selectedUnitHead
        });
      }
  
      const unitHeadRef = doc(db, "unitheads", selectedUnitHead);
      const unitHeadDoc = await getDoc(unitHeadRef);
      
      const currentAssigned = unitHeadDoc.exists() 
        ? unitHeadDoc.data().assigned || [] 
        : [];
      
      const updatedAssigned = [...new Set([...currentAssigned, ...selectedTeamLeaders])];
      
      batch.update(unitHeadRef, {
        assigned: updatedAssigned,
        updatedAt: new Date().toISOString()
      });
  
      await batch.commit();
  
      setShowAssignTeamleader(false);
      setSuccessMessage("Team Leaders assigned successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setError("");
      
    } catch (error) {
      console.error("Assignment error:", error);
      setError(`Failed to assign team leaders: ${error.message}`);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleAssignUnitHead = async (selectedHead, selectedUnitHeads) => {
    try {

      const batch = writeBatch(db);
      
      for (const unitHeadId of selectedUnitHeads) {
        const unitHeadRef = doc(db, "unitheads", unitHeadId);
        console.log(`Updating unit head ${unitHeadId} with boss ${selectedHead}`);
        
        batch.update(unitHeadRef, {
          boss: selectedHead
        });
      }
  
      const headRef = doc(db, "heads", selectedHead);
      const headDoc = await getDoc(headRef);
      
      const currentAssigned = headDoc.exists() 
        ? headDoc.data().assigned || [] 
        : [];
      
      const updatedAssigned = [...new Set([...currentAssigned, ...selectedUnitHeads])];
      
      batch.update(headRef, {
        assigned: updatedAssigned,
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
        
      setShowAssignUnitHead(false);
      setSuccessMessage("Unit Heads assigned successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setError("");
      
    } catch (error) {
      console.error("Assignment error:", error);
      setError(`Failed to assign unit heads: ${error.message}`);
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-25">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Image
                  className="h-25 w-auto"
                  src={logo}
                  alt="Company Logo"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <button
                onClick={() => setShowTaskForm(true)}
                className="text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <FiPlus className="mr-1" /> Assign Task
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsAssignRolesOpen(!isAssignRolesOpen)}
                  className="text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <FiUsers className="mr-1" /> Assign Roles
                  {isAssignRolesOpen ? (
                    <FiChevronUp className="ml-1" />
                  ) : (
                    <FiChevronDown className="ml-1" />
                  )}
                </button>

                {isAssignRolesOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsAssignRolesOpen(false);
                          setSelectedRole("employee");
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Assign Employees
                      </button>
                      <button
                        onClick={() => {
                          setIsAssignRolesOpen(false);
                          setSelectedRole("supervisor");
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Assign Supervisors
                      </button>
                      <button
                        onClick={() => {
                          setIsAssignRolesOpen(false);
                          setSelectedRole("teamLeader");
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Assign Team Leaders
                      </button>
                      <button
                        onClick={() => {
                          setIsAssignRolesOpen(false);
                          setSelectedRole("unitHead");
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Assign Unit Heads
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <FiLogOut className="mr-1" /> Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-800 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <FiX className="block h-6 w-6" />
                ) : (
                  <FiMenu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
              <button
                onClick={() => {
                  setShowTaskForm(true);
                  setIsMenuOpen(false);
                }}
                className="text-gray-800 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium flex items-center w-full"
              >
                <FiPlus className="mr-2" /> Assign Task
              </button>

              <div>
                <button
                  onClick={() => setIsAssignRolesOpen(!isAssignRolesOpen)}
                  className="text-gray-800 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium flex items-center justify-between w-full"
                >
                  <span className="flex items-center">
                    <FiUsers className="mr-2" /> Assign Roles
                  </span>
                  {isAssignRolesOpen ? (
                    <FiChevronUp className="ml-1" />
                  ) : (
                    <FiChevronDown className="ml-1" />
                  )}
                </button>

                {isAssignRolesOpen && (
                  <div className="pl-4">
                    <button
                      onClick={() => {
                        setIsAssignRolesOpen(false);
                        setIsMenuOpen(false);
                        setSelectedRole("employee");
                      }}
                      className="text-gray-800 hover:bg-gray-100 block px-3 py-2 rounded-md text-sm font-medium w-full text-left"
                    >
                      Assign Employees
                    </button>
                    <button
                      onClick={() => {
                        setIsAssignRolesOpen(false);
                        setIsMenuOpen(false);
                        setSelectedRole("supervisor");
                      }}
                      className="text-gray-800 hover:bg-gray-100 block px-3 py-2 rounded-md text-sm font-medium w-full text-left"
                    >
                      Assign Supervisors
                    </button>
                    <button
                      onClick={() => {
                        setIsAssignRolesOpen(false);
                        setIsMenuOpen(false);
                        setSelectedRole("teamLeader");
                      }}
                      className="text-gray-800 hover:bg-gray-100 block px-3 py-2 rounded-md text-sm font-medium w-full text-left"
                    >
                      Assign Team Leaders
                    </button>
                    <button
                      onClick={() => {
                        setIsAssignRolesOpen(false);
                        setIsMenuOpen(false);
                        setSelectedRole("unitHead");
                      }}
                      className="text-gray-800 hover:bg-gray-100 block px-3 py-2 rounded-md text-sm font-medium w-full text-left"
                    >
                      Assign Unit Heads
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="text-gray-800 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium flex items-center w-full"
              >
                <FiLogOut className="mr-2" /> Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Welcome back, {currentUser?.email}
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {showHeadList && (
            <div className="p-6">
              <HeadList
                heads={heads}
                onHeadClick={(headId, event) => handleHeadClick(headId, event)}
                onFilterTasks={handleFilterTasks}
              />
            </div>
          )}

          {showUnitHeadList && !showHeadList && (
            <div className="p-6">
              <UnitHeadList
                unitHeads={unitHeads}
                onUnitHeadClick={(unitHeadId, event) =>
                  handleUnitHeadClick(unitHeadId, event)
                }
                onFilterTasks={handleFilterTasks}
              />
              <button
              onClick={() => {
                setShowUnitHeadList(false);
                setShowHeadList(true);
              }}
              className="
                mt-4 
                px-4 py-2 
                flex items-center justify-center
                text-blue-600 hover:text-blue-800 
                bg-white hover:bg-gray-50
                border border-gray-200 hover:border-gray-300
                rounded-lg
                shadow-sm hover:shadow-md
                transition-all duration-200
                w-full sm:w-auto
                text-sm sm:text-base
              "
            >
              <FiArrowLeft className="mr-1 flex-shrink-0" /> 
              <span className="truncate">Back to Heads</span>
            </button>
            </div>
          )}

          {showTeamLeaderList && (
            <div className="p-6">
              <TeamLeaderList
                teamLeaders={teamLeaders}
                onFilterTasks={handleFilterTasks}
                onTeamLeaderClick={(teamLeaderId, event) =>
                  handleTeamLeaderClick(teamLeaderId, event)
                }
              />
              <button
                onClick={() => {
                  setShowTeamLeaderList(false);
                  setShowUnitHeadList(true);
                }}
                className="
                mt-4 
                px-4 py-2 
                flex items-center justify-center
                text-blue-600 hover:text-blue-800 
                bg-white hover:bg-gray-50
                border border-gray-200 hover:border-gray-300
                rounded-lg
                shadow-sm hover:shadow-md
                transition-all duration-200
                w-full sm:w-auto
                text-sm sm:text-base
              "
            >
              <FiArrowLeft className="mr-1 flex-shrink-0" /> 
              <span className="truncate">Back to Unit Heads</span>
            </button>
            </div>
          )}

          {showSupervisorList && !showEmployeeList && (
            <div className="p-6">
              <SupervisorList
                supervisors={supervisors}
                onFilterTasks={handleFilterTasks}
                onSupervisorClick={(supervisorId, event) =>
                  handleSupervisorClick(supervisorId, event)
                }
              />
              <button
                onClick={() => {
                  setShowSupervisorList(false);
                  setShowTeamLeaderList(true);
                }}
                className="
                mt-4 
                px-4 py-2 
                flex items-center justify-center
                text-blue-600 hover:text-blue-800 
                bg-white hover:bg-gray-50
                border border-gray-200 hover:border-gray-300
                rounded-lg
                shadow-sm hover:shadow-md
                transition-all duration-200
                w-full sm:w-auto
                text-sm sm:text-base
              "
            >
              <FiArrowLeft className="mr-1 flex-shrink-0" /> 
              <span className="truncate">Back to Team Leaders</span>
            </button>
            </div>
          )}

          {showEmployeeList && (
            <div className="p-6">
              <EmployeeList
                employees={employees}
                onFilterTasks={filterTasks}
                onEmployeeClick={handleEmployeeClick}
              />
              <button
                onClick={() => {
                  setShowEmployeeList(false);
                  setShowSupervisorList(true);
                }}
                className="
                mt-4 
                px-4 py-2 
                flex items-center justify-center
                text-blue-600 hover:text-blue-800 
                bg-white hover:bg-gray-50
                border border-gray-200 hover:border-gray-300
                rounded-lg
                shadow-sm hover:shadow-md
                transition-all duration-200
                w-full sm:w-auto
                text-sm sm:text-base
              "
            >
              <FiArrowLeft className="mr-1 flex-shrink-0" /> 
              <span className="truncate">Back to Supervisors</span>
            </button>
            </div>
          )}
        </div>
      </div>

      {/* Assign Task Modal */}
      {showTaskForm && (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
  style={{ 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(1px)'
  }}
>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center border-b border-gray-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assign New Task</h2>
            <p className="text-sm text-gray-500 mt-1">Create and delegate tasks to your team members</p>
          </div>
              <button
                onClick={() => setShowTaskForm(false)}
                className="text-gray-700 hover:text-gray-500 transition-colors duration-200"
              >
                <FiX size={24} />
              </button>
            </div>
        {/* Form Body */}
        <div className="p-6 space-y-6">
        {/* Project Name */}
              <div className="space-y-2">
                   <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <FiBriefcase className="mr-2 text-blue-500" />
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={formData.project}
                    onChange={(e) => handleInputChange("project", e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
              placeholder="Enter Project Name"
                  />
                </div>

                {/* Task Details */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
<label className="block text-sm font-medium text-gray-700 flex items-center">
                <FiClipboard className="mr-2 text-blue-500" />
                Task Name
              </label>
                  <input
                    type="text"
                    value={formData.task}
                    onChange={(e) => handleInputChange("task", e.target.value)}
                className="block w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
                placeholder="Enter Task Name"
                  />
                </div>

                <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <FiClipboard className="mr-2 text-blue-500" />
                Subtask
              </label>
                  <input
                    type="text"
                    value={formData.subtask}
                    onChange={(e) => handleInputChange("subtask", e.target.value)}
                className="block w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
                placeholder="Enter Subtask Name"
                  />
                </div>
                </div>

{/* Date and Priority */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <FiCalendar className="mr-2 text-blue-500" />
                Due Date
              </label>
              <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="block w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none"
                  >
                    {formData.endDate || "Select End Date"}
                  </button>
                  {showDatePicker && (
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        handleInputChange("endDate", e.target.value)
                      }
                      className="text-gray-700 mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
                </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <FiFlag className="mr-2 text-blue-500" />
                Priority Level
              </label>
              <div className="relative">
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange("priority", e.target.value)}
                   className="block w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none">
                    <option value="">Select Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Task Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Task Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                  <select
                    value={formData.taskType}
                    onChange={(e) => handleInputChange("taskType", e.target.value)}
                    className="px-4 py-3 border border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <option value="">Select Task Type</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                </div>

                <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FiUser className="mr-2 text-blue-500" />
              Assign To:
            </label>
 <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Heads</h4>
                    <div className="space-y-2">
                      {heads.map((head) => (
                        <div key={head.uid} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`head-${head.uid}`}
                            checked={formData.heads.includes(head.uid)}
                            onChange={() => handleInputChange("heads", head.uid)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`head-${head.uid}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {head.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Unit Heads</h4>
                    <div className="space-y-2">
                      {unitHeads.map((unithead) => (
                        <div key={unithead.uid} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`unithead-${unithead.uid}`}
                            checked={formData.unitheads.includes(unithead.uid)}
                            onChange={() =>
                              handleInputChange("unitheads", unithead.uid)
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`unithead-${unithead.uid}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {unithead.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Team Leaders</h4>
                    <div className="space-y-2">
                      {teamLeaders.map((TeamLeader) => (
                        <div key={TeamLeader.uid} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`teamleader-${TeamLeader.uid}`}
                            checked={formData.TeamLeaders.includes(TeamLeader.uid)}
                            onChange={() =>
                              handleInputChange("TeamLeaders", TeamLeader.uid)
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`teamleader-${TeamLeader.uid}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {TeamLeader.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Supervisors</h4>
                    <div className="space-y-2">
                      {supervisors.map((supervisor) => (
                        <div key={supervisor.uid} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`supervisor-${supervisor.uid}`}
                            checked={formData.supervisors.includes(supervisor.uid)}
                            onChange={() =>
                              handleInputChange("supervisors", supervisor.uid)
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`supervisor-${supervisor.uid}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {supervisor.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Employees</h4>
                    <div className="space-y-2">
                      {employees.map((employee) => (
                        <div key={employee.uid} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`employee-${employee.uid}`}
                            checked={formData.employees.includes(employee.uid)}
                            onChange={() =>
                              handleInputChange("employees", employee.uid)
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`employee-${employee.uid}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {employee.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
              <button
                type="button"
                onClick={handleAddTask}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      <Modal
        visible={selectedRole === "employee"}
        onClose={() => setSelectedRole(null)}
        title="Assign Employees"
      >
        <AssignEmployee
          supervisors={supervisors}
          employees={employees}
          onAssignEmployee={handleAssignEmployee}
          onClose={() => setSelectedRole(null)}
        />
      </Modal>

      {/* Assign Supervisor Modal */}
      <Modal
        visible={selectedRole === "supervisor"}
        onClose={() => setSelectedRole(null)}
        title="Assign Supervisors"
      >
        <AssignSupervisor
          teamLeaders={teamLeaders}
          supervisors={supervisors}
          onAssignSupervisor={handleAssignSupervisor}
          onClose={() => setSelectedRole(null)}
        />
      </Modal>

      {/* Assign Team Leader Modal */}
      <Modal
        visible={selectedRole === "teamLeader"}
        onClose={() => setSelectedRole(null)}
        title="Assign Team Leaders"
      >
        <AssignTeamLeader
          teamLeaders={teamLeaders}
          unitHeads={unitHeads}
          onAssignTeamLeader={handleAssignTeamLeader}
          onClose={() => setSelectedRole(null)}
        />
      </Modal>

      {/* Assign Unit Head Modal */}
      <Modal
        visible={selectedRole === "unitHead"}
        onClose={() => setSelectedRole(null)}
        title="Assign Unit Heads"
      >
        <AssignUnitHead
          unitHeads={unitHeads}
          onAssignUnitHead={handleAssignUnitHead}
          onClose={() => setSelectedRole(null)}
        />
      </Modal>
    </div>
  );
}

// Reusable Modal Component
function Modal({ visible, onClose, title, children }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
    style={{ 
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(1px)'
    }}
  >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}