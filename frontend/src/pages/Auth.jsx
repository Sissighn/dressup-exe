import "../components/features/auth/auth-layout.css";
import "../components/features/auth/auth-preview.css";
import "../components/features/auth/auth-form.css";
import "../components/features/auth/auth-responsive.css";
import designImage from "../assets/design.png";
import AuthPreviewPanel from "../components/features/auth/AuthPreviewPanel";
import AuthFormCard from "../components/features/auth/AuthFormCard";
import { useAuthFlow } from "../components/features/auth/useAuthFlow";

const Auth = ({ onAuthSuccess }) => {
  const authFlow = useAuthFlow(onAuthSuccess);

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-visual" aria-hidden="true">
          <img src={designImage} alt="" className="auth-visual-image" />
        </section>

        <AuthPreviewPanel />

        <AuthFormCard
          mode={authFlow.mode}
          setMode={authFlow.setMode}
          email={authFlow.email}
          setEmail={authFlow.setEmail}
          password={authFlow.password}
          onPasswordChange={authFlow.handlePasswordChange}
          error={authFlow.error}
          isLoading={authFlow.isLoading}
          isRegister={authFlow.isRegister}
          requirementChecks={authFlow.requirementChecks}
          areAllRequirementsMet={authFlow.areAllRequirementsMet}
          onSubmit={authFlow.submitAuth}
          onContinueAsGuest={authFlow.continueAsGuest}
        />
      </div>
    </div>
  );
};

export default Auth;
