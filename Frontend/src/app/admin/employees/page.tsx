"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { usersAPI, frsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiUserX, FiUserCheck, FiSearch, FiX, FiUser, FiCamera, FiCheckCircle, FiRefreshCw } from "react-icons/fi";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    employeeId: "", name: "", email: "", password: "",
    phone: "", department: "", designation: "",
    joiningDate: "", salary: 0, role: "employee",
  });

  // FRS Face Registration states
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceRegistering, setFaceRegistering] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [faceCaptureTarget, setFaceCaptureTarget] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await usersAPI.getAllIncludingInactive();
      setEmployees(res.data);
    } catch (err) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const { password, employeeId, ...updateData } = formData;
        await usersAPI.update(editingUser._id, updateData);
        toast.success("Employee updated successfully");
        setShowModal(false);
        resetForm();
      } else {
        const res = await usersAPI.create(formData);
        toast.success("Employee created successfully! Now let's register the face.");
        setShowModal(false);
        // Open face capture immediately for the new user
        const newUser = { 
          _id: res.data.id, 
          name: formData.name, 
          employeeId: formData.employeeId 
        };
        openFaceCapture(newUser);
        resetForm();
      }
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Operation failed");
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;
    try {
      await usersAPI.deactivate(id);
      toast.success("Employee deactivated");
      fetchEmployees();
    } catch (err) {
      toast.error("Failed to deactivate");
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await usersAPI.activate(id);
      toast.success("Employee activated");
      fetchEmployees();
    } catch (err) {
      toast.error("Failed to activate");
    }
  };

  const openEdit = (emp: any) => {
    setEditingUser(emp);
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email,
      password: "",
      phone: emp.phone || "",
      department: emp.department || "",
      designation: emp.designation || "",
      joiningDate: emp.joiningDate || "",
      salary: emp.salary || 0,
      role: emp.role,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      employeeId: "", name: "", email: "", password: "",
      phone: "", department: "", designation: "",
      joiningDate: "", salary: 0, role: "employee",
    });
  };

  // ─── Face Registration Camera ─────────────────────────
  const openFaceCapture = async (emp: any) => {
    setFaceCaptureTarget(emp);
    setFaceRegistered(false);
    setShowFaceCapture(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      // Need a small delay for the video element to render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      toast.error("Could not access camera");
      setShowFaceCapture(false);
    }
  };

  const closeFaceCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowFaceCapture(false);
    setFaceRegistering(false);
    setFaceRegistered(false);
    setFaceCaptureTarget(null);
  };

  const captureAndRegister = async () => {
    if (!videoRef.current || !canvasRef.current || !faceCaptureTarget) return;
    setFaceRegistering(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Failed to capture image");
        setFaceRegistering(false);
        return;
      }

      try {
        await frsAPI.register(faceCaptureTarget._id, blob);
        toast.success(`Face registered for ${faceCaptureTarget.name}`);
        setFaceRegistered(true);
        fetchEmployees();
      } catch (err: any) {
        const detail = err.response?.data?.detail || "Face registration failed";
        toast.error(detail);
      } finally {
        setFaceRegistering(false);
      }
    }, "image/jpeg", 0.9);
  };

  const filtered = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scan-line {
          0% { top: 0; }
          50% { top: calc(100% - 3px); }
          100% { top: 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            <span className="gradient-text">Employee Management</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Manage employee accounts, profiles & face registration
          </p>
        </div>
        <button
          className="gradient-btn"
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <FiPlus size={18} /> Add Employee
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, position: "relative", maxWidth: 400 }}>
        <FiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search by name, email, department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {/* Employees Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>ID</th>
              <th>Department</th>
              <th>Designation</th>
              <th>FRS</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp._id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {emp.profilePhoto ? (
                      <img src={emp.profilePhoto} alt={emp.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "white",
                      }}>
                        {emp.name?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-info">{emp.employeeId}</span></td>
                <td>{emp.department || "—"}</td>
                <td>{emp.designation || "—"}</td>
                <td>
                  {emp.faceRegistered ? (
                    <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <FiCheckCircle size={12} /> Registered
                    </span>
                  ) : (
                    <button
                      onClick={() => openFaceCapture(emp)}
                      style={{
                        background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                        borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                        color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 11, fontWeight: 600,
                      }}
                    >
                      <FiCamera size={12} /> Scan Face
                    </button>
                  )}
                </td>
                <td>
                  <span className={`badge ${emp.isActive !== false ? "badge-success" : "badge-danger"}`}>
                    {emp.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => openEdit(emp)}
                      style={{
                        background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                        borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                        color: "#818cf8", display: "flex", alignItems: "center", gap: 4,
                        fontSize: 12, fontWeight: 500,
                      }}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                    {emp.faceRegistered ? (
                      <button
                        onClick={() => openFaceCapture(emp)}
                        style={{
                          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)",
                          borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                          color: "#818cf8", display: "flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 500,
                        }}
                      >
                        <FiCamera size={14} />
                      </button>
                    ) : null}
                    {emp.isActive !== false ? (
                      <button
                        onClick={() => handleDeactivate(emp._id)}
                        style={{
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                          borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                          color: "#ef4444", display: "flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 500,
                        }}
                      >
                        <FiUserX size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(emp._id)}
                        style={{
                          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                          borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                          color: "#22c55e", display: "flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 500,
                        }}
                      >
                        <FiUserCheck size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No employees found</p>
        )}
      </div>

      {/* ─── Create/Edit Employee Modal ──────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                {editingUser ? "Edit Employee" : "Add New Employee"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Employee ID *</label>
                  <input className="input-field" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} required disabled={!!editingUser} placeholder="EMP002" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Full Name *</label>
                  <input className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="John Doe" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Email *</label>
                  <input className="input-field" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="john@hrms.com" />
                </div>
                {!editingUser && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Password *</label>
                    <input className="input-field" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="••••••••" />
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Phone</label>
                  <input className="input-field" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="1234567890" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Department</label>
                  <input className="input-field" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Engineering" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Designation</label>
                  <input className="input-field" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} placeholder="Software Engineer" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Joining Date</label>
                  <input className="input-field" type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Salary</label>
                  <input className="input-field" type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })} placeholder="50000" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Role</label>
                  <select className="input-field" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: "10px 24px", borderRadius: 10, border: "1px solid var(--border-color)",
                  background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500,
                }}>
                  Cancel
                </button>
                <button type="submit" className="gradient-btn">
                  {editingUser ? "Update" : "Create"} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Face Registration Modal ─────────────────────── */}
      {showFaceCapture && faceCaptureTarget && (
        <div className="modal-overlay" onClick={closeFaceCapture}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, padding: 0, overflow: "hidden", animation: "fadeInScale 0.3s ease" }}
          >
            {/* Header */}
            <div style={{ 
              padding: "20px 24px", 
              background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.08))",
              borderBottom: "1px solid var(--border-color)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <FiCamera size={18} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>Register Face — FRS</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {faceCaptureTarget.name} ({faceCaptureTarget.employeeId})
                  </p>
                </div>
              </div>
              <button onClick={closeFaceCapture} style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                color: "#ef4444", fontSize: 12, fontWeight: 600
              }}>
                ✕ Close
              </button>
            </div>

            {/* Camera Feed */}
            <div style={{ position: "relative", background: "#000", aspectRatio: "4/3" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Face Guide */}
              {!faceRegistered && !faceRegistering && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none"
                }}>
                  <div style={{
                    width: 180, height: 230, borderRadius: "50%",
                    border: "3px dashed rgba(34,197,94,0.5)",
                    boxShadow: "0 0 40px rgba(34,197,94,0.15)"
                  }} />
                </div>
              )}

              {/* Scanning overlay */}
              {faceRegistering && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 16
                }}>
                  <div style={{
                    position: "absolute", left: "10%", right: "10%",
                    height: 3, background: "linear-gradient(90deg, transparent, #22c55e, transparent)",
                    animation: "scan-line 1.5s ease-in-out infinite"
                  }} />
                  <div style={{
                    width: 50, height: 50, border: "3px solid rgba(34,197,94,0.3)",
                    borderTop: "3px solid #22c55e", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }} />
                  <p style={{ color: "white", fontSize: 16, fontWeight: 700, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                    Registering face...
                  </p>
                </div>
              )}

              {/* Success overlay */}
              {faceRegistered && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 12
                }}>
                  <FiCheckCircle size={64} color="#22c55e" />
                  <p style={{ color: "white", fontSize: 20, fontWeight: 700 }}>Face Registered!</p>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{faceCaptureTarget.name}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ 
              padding: "16px 24px", borderTop: "1px solid var(--border-color)",
              display: "flex", justifyContent: "center", gap: 12
            }}>
              {faceRegistered ? (
                <button
                  onClick={closeFaceCapture}
                  style={{
                    flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxShadow: "0 6px 20px rgba(34,197,94,0.3)",
                  }}
                >
                  <FiCheckCircle size={18} /> Done
                </button>
              ) : (
                <button
                  onClick={captureAndRegister}
                  disabled={faceRegistering}
                  style={{
                    flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                    background: faceRegistering 
                      ? "rgba(34,197,94,0.3)" 
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                    color: "white", fontSize: 15, fontWeight: 700,
                    cursor: faceRegistering ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxShadow: "0 6px 20px rgba(34,197,94,0.3)",
                  }}
                >
                  {faceRegistering ? (
                    <>
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Registering...
                    </>
                  ) : (
                    <>
                      <FiCamera size={18} /> Capture & Register Face
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
