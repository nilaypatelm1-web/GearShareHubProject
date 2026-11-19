import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

// Heart button. Filled red when saved. Hidden on your own gear.
// Logged out: clicking sends the visitor to the login page.
// inline = false -> floats on top of a card image, inline = true -> sits next to a title.
const WishlistButton = ({ gearId, ownerId, inline = false }) => {
  const { user } = useAuth();
  const { isSaved, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (user && ownerId && user.id === ownerId) return null; // you can't save your own gear

  const saved = user ? isSaved(gearId) : false;

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await toggleWishlist(gearId);
    } catch (err) {
      window.alert(getErrorMessage(err, "Could not update your wishlist."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`wish-btn ${inline ? "wish-inline" : ""} ${saved ? "saved" : ""}`}
      onClick={handleClick}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      {saved ? "♥" : "♡"}
    </button>
  );
};

export default WishlistButton;
