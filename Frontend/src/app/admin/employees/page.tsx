"use client";
import { useEffect, useState } from "react";
import { usersAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiUserX, FiUserCheck, FiSearch, FiX, FiUser } from "react-icons/fi";

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

  useEffect(() => {
    fetchEmployees();
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
      } else {
        await usersAPI.create(formData);
        toast.success("Employee created successfully");
      }
      setShowModal(false);
      resetForm();
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            <span className="gradient-text">Employee Management</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Manage all employee accounts and profiles
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
              <th>Role</th>
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
                  <span className={`badge ${emp.role === "admin" ? "badge-info" : "badge-success"}`}>
                    {emp.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${emp.isActive !== false ? "badge-success" : "badge-danger"}`}>
                    {emp.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
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

      {/* Create/Edit Modal */}
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
    </div>
  );
}
