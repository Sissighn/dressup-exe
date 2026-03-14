const AuthPreviewPanel = () => {
  return (
    <section className="auth-preview">
      <p className="auth-kicker">WELCOME</p>
      <h1 className="auth-preview-title">dressup.exe</h1>
      <p className="auth-preview-subtitle">
        Build your digital model, style complete outfits, and save your looks in
        a personal AI lookbook.
      </p>

      <div className="auth-preview-demo" aria-hidden="true">
        <div className="auth-demo-topbar">
          <span>PRODUCT PREVIEW</span>
          <span>What you unlock after login</span>
        </div>
        <div className="auth-demo-grid">
          <div className="auth-demo-step">
            <small>STEP 01</small>
            <strong>Create your model</strong>
            <span>Face scan + biometrics</span>
          </div>
          <div className="auth-demo-step">
            <small>STEP 02</small>
            <strong>Build your closet</strong>
            <span>Upload tops & bottoms</span>
          </div>
          <div className="auth-demo-step">
            <small>STEP 03</small>
            <strong>Generate outfits</strong>
            <span>AI-styled full-body looks</span>
          </div>
          <div className="auth-demo-step">
            <small>STEP 04</small>
            <strong>Archive in lookbook</strong>
            <span>Save and compare results</span>
          </div>
        </div>

        <div className="auth-demo-lookbook-strip">
          <div className="auth-demo-look" />
          <div className="auth-demo-look" />
          <div className="auth-demo-look" />
        </div>
      </div>

      <div className="auth-preview-block">
        <h3>How it works</h3>
        <ul>
          <li>Upload a face scan and create your digital twin</li>
          <li>Select tops and bottoms from your closet</li>
          <li>Generate and archive your styled outfit results</li>
        </ul>
      </div>
    </section>
  );
};

export default AuthPreviewPanel;
