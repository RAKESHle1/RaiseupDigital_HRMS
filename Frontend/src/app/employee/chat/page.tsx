"use client";
import { useEffect, useState, useRef } from "react";
import { chatAPI, usersAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import { FiSend, FiPlus, FiUsers, FiMessageCircle, FiSearch, FiX, FiPhone, FiVideo, FiMic, FiMicOff, FiVideoOff, FiPhoneOff, FiUser } from "react-icons/fi";
import socketService from "@/lib/socket";

export default function EmployeeChatPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatType, setChatType] = useState<"dm" | "group">("dm");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", members: [] as string[] });
  const [tab, setTab] = useState<"chats" | "groups">("chats");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebRTC & Call State
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "incoming" | "active">("idle");
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [caller, setCaller] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<any>(null);
  const pendingOffer = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchData();
    
    // Initialize Socket
    socket.current = socketService.connect();
    if (user?.id) {
      socket.current.emit("join_room", { room: user.id });
    }

    socket.current.on("incoming_call", (data: any) => {
      setCaller(data.from);
      setCallType(data.type);
      pendingOffer.current = data.offer;
      setCallStatus("incoming");
    });

    socket.current.on("call_accepted", async (data: any) => {
      await pc.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      setCallStatus("active");
    });

    socket.current.on("ice_candidate", async (data: any) => {
      if (data.candidate) {
        await pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.current.on("call_ended", () => {
      endCall();
    });

    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => {
      clearInterval(interval);
      socket.current?.off("incoming_call");
      socket.current?.off("call_accepted");
      socket.current?.off("ice_candidate");
      socket.current?.off("call_ended");
    };
  }, [user]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat, chatType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const fetchData = async () => {
    try {
      const [convRes, groupsRes, usersRes] = await Promise.all([
        chatAPI.getConversations(),
        chatAPI.getMyGroups(),
        usersAPI.getAll(),
      ]);
      setConversations(convRes.data);
      setGroups(groupsRes.data);
      setAllUsers(usersRes.data.filter((u: any) => u._id !== user?.id));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    if (!activeChat) return;
    try {
      if (chatType === "dm") {
        const res = await chatAPI.getMessages(activeChat.userId || activeChat._id);
        setMessages(res.data);
      } else {
        const res = await chatAPI.getGroupMessages(activeChat._id);
        setMessages(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      if (chatType === "dm") {
        await chatAPI.sendMessage({
          receiverId: activeChat.userId || activeChat._id,
          message: newMessage.trim(),
        });
      } else {
        await chatAPI.sendGroupMessage(activeChat._id, { message: newMessage.trim() });
      }
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const startNewChat = (targetUser: any) => {
    setActiveChat({
      userId: targetUser._id,
      name: targetUser.name,
      profilePhoto: targetUser.profilePhoto,
    });
    setChatType("dm");
    setShowNewChat(false);
  };

  const createGroup = async () => {
    if (!groupForm.name) {
      toast.error("Group name required");
      return;
    }
    try {
      await chatAPI.createGroup(groupForm);
      toast.success("Group created!");
      setShowNewGroup(false);
      setGroupForm({ name: "", description: "", members: [] });
      fetchData();
    } catch (err) {
      toast.error("Failed to create group");
    }
  };

  const filteredUsers = allUsers.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Call Logic ──────────────────────────────────────────
  const initPeerConnection = () => {
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice_candidate", {
          candidate: event.candidate,
          to: callStatus === "calling" ? activeChat.userId : caller.id
        });
      }
    };

    pc.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
  };

  const startCall = async (type: "audio" | "video") => {
    setCallType(type);
    setCallStatus("calling");
    initPeerConnection();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === "video" 
      });
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

      const offer = await pc.current?.createOffer();
      await pc.current?.setLocalDescription(offer);

      socket.current.emit("call_user", {
        to: activeChat.userId || activeChat._id,
        type,
        offer,
        from: { id: user?.id, name: user?.name, profilePhoto: user?.profilePhoto }
      });
    } catch (err) {
      toast.error("Could not access camera/microphone");
      setCallStatus("idle");
    }
  };

  const acceptCall = async () => {
    initPeerConnection();
    setCallStatus("active");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callType === "video" 
      });
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

      await pc.current?.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
      const answer = await pc.current?.createAnswer();
      await pc.current?.setLocalDescription(answer);

      socket.current.emit("call_accepted", {
        to: caller.id,
        answer
      });
    } catch (err) {
      toast.error("Could not access camera/microphone");
      endCall();
    }
  };

  const endCall = () => {
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    pc.current?.close();
    setCallStatus("idle");
    socket.current.emit("call_ended", { to: activeChat?.userId || caller?.id });
  };

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", gap: 0 }}>
      {/* Left Panel - Chat list */}
      <div style={{
        width: 320, minWidth: 320, borderRight: "1px solid var(--border-color)",
        display: "flex", flexDirection: "column", background: "rgba(15,15,26,0.5)",
        borderRadius: "16px 0 0 16px", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Messages</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNewChat(true)} style={{
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 8, padding: 6, cursor: "pointer", color: "#818cf8",
              }}>
                <FiPlus size={16} />
              </button>
              <button onClick={() => setShowNewGroup(true)} style={{
                background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 8, padding: 6, cursor: "pointer", color: "#a855f7",
              }}>
                <FiUsers size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "rgba(99,102,241,0.06)", borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setTab("chats")} style={{
              flex: 1, padding: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13,
              background: tab === "chats" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: tab === "chats" ? "white" : "var(--text-secondary)",
            }}>
              Chats
            </button>
            <button onClick={() => setTab("groups")} style={{
              flex: 1, padding: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13,
              background: tab === "groups" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: tab === "groups" ? "white" : "var(--text-secondary)",
            }}>
              Groups
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {tab === "chats" ? (
            conversations.length === 0 ? (
              <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>
                No conversations yet. Start a new chat!
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => { setActiveChat(conv); setChatType("dm"); }}
                  style={{
                    width: "100%", padding: "12px", display: "flex", alignItems: "center", gap: 12,
                    border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 4,
                    background: activeChat?.userId === conv.userId ? "rgba(99,102,241,0.12)" : "transparent",
                    textAlign: "left",
                  }}
                >
                  {conv.profilePhoto ? (
                    <img src={conv.profilePhoto} alt={conv.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0,
                    }}>
                      {conv.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{conv.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            )
          ) : (
            groups.length === 0 ? (
              <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>
                No groups yet. Create one!
              </p>
            ) : (
              groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => { setActiveChat(group); setChatType("group"); }}
                  style={{
                    width: "100%", padding: "12px", display: "flex", alignItems: "center", gap: 12,
                    border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 4,
                    background: activeChat?._id === group._id && chatType === "group" ? "rgba(99,102,241,0.12)" : "transparent",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <FiUsers size={18} color="white" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{group.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{group.members?.length || 0} members</p>
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(22,33,62,0.3)", borderRadius: "0 16px 16px 0" }}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid var(--border-color)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {chatType === "dm" ? (
                  activeChat.profilePhoto ? (
                    <img src={activeChat.profilePhoto} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "white",
                    }}>
                      {activeChat.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <FiUsers size={18} color="white" />
                  </div>
                )}
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{activeChat.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {chatType === "dm" ? "Direct Message" : `${activeChat.members?.length || 0} members`}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={() => startCall("audio")}
                  style={{
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: 10, padding: 10, cursor: "pointer", color: "#22c55e",
                  }}
                >
                  <FiPhone size={16} />
                </button>
                <button 
                  onClick={() => startCall("video")}
                  style={{
                    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: 10, padding: 10, cursor: "pointer", color: "#818cf8",
                  }}
                >
                  <FiVideo size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <FiMessageCircle size={48} color="var(--text-muted)" />
                    <p style={{ color: "var(--text-muted)", marginTop: 12, fontSize: 14 }}>
                      No messages yet. Say hello! 👋
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg._id} style={{
                      display: "flex", flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                    }}>
                      {!isMe && chatType === "group" && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, paddingLeft: 4 }}>
                          {msg.senderName}
                        </p>
                      )}
                      <div className={`chat-bubble ${isMe ? "chat-bubble-sent" : "chat-bubble-received"}`}>
                        {msg.message}
                      </div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, padding: "0 4px" }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{
              padding: "16px 20px", borderTop: "1px solid var(--border-color)",
              display: "flex", gap: 12,
            }}>
              <input
                className="input-field"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                style={{ flex: 1 }}
              />
              <button
                onClick={sendMessage}
                className="gradient-btn"
                style={{ padding: "10px 20px" }}
                disabled={!newMessage.trim()}
              >
                <FiSend size={18} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <FiMessageCircle size={64} color="var(--text-muted)" />
              <h3 style={{ color: "var(--text-secondary)", marginTop: 16, fontSize: 18 }}>Select a conversation</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Choose a chat from the left panel or start a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>New Chat</h2>
              <button onClick={() => setShowNewChat(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <FiX size={20} />
              </button>
            </div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <FiSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="input-field" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {filteredUsers.map((u) => (
                <button
                  key={u._id}
                  onClick={() => startNewChat(u)}
                  style={{
                    width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 12,
                    border: "none", borderRadius: 8, cursor: "pointer", background: "transparent",
                    textAlign: "left", marginBottom: 4,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "white",
                  }}>
                    {u.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{u.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.department}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroup && (
        <div className="modal-overlay" onClick={() => setShowNewGroup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create Group</h2>
              <button onClick={() => setShowNewGroup(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <FiX size={20} />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Group Name</label>
              <input className="input-field" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="e.g., Development Team" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Description</label>
              <input className="input-field" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Add Members</label>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {allUsers.map((u) => (
                  <label key={u._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={groupForm.members.includes(u._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupForm({ ...groupForm, members: [...groupForm.members, u._id] });
                        } else {
                          setGroupForm({ ...groupForm, members: groupForm.members.filter((m) => m !== u._id) });
                        }
                      }}
                    />
                    <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{u.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>({u.department})</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewGroup(false)} style={{
                padding: "10px 24px", borderRadius: 10, border: "1px solid var(--border-color)",
                background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={createGroup} className="gradient-btn">Create Group</button>
            </div>
          </div>
        </div>
      )}
      {/* Call UI */}
      {callStatus !== "idle" && (
        <div className="modal-overlay" style={{ zIndex: 1000, background: "rgba(15,15,26,0.95)" }}>
          <div style={{ textAlign: "center", width: "100%", maxWidth: 1000 }}>
            {callStatus === "incoming" ? (
              <div className="glass-card" style={{ padding: 40, width: 320, margin: "0 auto" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20, margin: "0 auto 20px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                   <FiUser size={40} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{caller?.name}</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>Incoming {callType} call...</p>
                <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                  <button onClick={acceptCall} style={{
                    width: 56, height: 56, borderRadius: "50%", background: "#22c55e", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                  }}>
                    <FiPhone size={24} />
                  </button>
                  <button onClick={endCall} style={{
                    width: 56, height: 56, borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                  }}>
                    <FiPhoneOff size={24} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", height: "80vh", gap: 20 }}>
                <div style={{ flex: 1, display: "flex", gap: 20, padding: 20 }}>
                   {/* Remote Video */}
                   <div style={{ flex: 1, position: "relative", background: "#000", borderRadius: 20, overflow: "hidden" }}>
                      <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      {!remoteStream && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                           <div className="spin" style={{ width: 40, height: 40, border: "4px solid rgba(255,255,255,0.1)", borderTopColor: "#6366f1", borderRadius: "50%" }} />
                           <p style={{ color: "white", fontSize: 14 }}>Connecting to {activeChat?.name || caller?.name}...</p>
                        </div>
                      )}
                      
                      {/* Local Mini Video */}
                      <div style={{ 
                        position: "absolute", bottom: 20, right: 20, width: 200, height: 150, 
                        background: "#222", borderRadius: 12, overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)" 
                      }}>
                        <video 
                          ref={localVideoRef} 
                          autoPlay 
                          muted 
                          playsInline 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                   </div>
                </div>

                {/* Controls */}
                <div style={{ padding: "0 0 40px", display: "flex", justifyContent: "center", gap: 20 }}>
                   <button onClick={() => {}} style={{
                      width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                   }}>
                      <FiMic size={24} />
                   </button>
                   <button onClick={() => {}} style={{
                      width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                   }}>
                      <FiVideo size={24} />
                   </button>
                   <button onClick={endCall} style={{
                      width: 56, height: 56, borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                   }}>
                      <FiPhoneOff size={24} />
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
