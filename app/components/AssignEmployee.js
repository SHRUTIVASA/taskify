import React, { useState, useEffect } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function AssignEmployee({
  supervisors,
  employees,
  onAssignEmployee,
}) {
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState([]);

  useEffect(() => {
    const fetchSupervisors = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "supervisors"));
        const supervisorsData = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        // Fetch all assigned employees from all supervisors
        const assignedEmployeesSet = new Set();
        for (const supervisor of supervisorsData) {
          if (supervisor.assigned && Array.isArray(supervisor.assigned)) {
            supervisor.assigned.forEach((uid) => assignedEmployeesSet.add(uid));
          }
        }
        setAssignedEmployees([...assignedEmployeesSet]);

        setErrorMessage("");
      } catch (error) {
        console.error("Error fetching supervisors:", error);
        setErrorMessage("Error fetching supervisors. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupervisors();
  }, []);

  const handleCheckboxChange = (value) => {
    setSelectedEmployees((prevSelectedEmployees) => {
      if (prevSelectedEmployees.includes(value)) {
        return prevSelectedEmployees.filter((uid) => uid !== value);
      } else {
        return [...prevSelectedEmployees, value];
      }
    });
  };

  const handleSubmit = () => {
    if (!selectedSupervisor) {
      setErrorMessage("Please select a supervisor.");
      setSuccessMessage("");
      return;
    }

    if (selectedEmployees.length === 0) {
      setErrorMessage("Please select at least one employee.");
      setSuccessMessage("");
      return;
    }

    // Check if any selected employee is already assigned to any supervisor
    const alreadyAssigned = selectedEmployees.some((uid) =>
      assignedEmployees.includes(uid)
    );
    if (alreadyAssigned) {
      setErrorMessage(
        "One or more selected employees are already assigned to a supervisor."
      );
      setSuccessMessage("");
      return;
    }

    // Call the onAssignEmployee callback with the selected supervisor UID and selected employee UIDs
    onAssignEmployee(selectedSupervisor, selectedEmployees);
    setSuccessMessage("Employees assigned successfully!");
    setErrorMessage("");
    setAssignedEmployees((prev) => [...prev, ...selectedEmployees]); // Update assigned employees
    setSelectedEmployees([]); // Clear selected employees
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Assign Employees to Supervisor</h2>
      
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-blue-600">Loading supervisors...</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="supervisor" className="block text-sm font-medium text-gray-700 mb-2">
          Select Supervisor
        </label>
        <select
          id="supervisor"
          value={selectedSupervisor}
          onChange={(e) => setSelectedSupervisor(e.target.value)}
          className="w-full p-2 border border-gray-300 text-gray-800 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a supervisor</option>
          {supervisors.map((supervisor) => (
            <option key={supervisor.uid} value={supervisor.uid}>
              {supervisor.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Select Employees</h3>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
          {employees.length > 0 ? (
            employees.map((employee) => (
              <div
                key={employee.uid}
                className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 ${
                  assignedEmployees.includes(employee.uid) ? "bg-gray-100" : ""
                }`}
              >
                <input
                  type="checkbox"
                  id={`employee-${employee.uid}`}
                  checked={selectedEmployees.includes(employee.uid)}
                  onChange={() => handleCheckboxChange(employee.uid)}
                  disabled={assignedEmployees.includes(employee.uid)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`employee-${employee.uid}`}
                  className={`ml-3 block text-sm font-medium ${
                    assignedEmployees.includes(employee.uid)
                      ? "text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {employee.name}
                  {assignedEmployees.includes(employee.uid) && (
                    <span className="text-xs text-gray-500 ml-2">(Already assigned)</span>
                  )}
                </label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No employees available</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedEmployees.length === 0 || !selectedSupervisor}
          className={`px-4 py-2 rounded-md text-white ${
            isLoading || selectedEmployees.length === 0 || !selectedSupervisor
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Processing..." : "Assign Employees"}
        </button>
      </div>
    </div>
  );
}