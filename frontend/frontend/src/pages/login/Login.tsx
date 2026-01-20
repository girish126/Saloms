import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/image.jpg";
import sideImage from "../../assets/login-template.png";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const USERS = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "student", password: "student123", role: "student" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error("Please enter username and password");
      }

      const user = USERS.find(
        (u) => u.username === username && u.password === password
      );

      if (!user) throw new Error("Invalid username or password");

      localStorage.setItem("adminToken", "secure-token");
      localStorage.setItem("userRole", user.role);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        {/* Left image panel */}
        <div
          className="login-left"
          style={{
            backgroundImage: `url(${sideImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>

        {/* Right form panel */}
        <div className="login-right">
          <div className="text-center mb-3">
            <img src={logo} alt="Logo" className="login-logo" />
          </div>

          <h4 className="fw-bold mb-1">Sign in to your account</h4>
          <p className="text-muted mb-3">Welcome back 👋</p>

          {error && (
            <div className="alert alert-danger py-2 text-center">
              {error}

              
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <button
              className="btn btn-success w-100"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #7dd3c7, #4fb3a2);
          padding: 16px;
        }

        .login-box {
          width: 100%;
          max-width: 900px;
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .login-left {
          flex: 1;
          min-height: 500px;
          background: #e6f7f4;
        }

        .login-right {
          flex: 1;
          padding: 40px 36px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .login-logo {
          width: 70px;
          border-radius: 50%;
        }

        @media (max-width: 768px) {
          .login-box {
            flex-direction: column;
          }
          .login-left {
            height: 220px;
            min-height: unset;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
