"use client";

import { useEffect, useState } from "react";

const TOKEN_KEY = "gai_admin_token";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const [token, setToken] = useState(null); // null = checking, "" = not logged in
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [postResult, setPostResult] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) || "");
  }, []);

  useEffect(() => {
    if (token) loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadAnnouncements() {
    const res = await fetch("/api/announcements", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setAnnouncements(data.announcements);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Incorrect password");
      }
      localStorage.setItem(TOKEN_KEY, password);
      setToken(password);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0] || null;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  }

  function clearImage(fileInputEl) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (fileInputEl) fileInputEl.value = "";
  }

  async function handlePost(e) {
    e.preventDefault();
    setPosting(true);
    setPostError("");
    setPostResult("");
    try {
      let imageUrl;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Could not upload image.");
        }
        imageUrl = uploadData.url;
      }

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not post announcement.");
      setTitle("");
      setBody("");
      clearImage(document.getElementById("image"));
      setPostResult(
        data.push?.error
          ? `Posted, but notifications failed to send: ${data.push.error}`
          : `Posted and sent to ${data.push.sent} of ${data.push.total} subscribed device(s).`
      );
      loadAnnouncements();
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this announcement? This can't be undone.")) return;
    const res = await fetch("/api/announcements", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadAnnouncements();
  }

  if (token === null) {
    return null; // brief check of localStorage, avoids a login-form flash
  }

  if (!token) {
    return (
      <main className="container" style={{ maxWidth: 380, paddingTop: 64 }}>
        <h1 style={{ fontSize: "1.3rem" }}>Staff sign-in</h1>
        <form onSubmit={handleLogin} className="stack">
          <div className="field">
            <label htmlFor="password">Admin password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {loginError && <p style={{ color: "#a3323b" }}>{loginError}</p>}
          <button className="btn" disabled={loginLoading}>
            {loginLoading ? "Checking..." : "Sign in"}
          </button>
        </form>
        <p className="text-muted" style={{ marginTop: 24 }}>
          <a href="/">&larr; Back to announcements</a>
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "1.3rem" }}>Post an announcement</h1>
        <button className="btn secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <form onSubmit={handlePost} className="card">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="body">Message</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="image">Photo (optional)</label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
          />
          <p className="text-muted" style={{ marginTop: 6 }}>
            JPEG, PNG, WEBP, or GIF, up to 4MB.
          </p>
          {imagePreview && (
            <div style={{ marginTop: 10 }}>
              <img
                src={imagePreview}
                alt="Selected preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: 220,
                  borderRadius: 10,
                  display: "block",
                }}
              />
              <button
                type="button"
                className="btn secondary"
                style={{ marginTop: 8 }}
                onClick={() => clearImage(document.getElementById("image"))}
              >
                Remove photo
              </button>
            </div>
          )}
        </div>
        {postError && <p style={{ color: "#a3323b" }}>{postError}</p>}
        {postResult && <p className="text-muted">{postResult}</p>}
        <button className="btn" disabled={posting}>
          {posting ? "Posting..." : "Post & notify congregation"}
        </button>
      </form>

      <h2 style={{ fontSize: "1.05rem", marginTop: 28 }}>Past announcements</h2>
      {announcements.map((a) => (
        <div className="card admin-item" key={a.id}>
          <div>
            <h2>{a.title}</h2>
            <time dateTime={a.createdAt}>{formatDate(a.createdAt)}</time>
            {a.imageUrl && (
              <img
                src={a.imageUrl}
                alt=""
                style={{
                  maxWidth: "100%",
                  maxHeight: 180,
                  borderRadius: 10,
                  display: "block",
                  marginBottom: 10,
                }}
              />
            )}
            <p>{a.body}</p>
          </div>
          <button className="btn danger" onClick={() => handleDelete(a.id)}>
            Delete
          </button>
        </div>
      ))}

      <p className="text-muted" style={{ marginTop: 24 }}>
        <a href="/">&larr; Back to announcements</a>
      </p>
    </main>
  );
}
