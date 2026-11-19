import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Alert, Form, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";

// Checks the profile form. Returns the error text, or "" when it is fine.
const getProfileError = (profile) => {
  if (!profile.name.trim()) return "Name is required";
  const phone = profile.phone.trim();
  if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) {
    return "Phone must be 7-15 characters (digits, +, - or spaces)";
  }
  return "";
};

// Checks the change-password form. Returns the error text, or "" when it is fine.
const getPasswordError = (pwd) => {
  if (!pwd.oldPassword || !pwd.newPassword || !pwd.confirmPassword) return "Please fill in all password fields";
  if (pwd.newPassword.length < 6) return "New password must be at least 6 characters";
  if (pwd.newPassword === pwd.oldPassword) return "New password must be different from the old password";
  if (pwd.newPassword !== pwd.confirmPassword) return "New passwords do not match";
  return "";
};

// Profile tab: edit name / phone / city (email is read-only) + change password + delete account
const ProfileTab = ({ gearsCount, rentalsCount }) => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "", city: user?.city || "" });
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  // "Delete my account" (asks for the password in a modal)
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Older logins in localStorage don't have phone/city yet, so load the latest from the server once
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        setProfile({ name: res.data.name, phone: res.data.phone || "", city: res.data.city || "" });
        updateUser(res.data);
      } catch (err) {
        // not critical, the form just keeps the saved values
      }
    };
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copies the values and changes the one field that was typed in
  const handleProfileChange = (e) => {
    const newProfile = Object.assign({}, profile);
    newProfile[e.target.name] = e.target.value;
    setProfile(newProfile);
  };

  const handlePwdChange = (e) => {
    const newPwd = Object.assign({}, pwd);
    newPwd[e.target.name] = e.target.value;
    setPwd(newPwd);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });

    const problem = getProfileError(profile);
    if (problem) {
      setProfileMsg({ type: "danger", text: problem });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put("/auth/profile", profile);
      updateUser(res.data.user); // updates context + localStorage, so the Navbar name changes too
      setProfileMsg({ type: "success", text: "Profile updated successfully" });
    } catch (err) {
      setProfileMsg({ type: "danger", text: getErrorMessage(err, "Failed to update profile") });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: "", text: "" });

    const problem = getPasswordError(pwd);
    if (problem) {
      setPwdMsg({ type: "danger", text: problem });
      return;
    }

    setSavingPwd(true);
    try {
      const res = await api.put("/auth/change-password", {
        oldPassword: pwd.oldPassword,
        newPassword: pwd.newPassword,
      });
      setPwdMsg({ type: "success", text: res.data.message });
      setPwd({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwdMsg({ type: "danger", text: getErrorMessage(err, "Failed to change password") });
    } finally {
      setSavingPwd(false);
    }
  };

  const openDeleteModal = () => {
    setDeletePassword("");
    setDeleteError("");
    setShowDelete(true);
  };

  // The server checks the password and refuses if there is an active rental
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError("Please enter your password");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete("/auth/me", { data: { password: deletePassword } });
      logout(); // clears the token and the saved user
      navigate("/");
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete your account."));
      setDeleting(false);
    }
  };

  return (
    <>
    <Row className="mt-3">
      <Col md={6} className="mb-4">
        <Card className="hover-card h-100">
          <Card.Body>
            <Card.Title className="mb-3">My Profile</Card.Title>
            {profileMsg.text && <Alert variant={profileMsg.type}>{profileMsg.text}</Alert>}
            <Form onSubmit={handleSaveProfile}>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" name="name" value={profile.name} onChange={handleProfileChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={user?.email || ""} disabled readOnly />
                <Form.Text className="text-muted">Email cannot be changed.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="e.g. +91 98765 43210"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>City</Form.Label>
                <Form.Control
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleProfileChange}
                  placeholder="e.g. Surat"
                />
              </Form.Group>
              <Button type="submit" className="btn-accent" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </Form>
            <hr />
            <p className="mb-1"><strong>Gears Listed:</strong> {gearsCount}</p>
            <p className="mb-0"><strong>Total Rentals:</strong> {rentalsCount}</p>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} className="mb-4">
        <Card className="hover-card h-100">
          <Card.Body>
            <Card.Title className="mb-3">Change Password</Card.Title>
            {pwdMsg.text && <Alert variant={pwdMsg.type}>{pwdMsg.text}</Alert>}
            <Form onSubmit={handleChangePassword}>
              <Form.Group className="mb-3">
                <Form.Label>Old Password</Form.Label>
                <Form.Control type="password" name="oldPassword" value={pwd.oldPassword} onChange={handlePwdChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  name="newPassword"
                  value={pwd.newPassword}
                  onChange={handlePwdChange}
                  placeholder="At least 6 characters"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  value={pwd.confirmPassword}
                  onChange={handlePwdChange}
                />
              </Form.Group>
              <Button type="submit" className="btn-accent" disabled={savingPwd}>
                {savingPwd ? "Updating..." : "Change Password"}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>

      {/* Danger zone (admins cannot delete their account here) */}
      {user?.role !== "admin" && (
        <Col xs={12} className="mb-4">
          <Card className="hover-card danger-zone">
            <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <Card.Title className="mb-1">Danger zone</Card.Title>
                <p className="mb-0 small">
                  Permanently delete your account, your gears, rental requests, ratings and notifications.
                  This cannot be undone, and it is not possible while you have an active rental.
                </p>
              </div>
              <Button variant="danger" onClick={openDeleteModal}>
                Delete my account
              </Button>
            </Card.Body>
          </Card>
        </Col>
      )}
    </Row>

    <Modal show={showDelete} onHide={() => !deleting && setShowDelete(false)} centered>
      <Form onSubmit={handleDeleteAccount}>
        <Modal.Header closeButton={!deleting}>
          <Modal.Title>Delete my account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}
          <p>
            This will permanently delete your account, your gears (with their pictures and rentals), your rental
            requests, ratings, warnings and notifications. <strong>This cannot be undone.</strong>
          </p>
          <Form.Group>
            <Form.Label>Enter your password to confirm</Form.Label>
            <Form.Control
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={deleting} onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" disabled={deleting}>
            {deleting ? "Deleting..." : "Delete my account"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
    </>
  );
};

export default ProfileTab;
