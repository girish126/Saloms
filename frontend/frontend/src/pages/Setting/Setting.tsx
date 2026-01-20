import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/image.jpg";
import Sidebar from "../../components/layout/Sidebar";

const Setting: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/login", { replace: true });
  };

  const handleGoBack = () => navigate(-1);

  return (
    <div className="min-vh-100 dashboard-theme theme-light">
      <style>{`
        :root {
          --accent: #1B5E20;
          --accent-contrast: #ffffff;
          --card-bg: #ffffff;
          --page-bg: rgba(25,135,84,0.06);
          --muted: #6C7A6C;
          --text: #1f2933;
          --border: #D4E5D8;
          --danger: #E53935;
          --nav-bg: #ffffff;
          --sidebar-bg: #ffffff;
          --sidebar-ink: #1f2933;
          --sidebar-border: #e6efe9;
        }

        .dashboard-theme {
          background: var(--page-bg);
          color: var(--text);
        }

        .navbar {
          background: var(--nav-bg) !important;
          border-bottom: 1px solid var(--border);
        }

        aside.col-12.col-md-auto {
          background: var(--sidebar-bg) !important;
          color: var(--sidebar-ink);
          border-right: 1px solid var(--sidebar-border);
        }

        .settings-section-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }
      `}</style>

      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg shadow-sm">
        <div className="container-fluid d-flex align-items-center">
          <img
            src={logo}
            alt="T S Informatics Logo"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              marginRight: 10,
              objectFit: "cover",
            }}
          />
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row gx-0">
          <Sidebar />

          <main className="col p-4">
            <div className="mb-3">
              <h3 className="mb-1">Settings</h3>
              <p className="text-muted small mb-0">
                Manage account options.
              </p>
            </div>

            <div className="row">
              <div className="col-12 col-md-8 col-lg-6">
                <div className="card shadow-sm border-0">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div
                        style={{
                          width: 4,
                          height: 28,
                          background: "var(--accent)",
                          borderRadius: 999,
                          marginRight: 10,
                        }}
                      />
                      <h5 className="mb-0 fw-semibold">Account</h5>
                    </div>

                    <button
                      className="btn btn-danger w-100 fw-semibold mb-3"
                      onClick={handleLogout}
                    >
                      Logout 📕
                    </button>

                    <div className="text-center">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handleGoBack}
                      >
                        ⬅ Go Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-none d-lg-block col-lg-6" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Setting;
