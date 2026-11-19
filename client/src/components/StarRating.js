import React, { useState } from "react";

// Shows a rating as stars, e.g. ★★★★☆ 4.2 (5). Reused in GearList, GearDetail and the admin table.
// rating = average (0-5), count = number of ratings (optional)
// Interactive mode: <StarRating interactive value={3} onChange={(n) => ...} /> lets the user click a star.
const StarRating = ({ rating = 0, count, interactive = false, value = 0, onChange, disabled = false }) => {
  const [hover, setHover] = useState(0); // star under the mouse (interactive mode only)

  // "1 star", "2 stars" ... (used for the screen-reader label)
  const starLabel = (n) => {
    if (n > 1) return `${n} stars`;
    return `${n} star`;
  };

  // click on a star: tell the parent (does nothing when the stars are disabled)
  const handleClick = (n) => {
    if (disabled) return;
    if (onChange) onChange(n);
  };

  // mouse over a star: preview it (does nothing when the stars are disabled)
  const handleEnter = (n) => {
    if (!disabled) setHover(n);
  };

  // Clickable 1-5 stars
  if (interactive) {
    const shown = hover || value; // preview on hover, otherwise the saved value
    let cursor = "pointer";
    if (disabled) cursor = "default";
    return (
      <span style={{ fontSize: "1.8rem", cursor: cursor }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            role="button"
            aria-label={starLabel(n)}
            onClick={() => handleClick(n)}
            onMouseEnter={() => handleEnter(n)}
            onMouseLeave={() => setHover(0)}
            style={{ color: n <= shown ? "#f5b301" : "#c5cad6" }}
          >
            ★
          </span>
        ))}
      </span>
    );
  }

  const filled = Math.round(rating); // 4.3 -> 4 filled stars

  // No ratings yet: show a short message instead of empty stars
  if (count === 0) {
    return <small className="section-description">No ratings yet</small>;
  }

  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= filled ? "#f5b301" : "#c5cad6" }}>
          ★
        </span>
      ))}
      {count !== undefined && (
        <small className="ms-2 text-muted">
          {rating} ({count})
        </small>
      )}
    </span>
  );
};

export default StarRating;
