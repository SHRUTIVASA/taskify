import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "./contexts/AuthContext";

export default function PrivateRoute({ children, navigation }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!currentUser) {
    navigation.navigate("Login");
    return null;
  }

  return children;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
