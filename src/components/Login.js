import React, { useState, useEffect } from "react";
import { loadVault, saveVault } from "../utils/storage";
import { encryptVault, decryptVault } from "../utils/CryptoService";
import { verifyVault, writeVaultHash } from "../utils/web3Service";
import Toast from "./Toast";

export default function Login({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [vaultExists, setVaultExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Initializing...");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  const showToast = (msg, type = "error") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    async function init() {
      try {
        const vault = await loadVault();
        setVaultExists(!!vault);
        setStatus(vault ? "Welcome back!" : "Create your first vault");
      } catch {
        setStatus("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleCreateVault = async () => {
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "warning");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    setProcessing(true);
    setStatus("Setting things up...");
    try {
      const emptyVault = { accounts: [] };
      const encrypted = await encryptVault(emptyVault, password);
      await saveVault(encrypted);
      await writeVaultHash(encrypted);
      showToast("Vault created successfully!", "success");
      setTimeout(() => onUnlock(emptyVault, password), 800);
    } catch (err) {
      showToast("Creation failed: " + err.message);
      setStatus("Create Master Password");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "warning");
      return;
    }

    setProcessing(true);
    setStatus("Verifying...");
    try {
      const encryptedVault = await loadVault();
      const verified = await verifyVault(encryptedVault);
      if (!verified) throw new Error("Integrity check failed");
      const decrypted = await decryptVault(encryptedVault, password);
      showToast("Vault unlocked!", "success");
      setTimeout(() => onUnlock(decrypted, password), 800);
    } catch {
      showToast("Wrong password");
      setPassword("");
      setStatus("Unlock your Vault");
    } finally {
      setProcessing(false);
    }
  };

  const handleAuth = () => {
    vaultExists ? handleUnlock() : handleCreateVault();
  };

  const isPasswordValid =
    password.length >= 8 && (vaultExists || password === confirmPassword);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>{vaultExists ? "Welcome back!" : "New Vault"}</h1>
        <p style={styles.status}>{status}</p>

        {/* PASSWORD */}
        <div style={styles.inputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Master Password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={processing}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* CONFIRM PASSWORD (ONLY FOR CREATE) */}
        {!vaultExists && (
          <div style={styles.inputWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              style={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={processing}
            />
          </div>
        )}

        {/* PASSWORD MISMATCH */}
        {!vaultExists &&
          confirmPassword.length > 0 &&
          password !== confirmPassword && (
            <p style={{ color: "#ef4444", fontSize: "13px" }}>
              Passwords do not match
            </p>
          )}

        {/* STRENGTH BAR */}
        <div style={styles.strengthBar}>
          <div
            style={{
              ...styles.strengthFill,
              width: `${Math.min((password.length / 8) * 100, 100)}%`,
              background: password.length >= 8 ? "#10b981" : "#334155",
            }}
          />
        </div>

        {/* ACTION BUTTON */}
        <button
          onClick={handleAuth}
          disabled={processing || !isPasswordValid}
          style={{
            ...styles.button,
            opacity: processing || !isPasswordValid ? 0.6 : 1,
          }}
        >
          {processing ? "please wait..." : vaultExists ? "unlock" : "create"}
        </button>

        {/* TOGGLE MODE */}
        {!processing && (
          <button
            onClick={() => {
              setVaultExists(!vaultExists);
              setPassword("");
              setConfirmPassword("");
              setStatus(
                vaultExists ? "Create Master Password" : "Unlock your Vault"
              );
            }}
            style={styles.toggleButton}
          >
            {vaultExists ? "switch to create" : "already have one?"}
          </button>
        )}
      </div>

      {toastMessage && <Toast message={toastMessage} type={toastType} />}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Ubuntu, sans-serif",
  },
  content: {
    width: "100%",
    maxWidth: "320px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px",
  },
  title: { color: "#e2e8f0", fontSize: "30px" },
  status: { color: "#94a3b8", fontSize: "14px" },
  inputWrapper: { width: "100%", position: "relative" },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "14px",
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #334155",
    textAlign: "center",
  },
  eyeButton: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  strengthBar: {
    height: "4px",
    width: "100%",
    background: "#1e293b",
    borderRadius: "10px",
  },
  strengthFill: { height: "100%", transition: "0.3s" },
  button: {
    width: "100%",
    padding: "14px",
    background: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    fontWeight: "600",
  },
  toggleButton: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "3px solid #334155",
    borderTop: "3px solid #10b981",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
