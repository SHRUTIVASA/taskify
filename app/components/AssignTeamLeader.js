import React, { useState, useEffect } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function AssignTeamLeader({ teamLeaders, onAssignTeamLeader }) {
  const [selectedUnitHead, setSelectedUnitHead] = useState("");
  const [selectedTeamleaders, setSelectedTeamleaders] = useState([]);
  const [unitHeads, setUnitheads] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assignedTeamLeaders, setAssignedTeamLeaders] = useState([]);

  useEffect(() => {
    const fetchUnitheads = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "unitheads"));
        const unitheadsData = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        setUnitheads(unitheadsData);

        // Fetch all assigned team leaders from all unit heads
        const assignedTeamLeadersSet = new Set();
        for (const unithead of unitheadsData) {
          if (unithead.assigned && Array.isArray(unithead.assigned)) {
            unithead.assigned.forEach((uid) => assignedTeamLeadersSet.add(uid));
          }
        }
        setAssignedTeamLeaders([...assignedTeamLeadersSet]);

        setErrorMessage("");
      } catch (error) {
        console.error("Error fetching unitheads:", error);
        setErrorMessage("Error fetching unitheads. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnitheads();
  }, []);

  const handleCheckboxChange = (value) => {
    setSelectedTeamleaders((prevSelectedTeamleaders) => {
      if (prevSelectedTeamleaders.includes(value)) {
        return prevSelectedTeamleaders.filter((uid) => uid !== value);
      } else {
        return [...prevSelectedTeamleaders, value];
      }
    });
  };

  const handleSubmit = () => {
    if (!selectedUnitHead) {
      setErrorMessage("Please select a unithead.");
      setSuccessMessage("");
      return;
    }

    if (selectedTeamleaders.length === 0) {
      setErrorMessage("Please select at least one teamleader.");
      setSuccessMessage("");
      return;
    }

    // Check if any selected team leader is already assigned to any unit head
    const alreadyAssigned = selectedTeamleaders.some((uid) =>
      assignedTeamLeaders.includes(uid)
    );
    if (alreadyAssigned) {
      setErrorMessage(
        "One or more selected team leaders are already assigned to a unithead."
      );
      setSuccessMessage("");
      return;
    }

    // Call the onAssignTeamLeader callback with the selected unit head UID and selected teamleader UIDs
    onAssignTeamLeader(selectedUnitHead, selectedTeamleaders);
    setSuccessMessage("Team leaders assigned successfully!");
    setErrorMessage("");
    setAssignedTeamLeaders((prev) => [...prev, ...selectedTeamleaders]);
    setSelectedTeamleaders([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Assign Team Leaders to Unithead</h2>
      
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-blue-600">Loading unit heads...</p>
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
        <label htmlFor="unithead" className="block text-sm font-medium text-gray-700 mb-2">
          Select Unithead
        </label>
        <select
          id="unithead"
          value={selectedUnitHead}
          onChange={(e) => {
            setSelectedUnitHead(e.target.value);
            setErrorMessage("");
          }}
          className="w-full p-2 border border-gray-300 text-gray-800 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a Unithead</option>
          {unitHeads.map((unithead) => (
            <option key={unithead.uid} value={unithead.uid}>
              {unithead.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Select Team Leaders</h3>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
          {teamLeaders.length > 0 ? (
            teamLeaders.map((teamLeader) => (
              <div
                key={teamLeader.uid}
                className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 ${
                  assignedTeamLeaders.includes(teamLeader.uid) ? "bg-gray-100" : ""
                }`}
              >
                <input
                  type="checkbox"
                  id={`teamleader-${teamLeader.uid}`}
                  checked={selectedTeamleaders.includes(teamLeader.uid)}
                  onChange={() => handleCheckboxChange(teamLeader.uid)}
                  disabled={assignedTeamLeaders.includes(teamLeader.uid)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`teamleader-${teamLeader.uid}`}
                  className={`ml-3 block text-sm font-medium ${
                    assignedTeamLeaders.includes(teamLeader.uid)
                      ? "text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {teamLeader.name}
                  {assignedTeamLeaders.includes(teamLeader.uid) && (
                    <span className="text-xs text-gray-500 ml-2">(Already assigned)</span>
                  )}
                </label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No team leaders available</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedTeamleaders.length === 0 || !selectedUnitHead}
          className={`px-4 py-2 rounded-md text-white ${
            isLoading || selectedTeamleaders.length === 0 || !selectedUnitHead
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Processing..." : "Assign Team Leaders"}
        </button>
      </div>
    </div>
  );
}