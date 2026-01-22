import React, { useState, useEffect } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function AssignSupervisor({ supervisors, onAssignSupervisor }) {
  const [selectedTeamleader, setSelectedTeamleader] = useState("");
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assignedSupervisors, setAssignedSupervisors] = useState([]);

  useEffect(() => {
    const fetchTeamleaders = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "teamleaders"));
        const teamleadersData = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        setTeamLeaders(teamleadersData);

        // Fetch all assigned supervisors from all team leaders
        const assignedSupervisorsSet = new Set();
        for (const teamLeader of teamleadersData) {
          if (teamLeader.assigned && Array.isArray(teamLeader.assigned)) {
            teamLeader.assigned.forEach((uid) =>
              assignedSupervisorsSet.add(uid)
            );
          }
        }
        setAssignedSupervisors([...assignedSupervisorsSet]);

        setErrorMessage("");
      } catch (error) {
        console.error("Error fetching teamleaders:", error);
        setErrorMessage("Error fetching teamleaders. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamleaders();
  }, []);

  const handleCheckboxChange = (value) => {
    setSelectedSupervisors((prevSelectedSupervisors) => {
      if (prevSelectedSupervisors.includes(value)) {
        return prevSelectedSupervisors.filter((uid) => uid !== value);
      } else {
        return [...prevSelectedSupervisors, value];
      }
    });
  };

  const handleSubmit = () => {
    if (!selectedTeamleader) {
      setErrorMessage("Please select a teamleader.");
      setSuccessMessage("");
      return;
    }

    if (selectedSupervisors.length === 0) {
      setErrorMessage("Please select at least one supervisor.");
      setSuccessMessage("");
      return;
    }

    // Check if any selected supervisor is already assigned to any team leader
    const alreadyAssigned = selectedSupervisors.some((uid) =>
      assignedSupervisors.includes(uid)
    );
    if (alreadyAssigned) {
      setErrorMessage(
        "One or more selected supervisors are already assigned to a teamleader."
      );
      setSuccessMessage("");
      return;
    }

    // Call the onAssignSupervisor callback with the selected team leader UID and selected supervisor UIDs
    onAssignSupervisor(selectedTeamleader, selectedSupervisors);
    setSuccessMessage("Supervisors assigned successfully!");
    setErrorMessage("");
    setAssignedSupervisors((prev) => [...prev, ...selectedSupervisors]);
    setSelectedSupervisors([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Assign Supervisors to Teamleader</h2>
      
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-blue-600">Loading team leaders...</p>
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
        <label htmlFor="teamleader" className="block text-sm font-medium text-gray-700 mb-2">
          Select Teamleader
        </label>
        <select
          id="teamleader"
          value={selectedTeamleader}
          onChange={(e) => {
            setSelectedTeamleader(e.target.value);
            setErrorMessage("");
          }}
          className="w-full p-2 border border-gray-300 text-gray-800 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a Teamleader</option>
          {teamLeaders.map((teamLeader) => (
            <option key={teamLeader.uid} value={teamLeader.uid}>
              {teamLeader.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Select Supervisors</h3>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
          {supervisors.length > 0 ? (
            supervisors.map((supervisor) => (
              <div
                key={supervisor.uid}
                className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 ${
                  assignedSupervisors.includes(supervisor.uid) ? "bg-gray-100" : ""
                }`}
              >
                <input
                  type="checkbox"
                  id={`supervisor-${supervisor.uid}`}
                  checked={selectedSupervisors.includes(supervisor.uid)}
                  onChange={() => handleCheckboxChange(supervisor.uid)}
                  disabled={assignedSupervisors.includes(supervisor.uid)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`supervisor-${supervisor.uid}`}
                  className={`ml-3 block text-sm font-medium ${
                    assignedSupervisors.includes(supervisor.uid)
                      ? "text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {supervisor.name}
                  {assignedSupervisors.includes(supervisor.uid) && (
                    <span className="text-xs text-gray-500 ml-2">(Already assigned)</span>
                  )}
                </label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No supervisors available</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedSupervisors.length === 0 || !selectedTeamleader}
          className={`px-4 py-2 rounded-md text-white ${
            isLoading || selectedSupervisors.length === 0 || !selectedTeamleader
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Processing..." : "Assign Supervisors"}
        </button>
      </div>
    </div>
  );
}