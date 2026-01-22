import React, { useState, useEffect } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function AssignUnitHead({ unitHeads, onAssignUnitHead }) {
  const [selectedHead, setSelectedHead] = useState("");
  const [selectedUnitheads, setSelectedUnitheads] = useState([]);
  const [heads, setHeads] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assignedUnitheads, setAssignedUnitheads] = useState([]);

  useEffect(() => {
    const fetchHeads = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "heads"));
        const headsData = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        setHeads(headsData);

        // Fetch all assigned unit heads from all heads
        const assignedUnitheadsSet = new Set();
        for (const head of headsData) {
          if (head.assigned && Array.isArray(head.assigned)) {
            head.assigned.forEach((uid) => assignedUnitheadsSet.add(uid));
          }
        }
        setAssignedUnitheads([...assignedUnitheadsSet]);

        setErrorMessage("");
      } catch (error) {
        console.error("Error fetching heads:", error);
        setErrorMessage("Error fetching heads. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeads();
  }, []);

  const handleCheckboxChange = (value, isChecked) => {
    setSelectedUnitheads((prevSelectedUnitheads) => {
      if (isChecked) {
        // Add to selected unitheads
        if (!prevSelectedUnitheads.includes(value)) {
          return [...prevSelectedUnitheads, value];
        }
      } else {
        // Remove from selected unitheads
        return prevSelectedUnitheads.filter((uid) => uid !== value);
      }
      return prevSelectedUnitheads;
    });
  };

  const handleSubmit = async () => {
    if (!selectedHead) {
      setErrorMessage("Please select a head.");
      setSuccessMessage("");
      return;
    }

    if (selectedUnitheads.length === 0) {
      setErrorMessage("Please select at least one unithead.");
      setSuccessMessage("");
      return;
    }

    // Check if any selected unit head is already assigned to any head
    const alreadyAssigned = selectedUnitheads.some((uid) =>
      assignedUnitheads.includes(uid)
    );
    if (alreadyAssigned) {
      setErrorMessage(
        "One or more selected unit heads are already assigned to a head."
      );
      setSuccessMessage("");
      return;
    }

    // Call the onAssignUnitHead callback with the selected head UID and selected unithead UIDs
    onAssignUnitHead(selectedHead, selectedUnitheads);
    setSuccessMessage("Unit heads assigned successfully!");
    setErrorMessage("");
    setAssignedUnitheads((prev) => [...prev, ...selectedUnitheads]);
    setSelectedUnitheads([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Assign Unit Heads to Head</h2>
      
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-blue-600">Loading heads...</p>
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
        <label htmlFor="head" className="block text-sm font-medium text-gray-700 mb-2">
          Select Head
        </label>
        <select
          id="head"
          value={selectedHead}
          onChange={(e) => {
            setSelectedHead(e.target.value);
            setErrorMessage("");
          }}
          className="w-full p-2 border border-gray-300 text-gray-800 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a Head</option>
          {heads.map((head) => (
            <option key={head.uid} value={head.uid}>
              {head.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Select Unit Heads</h3>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
          {unitHeads.length > 0 ? (
            unitHeads.map((unithead) => (
              <div
                key={unithead.uid}
                className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 ${
                  assignedUnitheads.includes(unithead.uid) ? "bg-gray-100" : ""
                }`}
              >
                <input
                  type="checkbox"
                  id={`unithead-${unithead.uid}`}
                  checked={selectedUnitheads.includes(unithead.uid)}
                  onChange={(e) => handleCheckboxChange(unithead.uid, e.target.checked)}
                  disabled={assignedUnitheads.includes(unithead.uid)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`unithead-${unithead.uid}`}
                  className={`ml-3 block text-sm font-medium ${
                    assignedUnitheads.includes(unithead.uid)
                      ? "text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {unithead.name}
                  {assignedUnitheads.includes(unithead.uid) && (
                    <span className="text-xs text-gray-500 ml-2">(Already assigned)</span>
                  )}
                </label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No unit heads available</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedUnitheads.length === 0 || !selectedHead}
          className={`px-4 py-2 rounded-md text-white ${
            isLoading || selectedUnitheads.length === 0 || !selectedHead
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Processing..." : "Assign Unit Heads"}
        </button>
      </div>
    </div>
  );
}