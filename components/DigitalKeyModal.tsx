"use client";

import { useState, useEffect, useRef } from "react";
import { BRAND } from "@/lib/brand";

interface DigitalKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  suite: string;
  k: string;
  roomType?: string;
  floor?: number;
}

export function DigitalKeyModal({
  isOpen,
  onClose,
  suite,
  k,
  roomType = "Signature Suite",
  floor = 1,
}: DigitalKeyModalProps) {
  const [unlockState, setUnlockState] = useState<"idle" | "transmitting" | "unlocked" | "error">("idle");
  const [countdown, setCountdown] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [walletAdded, setWalletAdded] = useState<boolean>(false);
  const [lastUnlocked, setLastUnlocked] = useState<string | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play pleasant electronic door lock unlock chime with Web Audio API
  const playUnlockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Note 1 (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.2);

      // Note 2 (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.14);
      gain2.gain.setValueAtTime(0.14, ctx.currentTime + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.14);
      osc2.stop(ctx.currentTime + 0.48);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Trigger haptic feedback if supported by device
  const triggerHaptic = (pattern: number[]) => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  // Perform secure door unlock
  const handleUnlockDoor = async (method: "bluetooth" | "nfc" = "bluetooth") => {
    if (unlockState === "transmitting" || unlockState === "unlocked") return;

    setUnlockState("transmitting");
    setErrorMessage(null);
    triggerHaptic([40, 60, 40]);

    try {
      const res = await fetch(`/api/guest/${suite}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k, method }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Door lock unresponsive. Please hold phone closer to door reader.");
      }

      // Success
      playUnlockAudio();
      triggerHaptic([100, 50, 150]);
      setUnlockState("unlocked");
      setCountdown(10);
      setLastUnlocked("Just now");

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownTimerRef.current!);
            setUnlockState("idle");
            return 10;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setUnlockState("error");
      setErrorMessage(err instanceof Error ? err.message : "Lock communication failed.");
      triggerHaptic([200, 100, 200]);
      setTimeout(() => setUnlockState("idle"), 4000);
    }
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 15, 29, 0.82)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="digital-key-title"
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#0F172A",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(30, 58, 138, 0.25)",
          color: "#FFFFFF",
          overflow: "hidden",
          position: "relative",
          animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes pulseRings {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.18); opacity: 0.25; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
          @keyframes sonarWave {
            0% { transform: scale(1); opacity: 0.9; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes glowSuccess {
            0% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
            50% { box-shadow: 0 0 45px rgba(16, 185, 129, 0.8); }
            100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
          }
        `}</style>

        {/* Digital Pass Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            background: `linear-gradient(135deg, ${BRAND.green} 0%, ${BRAND.darkGreen} 100%)`,
            position: "relative",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: BRAND.accent }}>
                Mobile Digital Room Key
              </div>
              <h2 id="digital-key-title" style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>
                {BRAND.name}
              </h2>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                📍 {BRAND.location}
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close digital key modal"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                color: "#FFFFFF",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
                transition: "all 0.15s ease",
              }}
            >
              ✕
            </button>
          </div>

          {/* Contactless RFID / NFC Icon */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 12, opacity: 0.9 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8.5a7 7 0 0 1 0 7" />
              <path d="M8.5 6a11 11 0 0 1 0 12" />
              <path d="M12 3.5a15.5 15.5 0 0 1 0 17" />
            </svg>
            <span style={{ fontWeight: 600 }}>Hold phone near the door lock reader</span>
          </div>
        </div>

        {/* Pass Room Badge */}
        <div style={{ padding: "20px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(255, 255, 255, 0.12)" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 }}>
              Assigned Suite
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#FFFFFF", letterSpacing: -0.5 }}>
              {suite}
            </div>
            <div style={{ fontSize: 13, color: "#38BDF8", fontWeight: 600 }}>
              {roomType} · Floor {floor}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 }}>
              Pass Status
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(16, 185, 129, 0.15)", color: "#34D399", fontSize: 12, fontWeight: 800, marginTop: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981" }} />
              Active Stay
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
              Check-out: {BRAND.checkOutTime}
            </div>
          </div>
        </div>

        {/* Interactive Door Unlock Pad */}
        <div style={{ padding: "30px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ position: "relative", marginBottom: 20 }}>
            {/* Pulsing Sonar Ring Animations */}
            {unlockState === "transmitting" && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: -14,
                    borderRadius: "50%",
                    border: "2px solid #38BDF8",
                    animation: "sonarWave 1.4s ease-out infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -28,
                    borderRadius: "50%",
                    border: "1.5px solid #0284C7",
                    animation: "sonarWave 1.4s ease-out 0.4s infinite",
                  }}
                />
              </>
            )}

            {/* Main Interactive Button Pad */}
            <button
              id="btn-keyless-unlock-action"
              onClick={() => handleUnlockDoor("bluetooth")}
              disabled={unlockState === "transmitting"}
              style={{
                width: 130,
                height: 130,
                borderRadius: "50%",
                border: unlockState === "unlocked" ? "4px solid #10B981" : "3px solid rgba(255, 255, 255, 0.2)",
                background:
                  unlockState === "unlocked"
                    ? "radial-gradient(circle, #059669 0%, #064E3B 100%)"
                    : unlockState === "transmitting"
                    ? "radial-gradient(circle, #0284C7 0%, #0369A1 100%)"
                    : unlockState === "error"
                    ? "radial-gradient(circle, #DC2626 0%, #7F1D1D 100%)"
                    : `radial-gradient(circle, ${BRAND.green} 0%, #0F172A 100%)`,
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: unlockState === "transmitting" ? "wait" : "pointer",
                boxShadow:
                  unlockState === "unlocked"
                    ? "0 0 35px rgba(16, 185, 129, 0.6)"
                    : unlockState === "transmitting"
                    ? "0 0 35px rgba(2, 132, 199, 0.6)"
                    : "0 10px 25px rgba(0, 0, 0, 0.5)",
                transition: "all 0.25s ease",
                animation: unlockState === "unlocked" ? "glowSuccess 2s infinite" : unlockState === "transmitting" ? "pulseRings 1.2s infinite" : "none",
                outline: "none",
              }}
            >
              {unlockState === "unlocked" ? (
                <>
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginTop: 4 }}>
                    OPEN ({countdown}s)
                  </span>
                </>
              ) : unlockState === "transmitting" ? (
                <>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 2s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginTop: 4 }}>
                    UNLATCHING...
                  </span>
                </>
              ) : unlockState === "error" ? (
                <>
                  <span style={{ fontSize: 32 }}>⚠️</span>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>
                    RETRY
                  </span>
                </>
              ) : (
                <>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
                    TAP TO UNLOCK
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          <div style={{ minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {unlockState === "unlocked" ? (
              <div style={{ color: "#34D399", fontWeight: 700, fontSize: 15, animation: "fadeIn 0.2s ease" }}>
                🎉 Door lock unlatched! Push door to enter.
              </div>
            ) : unlockState === "transmitting" ? (
              <div style={{ color: "#38BDF8", fontWeight: 600, fontSize: 14 }}>
                Transmitting encrypted digital credential via Bluetooth & NFC...
              </div>
            ) : unlockState === "error" ? (
              <div style={{ color: "#F87171", fontWeight: 600, fontSize: 13 }}>
                {errorMessage}
              </div>
            ) : (
              <div style={{ color: "#94A3B8", fontSize: 13 }}>
                Tap button when standing within 6 feet of Suite {suite}&apos;s door lock
              </div>
            )}
          </div>

          {/* Quick NFC Alternative Button */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, width: "100%" }}>
            <button
              onClick={() => handleUnlockDoor("nfc")}
              disabled={unlockState === "transmitting"}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 12,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>📲</span>
              <span>NFC Direct Tap</span>
            </button>

            <button
              onClick={() => {
                setWalletAdded(true);
                triggerHaptic([60, 40, 60]);
                setTimeout(() => setWalletAdded(false), 3500);
              }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 12,
                backgroundColor: walletAdded ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                border: walletAdded ? "1px solid #10B981" : "1px solid rgba(255, 255, 255, 0.12)",
                color: walletAdded ? "#34D399" : "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>{walletAdded ? "✓" : ""}</span>
              <span>{walletAdded ? "Pass Added!" : "Add to Wallet"}</span>
            </button>
          </div>
        </div>

        {/* Security & Lock Telemetry Footer */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: 11,
            color: "#64748B",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>🔒 256-Bit TLS</span>
            <span>•</span>
            <span>🔋 Lock 94%</span>
            <span>•</span>
            <span>📶 BLE -45dBm</span>
          </div>
          <div>
            {lastUnlocked ? `Opened: ${lastUnlocked}` : "Door Ready"}
          </div>
        </div>
      </div>
    </div>
  );
}
