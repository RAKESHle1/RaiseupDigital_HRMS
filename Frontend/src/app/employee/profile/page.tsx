"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { authAPI, usersAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiUser, FiMail, FiPhone, FiBriefcase, FiCalendar, FiEdit2, FiCamera } from "react-icons/fi";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
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
      updateUser({ name: formData.name });
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
      fetchProfile();
    } catch (err) {
      toast.error("Failed to upload photo");
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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>
          <span className="gradient-text">My Profile</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          View and manage your personal information
        </p>
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
          <div style={{ marginLeft: "auto" }}>
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
      </div>
    </div>
  );
}
