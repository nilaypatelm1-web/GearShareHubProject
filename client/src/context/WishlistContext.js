import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext();

// Keeps the ids of the saved gears, so every heart button updates instantly.
// Must be placed INSIDE AuthProvider (it needs to know who is logged in).
export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user ? user.id : null;
  const [ids, setIds] = useState([]);

  // load the ids after login, clear them after logout
  useEffect(() => {
    if (!userId) {
      setIds([]);
      return;
    }
    let cancelled = false;
    api
      .get("/wishlist/ids")
      .then((res) => {
        if (!cancelled) setIds(res.data);
      })
      .catch(() => {}); // not critical: the hearts just stay empty
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isSaved = (gearId) => ids.includes(gearId);

  // Toggle one gear. The heart changes at once, and goes back if the server says no (the error is thrown to the caller).
  const toggleWishlist = async (gearId) => {
    const before = ids;
    setIds((prev) => {
      if (prev.includes(gearId)) return prev.filter((x) => x !== gearId);
      return prev.concat(gearId);
    });
    try {
      const res = await api.post(`/wishlist/${gearId}`);
      setIds(res.data); // the server's list is the truth
    } catch (err) {
      setIds(before);
      throw err;
    }
  };

  return <WishlistContext.Provider value={{ ids, isSaved, toggleWishlist }}>{children}</WishlistContext.Provider>;
};

// const { ids, isSaved, toggleWishlist } = useWishlist();
export const useWishlist = () => useContext(WishlistContext);
