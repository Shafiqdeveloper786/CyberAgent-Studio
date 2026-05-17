"use client";

import React, { useState } from "react";
import { CreditCard, Wallet, QrCode, ShieldCheck, AlertTriangle, X, Check, Star } from "lucide-react";

type PayMethod = "card" | "paypal" | "qr_nfc";

const PLAN_FEATURES = [
  "Unlimited AI agents",
  "Priority response speed",
  "Custom branding & themes",
  "Advanced RAG knowledge base",
  "API access & webhooks",
  "Dedicated support channel",
];

export default function CheckoutPage() {
  const [activeMethod,     setActiveMethod]     = useState<PayMethod>("card");
  const [showPaymentAlert, setShowPaymentAlert] = useState<boolean>(false);
  const [isScanning,       setIsScanning]       = useState<boolean>(false);
  const [cardName,         setCardName]         = useState("");
  const [cardNumber,       setCardNumber]       = useState("");
  const [expiry,           setExpiry]           = useState("");
  const [cvv,              setCvv]             = useState("");

  /* ── master submit handler — blocks every browser routing path ── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPaymentAlert(true);
    return false;
  };

  const handleCardScan = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setTimeout(() => {
      setCardName("MUHAMMAD SHAFIQ");
      setCardNumber("4242 •••• •••• 4242");
      setExpiry("12/29");
      setCvv("321");
      setIsScanning(false);
    }, 1500);
  };

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
  };

  const inp = "w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors";

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans antialiased relative overflow-x-hidden py-12 px-4 sm:px-6 lg:px-8">

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/[0.06] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.06] rounded-full blur-[140px] pointer-events-none" />

      {/* Page header */}
      <div className="max-w-5xl mx-auto mb-8 relative z-10">
        <h1
          className="text-2xl font-black tracking-tight"
          style={{
            background: "linear-gradient(90deg,#00f2ff 0%,#a855f7 60%,#ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Upgrade to Pro
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Complete your payment to unlock the full power of CyberAgent Studio.</p>
      </div>

      {/* ── Form wrapper — onSubmit is the single interception point ── */}
      <form
        onSubmit={handleSubmit}
        className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10"
      >
        {/* ═══════════════ LEFT: PAYMENT PANEL ═══════════════ */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800/80 p-6 rounded-2xl shadow-2xl">

            {/* Method tabs */}
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-bold mb-3">Payment Method</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {([
                { id: "card"   as PayMethod, label: "Pay via Card",  icon: <CreditCard className="w-5 h-5 mb-1.5" /> },
                { id: "paypal" as PayMethod, label: "PayPal",         icon: <Wallet     className="w-5 h-5 mb-1.5" /> },
                { id: "qr_nfc" as PayMethod, label: "Scan QR / NFC", icon: <QrCode     className="w-5 h-5 mb-1.5" /> },
              ] as const).map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveMethod(id)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-250"
                  style={{
                    background:  activeMethod === id ? "rgba(0,242,255,0.05)" : "rgba(255,255,255,0.02)",
                    border:      activeMethod === id ? "1px solid rgba(0,242,255,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    color:       activeMethod === id ? "#00f2ff" : "#64748b",
                    boxShadow:   activeMethod === id ? "0 0 18px rgba(0,242,255,0.1)" : "none",
                  }}
                >
                  {icon}
                  <span className="text-[11px] font-semibold">{label}</span>
                </button>
              ))}
            </div>

            {/* Active panel */}
            <div
              className="p-5 rounded-xl min-h-[200px] flex flex-col justify-center"
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* ── Card ── */}
              {activeMethod === "card" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-zinc-500">Visa · Mastercard · Amex</span>
                    <button
                      type="button"
                      onClick={handleCardScan}
                      disabled={isScanning}
                      className="text-[11px] px-2.5 py-1 rounded-lg transition-all disabled:opacity-60"
                      style={{ background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.22)", color: "#00f2ff" }}
                    >
                      {isScanning ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-ping inline-block" />
                          Scanning…
                        </span>
                      ) : "📷 Scan Card"}
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={inp}
                  />
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={cardNumber}
                    maxLength={19}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className={inp}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM / YY"
                      value={expiry}
                      maxLength={7}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      className={inp}
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      value={cvv}
                      maxLength={4}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className={inp}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 flex items-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> 256-bit SSL · PCI DSS compliant
                  </p>
                </div>
              )}

              {/* ── PayPal ── */}
              {activeMethod === "paypal" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[22px] font-black text-[#003087]">Pay</span>
                    <span className="text-[22px] font-black text-[#009cde]">Pal</span>
                  </div>
                  <p className="text-sm text-zinc-400 text-center max-w-xs">
                    You will be securely redirected to PayPal after confirming your order.
                  </p>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full"
                    style={{ background: "rgba(0,156,222,0.1)", border: "1px solid rgba(0,156,222,0.25)", color: "#009cde" }}>
                    🔒 Buyer Protection Active
                  </span>
                </div>
              )}

              {/* ── QR / NFC ── */}
              {activeMethod === "qr_nfc" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,242,255,0.06)", border: "1px dashed rgba(0,242,255,0.3)" }}
                  >
                    <QrCode className="w-10 h-10 text-[#00f2ff]" />
                  </div>
                  <p className="text-sm text-zinc-300 font-semibold">Contactless Terminal</p>
                  <p className="text-xs text-zinc-500 text-center max-w-[220px]">
                    Scan the QR token with your mobile banking app, or tap your NFC-enabled device.
                  </p>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full"
                    style={{ background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.2)", color: "#00f2ff" }}>
                    NFC · QR · Tap to Pay
                  </span>
                </div>
              )}
            </div>

            {/* ── Submit — type="submit" feeds into form's onSubmit ── */}
            <button
              type="submit"
              className="w-full mt-5 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[14px] font-black tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(90deg,rgba(0,242,255,0.22),rgba(168,85,247,0.22))",
                border:     "1px solid rgba(0,242,255,0.4)",
                color:      "#00f2ff",
                boxShadow:  "0 0 28px rgba(0,242,255,0.1)",
              }}
            >
              <ShieldCheck className="w-5 h-5" />
              {activeMethod === "paypal" ? "Pay with PayPal" : "Pay Securely — $39 / mo"}
            </button>

            <div className="flex items-center justify-center gap-5 mt-3">
              {["🔒 Secure", "💳 No hidden fees", "↩️ Cancel anytime"].map((t) => (
                <span key={t} className="text-[10px] text-zinc-600">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════ RIGHT: ORDER SUMMARY ═══════════════ */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800/80 p-6 rounded-2xl shadow-2xl space-y-4 sticky top-6">

            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-[12px] font-black uppercase tracking-widest text-amber-400">Pro Plan</span>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7" }}>
                Most Popular
              </span>
            </div>

            <div className="flex items-end gap-1">
              <span
                className="text-[32px] font-black leading-none"
                style={{
                  background: "linear-gradient(90deg,#00f2ff,#a855f7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                $39
              </span>
              <span className="text-sm text-zinc-500 mb-1.5">/month</span>
            </div>

            <div className="space-y-2">
              {PLAN_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(0,255,148,0.12)", border: "1px solid rgba(0,255,148,0.3)" }}
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-zinc-400">{f}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800/80 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Pro Plan Monthly</span>
                <span className="text-zinc-300">$39.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tax / VAT</span>
                <span className="text-zinc-500">$0.00</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-black text-white">Total Today</span>
                <span
                  className="text-lg font-black"
                  style={{
                    background: "linear-gradient(90deg,#00f2ff,#a855f7)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  $39.00
                </span>
              </div>
              <p className="text-[10px] text-zinc-600">Billed monthly. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </form>

      {/* ═══════════════════════════════════════════════════════
          INLINE PAYMENT ALERT MODAL — fixed overlay, z-50
          No routing. No redirects. Pure state toggle.
      ═══════════════════════════════════════════════════════ */}
      {showPaymentAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            className="bg-[#0a0a0c] border border-cyan-500/30 shadow-[0_0_35px_rgba(0,242,255,0.2)] rounded-2xl max-w-md w-full p-6 text-center relative overflow-hidden text-white"
          >
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,#f59e0b,#00f2ff,#a855f7)" }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowPaymentAlert(false); }}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning icon */}
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>

            <h3 className="text-xl font-extrabold tracking-wide uppercase mb-1">System Notice</h3>
            <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold mb-4">
              Channels Syncing Intercepted
            </p>

            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
              Sorry, hum abhi automatic online payments accept nahi kar rahe hain kyunke automated
              checkout systems abhi testing phase mein hain.
            </p>

            {/* Manual transfer block */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 my-4 text-left">
              <p className="text-xs text-zinc-400 font-medium mb-3 leading-relaxed">
                To upgrade your account to the{" "}
                <span className="text-[#00f2ff] font-bold">Pro Plan</span> instantly via manual
                transfer{" "}
                <span className="text-emerald-400">(Easypaisa / JazzCash / Bank)</span>, please reach
                out directly to our secure billing desk:
              </p>
              <div className="bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded-md font-mono text-xs text-[#00f2ff] text-center break-all select-all hover:bg-zinc-800/80 transition-colors cursor-text">
                muhammadshafiqchohan12@gmail.com
              </div>
            </div>

            <p className="text-xs text-zinc-500 italic mb-5">
              Yeh payment methods jald hi fully active ho jayenge!
            </p>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowPaymentAlert(false); }}
              className="w-full bg-[#00f2ff] text-black font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg hover:bg-cyan-400 transition-all duration-300 text-[13px]"
            >
              Return &amp; Modify Method
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
