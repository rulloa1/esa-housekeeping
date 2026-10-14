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
  const [deadboltEngaged, setDeadboltEngaged] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [walletAdded, setWalletAdded] = useState<boolean>(false);
  const [lastUnlocked, setLastUnlocked] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(94);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch live lock diagnostics on open
  useEffect(() => {
    if (!isOpen || !suite || !k) return;
    fetch(`/api/guest/${suite}/unlock?k=${encodeURIComponent(k)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setDeadboltEngaged(Boolean(data.deadboltEngaged));
          if (data.batteryLevel) {
            setBatteryLevel(parseInt(data.batteryLevel, 10) || 94);
          }
          if (data.lastUnlockedAt) {
            const date = new Date(data.lastUnlockedAt);
            setLastUnlocked(date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
          }
        }
      })
      .catch(() => {});
  }, [isOpen, suite, k]);

  // Play realistic commercial solenoid release and dual-tone optical confirmation chime
  const playSolenoidUnlockAudio = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // 1. Mechanical Solenoid Click (sharp magnetic plunger release)
      const bufferSize = ctx.sampleRate * 0.05; // 50ms impulse
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 850;
      filter.Q.value = 3;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22, ctx.currentTime);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();

      // 2. High-Frequency Commercial Reader Chime Note 1 (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime + 0.04);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime + 0.04);
      osc1.stop(ctx.currentTime + 0.24);

      // 3. Reader Chime Note 2 (A5 - 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.52);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.55);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Trigger haptic feedback if supported
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
        throw new Error(errJson.error || "Lock unresponsive. Please align phone with the black reader module.");
      }

      // Success: solenoid releases, deadbolt mechanically disengages
      playSolenoidUnlockAudio();
      triggerHaptic([120, 40, 160]);
      setUnlockState("unlocked");
      setDeadboltEngaged(false);
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

  // Toggle interior thumbturn deadbolt position
  const handleToggleDeadbolt = async () => {
    try {
      const res = await fetch(`/api/guest/${suite}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k, toggleDeadbolt: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeadboltEngaged(Boolean(data.deadboltEngaged));
        triggerHaptic([60, 40]);
      }
    } catch {}
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
        backgroundColor: "rgba(10, 15, 29, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
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
          maxWidth: 440,
          backgroundColor: "#0B1120",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(16, 185, 129, 0.15)",
          color: "#FFFFFF",
          overflow: "hidden",
          position: "relative",
          animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes sonarWave {
            0% { transform: scale(1); opacity: 0.9; }
            100% { transform: scale(1.75); opacity: 0; }
          }
          @keyframes ledPulseGreen {
            0% { box-shadow: 0 0 10px #10B981, 0 0 25px #10B981; }
            50% { box-shadow: 0 0 25px #10B981, 0 0 50px #10B981, 0 0 80px rgba(16, 185, 129, 0.8); }
            100% { box-shadow: 0 0 10px #10B981, 0 0 25px #10B981; }
          }
          @keyframes ledPulseBlue {
            0% { box-shadow: 0 0 8px #38BDF8; }
            50% { box-shadow: 0 0 25px #38BDF8, 0 0 45px rgba(56, 189, 248, 0.8); }
            100% { box-shadow: 0 0 8px #38BDF8; }
          }
          @keyframes beaconBeacon {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            padding: "18px 22px 14px",
            background: `linear-gradient(135deg, ${BRAND.green} 0%, #0F172A 100%)`,
            position: "relative",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: BRAND.accent }}>
                Commercial Keyless Door Lock
              </div>
              <h2 id="digital-key-title" style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>
                Suite {suite} · {BRAND.name}
              </h2>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                {roomType} · Floor {floor}
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
        </div>

        {/* Main Body - Physical Lock Representation matching hardware photo */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          
          {/* Target Alignment Instructions Banner */}
          <div
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              backgroundColor: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "#38BDF8",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 18 }}>📍</span>
            <span>Hold top of phone against the <strong>black reader module</strong> above the door handle</span>
          </div>

          {/* Realistic Lock Simulation Escutcheon */}
          <div
            style={{
              position: "relative",
              width: 170,
              padding: "18px 14px 22px",
              background: "linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 35%, #94A3B8 70%, #CBD5E1 100%)",
              borderRadius: "28px",
              border: "2px solid #F1F5F9",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {/* Top Black RFID / BLE DirectKey Reader Module (From User Photo) */}
            <div
              id="lock-rfid-sensor-pad"
              onClick={() => handleUnlockDoor("bluetooth")}
              role="button"
              tabIndex={0}
              title="Tap black reader module to transmit mobile key"
              style={{
                position: "relative",
                width: 128,
                height: 148,
                backgroundColor: "#18181B",
                borderRadius: "18px",
                border: "2px solid #27272A",
                boxShadow: "0 8px 18px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            >
              {/* Radar Waves when transmitting */}
              {unlockState === "transmitting" && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      inset: -10,
                      borderRadius: "24px",
                      border: "2px solid #38BDF8",
                      animation: "sonarWave 1.4s ease-out infinite",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: -22,
                      borderRadius: "30px",
                      border: "1.5px solid #0284C7",
                      animation: "sonarWave 1.4s ease-out 0.4s infinite",
                    }}
                  />
                </>
              )}

              {/* Center Optical Aperture / LED (Exact match from user photo) */}
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  backgroundColor:
                    unlockState === "unlocked"
                      ? "#10B981"
                      : unlockState === "transmitting"
                      ? "#38BDF8"
                      : unlockState === "error"
                      ? "#EF4444"
                      : "#334155",
                  border: "2px solid #09090B",
                  boxShadow:
                    unlockState === "unlocked"
                      ? "0 0 18px #10B981, 0 0 35px #10B981"
                      : unlockState === "transmitting"
                      ? "0 0 18px #38BDF8"
                      : unlockState === "error"
                      ? "0 0 18px #EF4444"
                      : "inset 0 1px 2px rgba(0,0,0,0.8)",
                  animation:
                    unlockState === "unlocked"
                      ? "ledPulseGreen 1.5s infinite"
                      : unlockState === "transmitting"
                      ? "ledPulseBlue 0.8s infinite"
                      : "beaconBeacon 2.5s infinite",
                  marginBottom: 10,
                }}
              />

              {/* Reader Label */}
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.2, color: "#94A3B8", textTransform: "uppercase" }}>
                RFID · BLE
              </div>

              {/* Contactless Wave Icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={unlockState === "unlocked" ? "#10B981" : "#E2E8F0"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 4 }}>
                <path d="M5 8.5a7 7 0 0 1 0 7" />
                <path d="M8.5 6a11 11 0 0 1 0 12" />
                <path d="M12 3.5a15.5 15.5 0 0 1 0 17" />
              </svg>

              <div style={{ fontSize: 10, fontWeight: 800, color: unlockState === "unlocked" ? "#34D399" : "#FFFFFF", marginTop: 6, textTransform: "uppercase" }}>
                {unlockState === "unlocked" ? `OPEN (${countdown}s)` : unlockState === "transmitting" ? "READING..." : "TAP TO UNLOCK"}
              </div>
            </div>

            {/* Middle Section: Oval Escutcheon & Angled Privacy Thumbturn */}
            <div
              style={{
                marginTop: 18,
                width: 90,
                height: 120,
                backgroundColor: "#CBD5E1",
                borderRadius: "45px",
                border: "2px solid #E2E8F0",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 12,
                position: "relative",
              }}
            >
              {/* Thumbturn / Deadbolt Lever Knob */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleToggleDeadbolt}
                title="Click to toggle interior privacy deadbolt"
                style={{
                  width: 44,
                  height: 22,
                  backgroundColor: "#E2E8F0",
                  borderRadius: "11px",
                  border: "2px solid #94A3B8",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.3)",
                  position: "relative",
                  transform: deadboltEngaged ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  cursor: "pointer",
                }}
              >
                {/* Black Rubber Grip Strip on Thumbturn (Exact match from user photo) */}
                <div
                  style={{
                    position: "absolute",
                    inset: "3px 4px",
                    backgroundColor: "#18181B",
                    borderRadius: "6px",
                  }}
                />
              </div>

              <div style={{ fontSize: 9, fontWeight: 800, color: deadboltEngaged ? "#DC2626" : "#475569", marginTop: 8, textAlign: "center" }}>
                {deadboltEngaged ? "🔒 DEADBOLT THROWN" : "DEADBOLT READY"}
              </div>

              {/* Lever Handle Pivot Collar & Handle (Pointing Left/Down) */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "#94A3B8",
                  border: "2px solid #E2E8F0",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Lever Handle Stem */}
                <div
                  style={{
                    position: "absolute",
                    left: -48,
                    width: 60,
                    height: 16,
                    background: "linear-gradient(180deg, #F1F5F9 0%, #94A3B8 100%)",
                    borderRadius: "8px 0 0 8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
                    transformOrigin: "right center",
                    transform: unlockState === "unlocked" ? "rotate(16deg)" : "rotate(0deg)",
                    transition: "transform 0.25s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Unlock Action Status */}
          <div style={{ minHeight: 38, textAlign: "center", marginBottom: 12 }}>
            {unlockState === "unlocked" ? (
              <div style={{ color: "#34D399", fontWeight: 700, fontSize: 14 }}>
                🎉 Solenoid Released! Push door handle to enter Suite {suite}.
              </div>
            ) : unlockState === "transmitting" ? (
              <div style={{ color: "#38BDF8", fontWeight: 600, fontSize: 13 }}>
                Transmitting encrypted BLE keyless credential to Onity lock...
              </div>
            ) : unlockState === "error" ? (
              <div style={{ color: "#F87171", fontWeight: 600, fontSize: 13 }}>
                ⚠️ {errorMessage}
              </div>
            ) : (
              <div style={{ color: "#94A3B8", fontSize: 12 }}>
                {deadboltEngaged
                  ? "Privacy deadbolt is currently thrown on the inside thumbturn."
                  : "Tap the black sensor module or use NFC direct tap to unlatch."}
              </div>
            )}
          </div>

          {/* Quick Actions Row: Primary Unlock Button, NFC Tap & Apple/Google Wallet */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", marginBottom: 12 }}>
            <button
              id="btn-keyless-unlock-action"
              onClick={() => handleUnlockDoor("bluetooth")}
              disabled={unlockState === "transmitting"}
              style={{
                gridColumn: "1 / -1",
                padding: "14px",
                borderRadius: 14,
                background:
                  unlockState === "unlocked"
                    ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                    : unlockState === "transmitting"
                    ? "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)"
                    : `linear-gradient(135deg, ${BRAND.green} 0%, #15803D 100%)`,
                border: "none",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: unlockState === "transmitting" ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              }}
            >
              <span>{unlockState === "unlocked" ? "✓" : "📲"}</span>
              <span>{unlockState === "unlocked" ? `Door Unlocked (${countdown}s)` : "Unlock Suite Door"}</span>
            </button>

            <button
              onClick={() => handleUnlockDoor("nfc")}
              disabled={unlockState === "transmitting"}
              style={{
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
              }}
            >
              <span>📶</span>
              <span>NFC Direct Tap</span>
            </button>

            <button
              onClick={() => {
                setWalletAdded(true);
                triggerHaptic([60, 40, 60]);
                setTimeout(() => setWalletAdded(false), 3500);
              }}
              style={{
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
              }}
            >
              <span>{walletAdded ? "✓" : ""}</span>
              <span>{walletAdded ? "Pass Added" : "Add to Wallet"}</span>
            </button>
          </div>
        </div>

        {/* Commercial Lock Telemetry & Hardware Diagnostics Footer */}
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: 11,
            color: "#94A3B8",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔋 Lock Batt: <strong>{batteryLevel}%</strong></span>
            <span>•</span>
            <span>📶 BLE -45dBm</span>
            <span>•</span>
            <span>{deadboltEngaged ? "🔴 DND Active" : "🟢 Ready"}</span>
          </div>
          <div>
            {lastUnlocked ? `Opened: ${lastUnlocked}` : "Lock Secure"}
          </div>
        </div>
      </div>
    </div>
  );
}
