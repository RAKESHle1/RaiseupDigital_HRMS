"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { authAPI, usersAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiUser, FiMail, FiPhone, FiBriefcase, FiCalendar, FiCamera, FiArrowLeft, FiLock } from "react-icons/fi";
import Modal from "react-modal";

export default function ProfilePage() {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [reEnterNewPassword, setReEnterNewPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    Modal.setAppElement("body");
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getMe();
      setProfile(res.data);
      setFormData(res.data);
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await usersAPI.update(profile._id, {
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        designation: formData.designation,
      });
      toast.success("Profile updated!");
      setProfile((prev: any) => ({ ...prev, ...formData }));
      updateUser({
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        designation: formData.designation,
      });
      setEditing(false);
      fetchProfile();
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await usersAPI.uploadPhoto(profile._id, file);
      toast.success("Photo updated!");
      updateUser({ profilePhoto: res.data.profilePhoto });
      setProfile((prev: any) => ({ ...prev, profilePhoto: res.data.profilePhoto }));
      fetchProfile();
    } catch (err) {
      toast.error("Failed to upload photo");
    }
  };

  const openPasswordModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setReEnterNewPassword("");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !reEnterNewPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    if (newPassword !== reEnterNewPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    try {
      await usersAPI.changePassword(profile._id, { currentPassword, newPassword });
      toast.success("Password changed successfully");
      closeModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const initials = profile?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div>
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "1px solid var(--border-color)",
            background: "rgba(99,102,241,0.08)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          title="Go back"
        >
          <FiArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            <span className="gradient-text">My Profile</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            View and manage your personal information
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 32 }}>
        {/* Photo + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            {profile?.profilePhoto ? (
              <img src={profile.profilePhoto} alt={profile.name} style={{
                width: 96, height: 96, borderRadius: 20, objectFit: "cover",
                border: "3px solid rgba(99,102,241,0.3)",
              }} />
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: 20,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, fontWeight: 800, color: "white",
              }}>
                {initials}
              </div>
            )}
            <label style={{
              position: "absolute", bottom: -4, right: -4,
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "2px solid var(--bg-secondary)",
            }}>
              <FiCamera size={14} color="white" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
            </label>
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{profile?.name}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{profile?.designation || "Employee"}</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{profile?.department}</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className={editing ? "" : "gradient-btn"}
              onClick={() => editing ? handleSave() : setEditing(true)}
              style={editing ? {
                padding: "10px 20px", borderRadius: 10,
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                border: "none", color: "white", cursor: "pointer", fontWeight: 600,
              } : {}}
            >
              {editing ? "Save Changes" : "Edit Profile"}
            </button>
            <button
              onClick={openPasswordModal}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.24)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FiLock size={15} />
              Change Password
            </button>
            {editing && (
              <button onClick={() => { setEditing(false); setFormData(profile); }} style={{
                marginLeft: 8, padding: "10px 20px", borderRadius: 10,
                background: "transparent", border: "1px solid var(--border-color)",
                color: "var(--text-secondary)", cursor: "pointer",
              }}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Profile Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            { label: "Employee ID", value: profile?.employeeId, icon: FiUser, key: "employeeId", editable: false },
            { label: "Full Name", value: profile?.name, icon: FiUser, key: "name", editable: true },
            { label: "Email", value: profile?.email, icon: FiMail, key: "email", editable: false },
            { label: "Phone", value: profile?.phone, icon: FiPhone, key: "phone", editable: true },
            { label: "Department", value: profile?.department, icon: FiBriefcase, key: "department", editable: true },
            { label: "Designation", value: profile?.designation, icon: FiBriefcase, key: "designation", editable: true },
            { label: "Joining Date", value: profile?.joiningDate, icon: FiCalendar, key: "joiningDate", editable: false },
            { label: "Role", value: profile?.role, icon: FiUser, key: "role", editable: false },
          ].map((field, i) => {
            const Icon = field.icon;
            return (
              <div key={i} style={{ padding: "16px 20px", background: "rgba(99,102,241,0.04)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Icon size={14} color="var(--text-muted)" />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{field.label}</p>
                </div>
                {editing && field.editable ? (
                  <input
                    className="input-field"
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  />
                ) : (
                  <p style={{ fontSize: 15, fontWeight: 500, textTransform: field.key === "role" ? "capitalize" : "none" }}>
                    {field.value || "—"}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <Modal
          isOpen={isModalOpen}
          onRequestClose={closeModal}
          contentLabel="Change Password"
          style={{
            overlay: {
              backgroundColor: "rgba(8, 11, 24, 0.82)",
              backdropFilter: "blur(4px)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
            content: {
              position: "relative",
              inset: "unset",
              width: "min(92vw, 460px)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 16,
              background: "linear-gradient(180deg, rgba(19,24,45,0.98), rgba(14,18,36,0.98))",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              padding: 24,
              overflow: "hidden",
            },
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>Change Password</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Use a strong password to secure your account.</p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
              aria-label="Close password modal"
            >
              X
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="currentPassword" style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Current Password</label>
              <input
                className="input-field"
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="newPassword" style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>New Password</label>
              <input
                className="input-field"
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="reEnterNewPassword" style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Re-enter New Password</label>
              <input
                className="input-field"
                type="password"
                id="reEnterNewPassword"
                value={reEnterNewPassword}
                onChange={(e) => setReEnterNewPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={closeModal} style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid var(--border-color)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
              }}>Cancel</button>
              <button type="submit" className="gradient-btn" style={{ padding: "10px 18px" }}>Update Password</button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
