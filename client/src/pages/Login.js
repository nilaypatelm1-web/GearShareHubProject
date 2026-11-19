import React, { useState } from "react";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import api, { getErrorMessage, resendVerificationEmail } from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false); // the server said "verify your email first"
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
    setNeedsVerify(false);
    setResendMsg("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", formData);
      login(res.data.user, res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
      if (err.response && err.response.data && err.response.data.needsVerification) {
        setNeedsVerify(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sends a new verification email for the typed address
  const handleResend = async () => {
    setResendMsg("");
    setResending(true);
    const message = await resendVerificationEmail(formData.email);
    setResendMsg(message);
    setResending(false);
  };

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card className="auth-card p-4" style={{ maxWidth: "420px", width: "100%" }}>
        <h2 className="mb-1 text-center fw-bold">Welcome Back</h2>
        <p className="text-muted text-center mb-4">Login to continue to GearShareHub</p>

        {error && <Alert variant="danger">{error}</Alert>}
        {needsVerify && (
          <div className="mb-3">
            <Button variant="outline-primary" size="sm" onClick={handleResend} disabled={resending}>
              {resending ? "Sending..." : "Resend verification email"}
            </Button>
            {resendMsg && <div className="small text-success mt-2">{resendMsg}</div>}
          </div>
        )}

        <Form onSubmit={handleSubmit}>
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

          <Form.Group className="mb-2">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
            />
          </Form.Group>

          <div className="text-end mb-4">
            <Link to="/forgot-password" className="small">Forgot password?</Link>
          </div>

          <Button type="submit" className="btn-accent w-100" size="lg" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Form>

        <p className="text-center mt-3 mb-0">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </Card>
    </Container>
  );
};

export default Login;
