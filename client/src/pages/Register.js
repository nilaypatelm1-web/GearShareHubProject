import React, { useState } from "react";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import api, { getErrorMessage, resendVerificationEmail } from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false); // true -> show the "check your email" screen
  const [resendMsg, setResendMsg] = useState("");
  const [resending, setResending] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Copies the form values and changes the one field that was typed in
  const handleChange = (e) => {
    const newData = Object.assign({}, formData);
    newData[e.target.name] = e.target.value;
    setFormData(newData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register", formData);
      if (res.data.needsVerification) {
        // email verification is ON: no login yet, the user must open the link in the email first
        setCheckEmail(true);
      } else {
        login(res.data.user, res.data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMsg("");
    setResending(true);
    const message = await resendVerificationEmail(formData.email);
    setResendMsg(message);
    setResending(false);
  };

  // Success screen after registering (verification switched on)
  if (checkEmail) {
    return (
      <Container className="d-flex justify-content-center py-5">
        <Card className="auth-card p-4 text-center" style={{ maxWidth: "420px", width: "100%" }}>
          <div style={{ fontSize: "3rem" }}>📧</div>
          <h2 className="mb-2 fw-bold">Check your email to verify your account</h2>
          <p className="text-muted">
            We sent a verification link to <strong>{formData.email}</strong>. Click it to activate your account (valid for 24 hours).
          </p>
          <Button as={Link} to="/login" className="btn-accent w-100 mb-3" size="lg">
            Go to Login
          </Button>
          <Button variant="link" onClick={handleResend} disabled={resending}>
            {resending ? "Sending..." : "Didn't get it? Resend verification email"}
          </Button>
          {resendMsg && <div className="small text-success mt-1">{resendMsg}</div>}
        </Card>
      </Container>
    );
  }

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card className="auth-card p-4" style={{ maxWidth: "420px", width: "100%" }}>
        <h2 className="mb-1 text-center fw-bold">Create Account</h2>
        <p className="text-muted text-center mb-4">Join GearShareHub to rent or share gear</p>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
            />
          </Form.Group>

          <Button type="submit" className="btn-accent w-100" size="lg" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </Button>
        </Form>

        <p className="text-center mt-3 mb-0">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </Card>
    </Container>
  );
};

export default Register;
