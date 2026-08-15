import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LogIn,
  Send,
  UserRound,
} from "lucide-react";
import TramIALogo from "./TramIALogo";

type Status =
  | "loading"
  | "success"
  | "alreadyVerified"
  | "expired"
  | "invalid"
  | "serviceError"
  | "resending"
  | "resent";

interface EmailVerificationViewProps {
  onOpenProfile: () => void;
  onLogin: () => void;
}

export default function EmailVerificationView({
  onOpenProfile,
  onLogin,
}: EmailVerificationViewProps) {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const verificationStarted = useRef(false);
  const [status, setStatus] = useState<Status>(token ? "loading" : "invalid");
  const [message, setMessage] = useState(
    token
      ? "Estamos comprobando tu enlace de forma segura."
      : "El enlace está incompleto o no es válido. Solicita uno nuevo desde tu perfil.",
  );

  useEffect(() => {
    if (!token || verificationStarted.current) return;
    verificationStarted.current = true;
    void verifyEmail();

    async function verifyEmail() {
      try {
        const response = await fetch("/api/v1/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          setStatus(result.alreadyVerified ? "alreadyVerified" : "success");
          setMessage(result.message || "Tu correo fue verificado correctamente.");
          return;
        }
        if (result.error === "expired_token") setStatus("expired");
        else if (["invalid_token", "used_token"].includes(result.error))
          setStatus("invalid");
        else setStatus("serviceError");
        setMessage(result.message || "No pudimos verificar tu correo en este momento.");
      } catch {
        setStatus("serviceError");
        setMessage("No pudimos comunicarnos con TramIA. Revisa tu conexión e inténtalo nuevamente.");
      }
    }
  }, [token]);

  async function requestNewLink() {
    setStatus("resending");
    setMessage("Estamos preparando un nuevo enlace de verificación.");
    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setStatus("invalid");
        setMessage("Inicia sesión para solicitar un nuevo enlace de verificación.");
        onLogin();
        return;
      }
      if (!response.ok)
        throw new Error(result.message || "No pudimos enviar un nuevo enlace.");
      if (result.alreadyVerified) {
        setStatus("alreadyVerified");
        setMessage(result.message || "Tu correo ya se encuentra verificado.");
        return;
      }
      setStatus("resent");
      setMessage(result.message || "Te enviamos un nuevo enlace de verificación.");
    } catch (error) {
      setStatus("serviceError");
      setMessage(error instanceof Error ? error.message : "No pudimos enviar un nuevo enlace.");
    }
  }

  const success = status === "success" || status === "alreadyVerified";
  const busy = status === "loading" || status === "resending";
  const needsNewLink = ["expired", "invalid", "serviceError"].includes(status);
  const Icon = busy
    ? LoaderCircle
    : success || status === "resent"
      ? CheckCircle2
      : status === "expired"
        ? Clock3
        : AlertCircle;
  const title =
    status === "loading"
      ? "Validando tu correo"
      : status === "resending"
        ? "Enviando un nuevo enlace"
        : status === "success"
          ? "Correo validado"
          : status === "alreadyVerified"
            ? "Tu correo ya está validado"
            : status === "expired"
              ? "El enlace ha expirado"
              : status === "invalid"
                ? "El enlace no es válido"
                : status === "resent"
                  ? "Nuevo enlace enviado"
                  : "No pudimos validar el correo";

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top,#dff6ff_0,#eef6ff_32%,#fff_72%)] px-4 py-10 sm:py-14">
      <section className="relative mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_28px_80px_rgba(8,45,110,.14)]">
        <div className="h-2 bg-[linear-gradient(90deg,#071a3d,#1769e0,#19b8d4)]" />
        <div className="p-7 text-center sm:p-10">
          <div className="mx-auto w-fit">
            <TramIALogo iconSize={38} textSize="text-2xl" variant="light" />
          </div>
          <img
            src={success || status === "resent" ? "/assets/mascot/tramia-bot-guiding.png" : "/assets/mascot/tramia-bot-reading.png"}
            alt="TramIA acompaña la verificación de correo"
            className="mx-auto mt-4 h-44 w-44 object-contain"
          />
          <span className={`mx-auto grid size-16 place-items-center rounded-full ${success || status === "resent" ? "bg-emerald-100 text-emerald-600" : busy ? "bg-blue-100 text-blue-600" : status === "expired" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
            <Icon className={busy ? "animate-spin" : ""} size={30} />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-blue-600">Verificación de correo</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">{message}</p>

          {!busy && (
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              {success ? (
                <button onClick={onOpenProfile} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white hover:bg-blue-700">
                  <UserRound size={17} /> Ir a mi perfil
                </button>
              ) : status === "resent" ? (
                <button onClick={onOpenProfile} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-6 text-sm font-extrabold text-blue-700 hover:bg-blue-50">
                  <UserRound size={17} /> Volver a mi perfil
                </button>
              ) : needsNewLink ? (
                <>
                  <button onClick={() => void requestNewLink()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white hover:bg-blue-700">
                    <Send size={17} /> Solicitar un nuevo enlace
                  </button>
                  <button onClick={onLogin} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-6 text-sm font-extrabold text-blue-700 hover:bg-blue-50">
                    <LogIn size={17} /> Iniciar sesión
                  </button>
                </>
              ) : null}
            </div>
          )}

          <p className="mt-6 text-xs leading-5 text-slate-500">
            {success
              ? "Tu cuenta ya reconoce este correo como validado."
              : status === "resent"
                ? "Revisa tu bandeja de entrada y también la carpeta de correo no deseado."
                : "Los enlaces de verificación son personales y tienen una vigencia de 24 horas."}
          </p>
        </div>
      </section>
    </div>
  );
}
