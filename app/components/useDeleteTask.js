"use client"

import { useState } from "react";
import { doc, updateDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

export const useDeleteTask = () => {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const deleteTask = async (taskId, setTasks) => {
    try {
      if (!taskId) {
        throw new Error("Task ID is required");
      }

      // Define the collections to search for the task
      const collections = [
        "heads",
        "unitheads",
        "teamleaders",
        "supervisors",
        "employees",
      ];

      // Iterate through each collection
      for (const collectionName of collections) {
        // Get all documents in the collection
        const querySnapshot = await getDocs(collection(db, collectionName));

        // Iterate through each document in the collection
        for (const docSnapshot of querySnapshot.docs) {
          const userDocRef = doc(db, collectionName, docSnapshot.id);
          const userData = docSnapshot.data();
          const tasksArray = userData.tasks || [];

          // Check if the task exists in the document
          const taskExists = tasksArray.some((task) => task.taskId === taskId);
          if (taskExists) {
            // Remove the task from the array
            const updatedTasks = tasksArray.filter(
              (task) => task.taskId !== taskId
            );

            // Update Firestore
            await updateDoc(userDocRef, { tasks: updatedTasks });

            // Update local state if the current user's tasks are being displayed
            if (setTasks) {
              setTasks(updatedTasks);
            }
          }
        }
      }

      setSuccessMessage("Task deleted successfully from all collections");
      setError("");
      setTimeout(() => {
        setSuccessMessage("");
      }, 1000);
    } catch (err) {
      setError("Failed to delete task");
      console.error("Delete task error", err);
    }
  };

  return { deleteTask, error, successMessage };
};
