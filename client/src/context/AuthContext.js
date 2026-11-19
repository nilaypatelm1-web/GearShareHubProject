import React, { createContext, useState, useContext } from "react";

const AuthContext = createContext();

// Wrap the whole app in this so any component can read/update login state
export const AuthProvider = ({ children }) => {
  // On first load, check if a user is already saved in localStorage (stay logged in on refresh)
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) return JSON.parse(savedUser);
    return null;
  });

  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  // Merge new details (e.g. after editing the profile) into the saved user,
  // so the Navbar and everything else shows the new values straight away
  const updateUser = (newData) => {
    setUser((prev) => {
      const updated = Object.assign({}, prev, newData);
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook so pages can just do: const { user, login, logout, updateUser } = useAuth();
export const useAuth = () => useContext(AuthContext);
