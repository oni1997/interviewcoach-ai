import { useState } from "react";
import { Link } from "react-router-dom";
import "../style/Auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // For now, this only displays a message.
    // Later, it will send the email to your Go backend.
    setMessage(
      "If an account exists with this email, you will receive a password reset link."
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h2>Forgot Password?</h2>

        <p>
          Enter your email address and we will help you reset your password.
        </p>

        <form onSubmit={handleSubmit}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">
            Reset Password
          </button>

        </form>

        {message && (
          <p className="success-message">
            {message}
          </p>
        )}

        <p>
          Remember your password?{" "}
          <Link to="/login">
            Back to Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default ForgotPassword;
