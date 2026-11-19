import React, { useState, useEffect } from "react";
import { Container, Tabs, Tab, Spinner, Alert } from "react-bootstrap";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { countWarningsPerUser } from "../utils/adminHelpers";
import AdminOverview from "../components/AdminOverview";
import AdminUsersTable from "../components/AdminUsersTable";
import AdminGearsTable from "../components/AdminGearsTable";
import AdminRentalsTable from "../components/AdminRentalsTable";
import AdminWarningsList from "../components/AdminWarningsList";
import WarnModal from "../components/WarnModal";

const AdminDashboard = () => {
  const { user } = useAuth(); // used to hide the Delete button on the admin's own row
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [gears, setGears] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Warn modal: warnTarget = { userId, userName, gearId, gearTitle }, or null when the modal is closed
  const [warnTarget, setWarnTarget] = useState(null);
  const [warnMessage, setWarnMessage] = useState("");
  const [warnError, setWarnError] = useState("");
  const [warnSending, setWarnSending] = useState(false);

  // Load everything from the admin GET routes at the same time
  const loadData = async () => {
    try {
      const results = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/gears"),
        api.get("/admin/rentals"),
        api.get("/admin/warnings"),
      ]);
      setStats(results[0].data);
      setUsers(results[1].data);
      setGears(results[2].data);
      setRentals(results[3].data);
      setWarnings(results[4].data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load admin data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // One delete function for all three tables.
  // type = "users" | "gears" | "rentals"
  const handleDelete = async (type, id, message) => {
    if (!window.confirm(message)) return; // ask first
    try {
      await api.delete(`/admin/${type}/${id}`);
      loadData(); // refresh all the data (tables + stat cards)
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed"));
    }
  };

  // Block / unblock a user (the server toggles isBlocked)
  const handleToggleBlock = async (u) => {
    let text = `Block ${u.name}? They will not be able to log in or use the site.`;
    if (u.isBlocked) text = `Unblock ${u.name}?`;
    if (!window.confirm(text)) return;

    try {
      const res = await api.put(`/admin/users/${u._id}/block`);
      setSuccess(`${u.name} ${res.data.isBlocked ? "blocked" : "unblocked"}`);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the user"));
    }
  };

  // Open the warn modal (gearId/gearTitle are only given from the Gears tab)
  const openWarn = (userId, userName, gearId, gearTitle) => {
    setWarnTarget({ userId, userName, gearId, gearTitle });
    setWarnMessage("");
    setWarnError("");
  };

  // Validate the message, then send the warning to the server
  const sendWarning = async () => {
    if (warnMessage.trim().length < 5) {
      setWarnError("Message must be at least 5 characters");
      return;
    }
    setWarnSending(true);
    try {
      await api.post("/admin/warnings", {
        userId: warnTarget.userId,
        message: warnMessage,
        gearId: warnTarget.gearId || undefined,
      });
      setSuccess(`Warning sent to ${warnTarget.userName}`);
      setWarnTarget(null); // close the modal
      loadData(); // refresh warning counts
    } catch (err) {
      setWarnError(getErrorMessage(err, "Could not send warning"));
    } finally {
      setWarnSending(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="fw-bold mb-4">Admin Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Tabs defaultActiveKey="overview" className="mb-4">
        <Tab eventKey="overview" title="Overview">
          {stats && <AdminOverview stats={stats} />}
        </Tab>

        <Tab eventKey="users" title={`Users (${users.length})`}>
          <AdminUsersTable
            users={users}
            currentUserId={user.id}
            warningCount={countWarningsPerUser(warnings)}
            onWarn={openWarn}
            onToggleBlock={handleToggleBlock}
            onDelete={handleDelete}
          />
        </Tab>

        <Tab eventKey="gears" title={`Gears (${gears.length})`}>
          <AdminGearsTable gears={gears} currentUserId={user.id} onWarn={openWarn} onDelete={handleDelete} />
        </Tab>

        <Tab eventKey="rentals" title={`Rentals (${rentals.length})`}>
          <AdminRentalsTable rentals={rentals} onDelete={handleDelete} />
        </Tab>

        <Tab eventKey="warnings" title={`Warnings Sent (${warnings.length})`}>
          <AdminWarningsList warnings={warnings} />
        </Tab>
      </Tabs>

      <WarnModal
        warnTarget={warnTarget}
        message={warnMessage}
        onMessageChange={setWarnMessage}
        error={warnError}
        sending={warnSending}
        onSend={sendWarning}
        onClose={() => setWarnTarget(null)}
      />
    </Container>
  );
};

export default AdminDashboard;
