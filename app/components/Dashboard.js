import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "./contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { v4 as uuidv4 } from "uuid";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [taskFormData, setTaskFormData] = useState({
    project: "",
    task: "",
    subtask: "",
    members: "",
    endDate: "",
    priority: "low",
  });
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        if (userDocSnapshot.exists()) {
          setTasks(userDocSnapshot.data().tasks || []);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    };
    if (currentUser) fetchTasks();
  }, [currentUser]);

  const handleAddTask = async () => {
    if (taskFormData.project && taskFormData.task) {
      const newTask = { ...taskFormData, id: uuidv4(), status: "pending" };
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      await updateDoc(doc(db, "users", currentUser.uid), {
        tasks: updatedTasks,
      });
      setTaskFormData({
        project: "",
        task: "",
        subtask: "",
        members: "",
        endDate: "",
        priority: "low",
      });
    } else {
      Alert.alert("Error", "Please fill in the required fields.");
    }
  };

  const handleToggleStatus = async (taskId) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: task.status === "completed" ? "pending" : "completed",
          }
        : task
    );
    setTasks(updatedTasks);
    await updateDoc(doc(db, "users", currentUser.uid), { tasks: updatedTasks });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert("Error", "Failed to log out");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome, {currentUser.displayName}</Text>
      <TextInput
        style={styles.input}
        placeholder="Project"
        value={taskFormData.project}
        onChangeText={(text) =>
          setTaskFormData({ ...taskFormData, project: text })
        }
      />
      <TextInput
        style={styles.input}
        placeholder="Task"
        value={taskFormData.task}
        onChangeText={(text) =>
          setTaskFormData({ ...taskFormData, task: text })
        }
      />
      <Button title="Add Task" onPress={handleAddTask} />

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleToggleStatus(item.id)}
            style={styles.taskItem}
          >
            <Text style={styles.taskText}>{item.task}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </TouchableOpacity>
        )}
      />

      <Button title="Log Out" onPress={handleLogout} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 10,
    padding: 8,
  },
  taskItem: {
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  taskText: {
    fontSize: 18,
  },
  status: {
    fontSize: 14,
    color: "gray",
  },
});
