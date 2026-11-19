import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown, Badge, Button } from "react-bootstrap";
import api from "../api/axios";

const POLL_MS = 60 * 1000; // check for new notifications every 60 seconds

// Bell icon + red unread badge + dropdown with the latest notifications
const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      // not critical, try again on the next poll
    }
  };

  // load once, then again every 60 seconds
  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, POLL_MS);
    return () => clearInterval(timer); // stop polling when the navbar goes away (logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marks one notification as read in the list on the screen
  const markOneRead = (id) => {
    setNotifications((prev) => {
      const updated = [];
      for (const item of prev) {
        if (item._id === id) {
          updated.push(Object.assign({}, item, { isRead: true }));
        } else {
          updated.push(item);
        }
      }
      return updated;
    });
  };

  // Click a notification: mark it read, then open its link
  const handleClick = async (n) => {
    if (!n.isRead) {
      try {
        await api.put(`/notifications/${n._id}/read`);
        markOneRead(n._id);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        // still open the link even if marking failed
      }
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => {
        const updated = [];
        for (const item of prev) {
          updated.push(Object.assign({}, item, { isRead: true }));
        }
        return updated;
      });
      setUnreadCount(0);
    } catch (err) {
      // ignore
    }
  };

  let badgeText = unreadCount;
  if (unreadCount > 99) badgeText = "99+";

  return (
    <Dropdown align="end" onToggle={(open) => open && loadNotifications()}>
      <Dropdown.Toggle as="button" className="bell-toggle" id="notification-bell" aria-label="Notifications">
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <Badge bg="danger" pill className="bell-badge">
            {badgeText}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="bell-menu">
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <strong>Notifications</strong>
          <Button variant="link" size="sm" className="p-0" disabled={unreadCount === 0} onClick={handleMarkAll}>
            Mark all read
          </Button>
        </div>

        {notifications.length === 0 ? (
          <div className="px-3 py-3 text-muted small">No notifications yet.</div>
        ) : (
          <div className="bell-list">
            {notifications.map((n) => (
              <button
                key={n._id}
                type="button"
                className={`bell-item ${n.isRead ? "" : "unread"}`}
                onClick={() => handleClick(n)}
              >
                <div className="bell-message">{n.message}</div>
                <div className="bell-time">{new Date(n.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;
