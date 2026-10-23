import { useState } from "react";
import GateMessage from "./GateMessage";

// Sign-in with Google (Supabase redirects to Google and back).
function LoginScreen({ onSignIn }) {
  const [failed, setFailed] = useState(false);
  async function signIn() {
    setFailed(false);
    try {
      await onSignIn();
    } catch {
      setFailed(true);
    }
  }
  return (
    <GateMessage
      title="Miga"
      action={{ label: "Entrar con Google", onClick: signIn }}
    >
      {failed
        ? "No pudimos abrir el inicio de sesión de Google. Probá de nuevo."
        : "Entrá con tu cuenta de Google para ver tus recetas en cualquier dispositivo."}
    </GateMessage>
  );
}

export default LoginScreen;
