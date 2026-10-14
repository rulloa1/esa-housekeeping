import os
import base64
import subprocess
import fitz

def get_base64(filepath):
    with open(filepath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def main():
    root = r"c:\Users\roryulloa\esa-housekeeping"
    assets_dir = os.path.join(root, "public", "pdf-assets")
    
    img_0_b64 = get_base64(os.path.join(assets_dir, "img_0.jpeg"))
    img_1_b64 = get_base64(os.path.join(assets_dir, "img_1.png"))
    img_2_b64 = get_base64(os.path.join(assets_dir, "img_2.png"))
    img_3_b64 = get_base64(os.path.join(assets_dir, "img_3.png"))
    
    # We can also get the king suite image from public/banners/suite-king.jpg
    suite_img_path = os.path.join(root, "public", "banners", "suite-king.jpg")
    suite_b64 = get_base64(suite_img_path) if os.path.exists(suite_img_path) else img_0_b64

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Housekeeping App Overview</title>
  <style>
    @page {{
      size: letter portrait;
      margin: 0;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D3748;
      background-color: #FFFFFF;
      width: 8.5in;
      height: 11in;
      position: relative;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }}

    /* Subtle Diagonal Watermarks matching original */
    .watermark-layer {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      overflow: hidden;
    }}
    .watermark {{
      position: absolute;
      font-size: 13px;
      font-weight: 700;
      color: rgba(185, 160, 130, 0.14);
      transform: rotate(-32deg);
      user-select: none;
      letter-spacing: 0.5px;
    }}

    /* Header Banner */
    .header-banner {{
      position: relative;
      height: 1.85in;
      background-image: url('data:image/jpeg;base64,{img_0_b64}');
      background-size: cover;
      background-position: center 30%;
      padding: 24px 34px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      color: #FFFFFF;
    }}
    .header-overlay {{
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(35, 95, 20, 0.92) 0%, rgba(20, 65, 15, 0.86) 60%, rgba(15, 45, 12, 0.90) 100%);
      z-index: 1;
    }}
    .header-content {{
      position: relative;
      z-index: 2;
    }}
    .header-logo {{
      height: 38px;
      width: auto;
      margin-bottom: 10px;
      display: block;
    }}
    .header-eyebrow {{
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      opacity: 0.95;
      margin-bottom: 3px;
    }}
    .header-title {{
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.4px;
      line-height: 1.15;
      margin-bottom: 4px;
      color: #FFFFFF;
      text-shadow: 0 1px 3px rgba(0,0,0,0.25);
    }}
    .header-subtitle {{
      font-size: 13px;
      opacity: 0.96;
      font-weight: 400;
      letter-spacing: -0.1px;
      line-height: 1.3;
    }}

    /* Main Container */
    .content-wrap {{
      padding: 16px 34px 18px;
      position: relative;
      z-index: 5;
    }}

    /* Intro Narrative */
    .lead-text {{
      font-size: 11.8px;
      line-height: 1.48;
      color: #374151;
      margin-bottom: 14px;
    }}
    .lead-text strong {{
      color: #1F2937;
    }}
    .lead-text .highlight {{
      color: #1E6B15;
      font-weight: 700;
    }}

    /* Product Preview Cards Grid */
    .cards-grid {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 13px;
      margin-bottom: 15px;
    }}
    .preview-card {{
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 9px;
      overflow: hidden;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
    }}
    .card-thumb {{
      height: 130px;
      background: #F3F4F6;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #E5E7EB;
    }}
    .card-thumb img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }}

    /* Synthetic Digital Key Mockup for Card 3 */
    .guest-mockup {{
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, rgba(20,20,20,0.55) 0%, rgba(10,10,10,0.85) 100%), url('data:image/jpeg;base64,{suite_b64}');
      background-size: cover;
      background-position: center;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #FFFFFF;
      font-family: 'Inter', sans-serif;
    }}
    .guest-mockup-top {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .guest-pill {{
      font-size: 8px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(4px);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }}
    .guest-lang {{
      font-size: 7.5px;
      font-weight: 800;
      display: flex;
      gap: 2px;
      background: rgba(0,0,0,0.35);
      padding: 1px 3px;
      border-radius: 4px;
    }}
    .guest-lang span.active {{
      background: #338802;
      color: #FFF;
      padding: 1px 4px;
      border-radius: 3px;
    }}
    .guest-mockup-center {{
      text-align: center;
      padding: 4px 0;
    }}
    .guest-suite-title {{
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.3px;
      margin-bottom: 1px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.6);
    }}
    .guest-suite-sub {{
      font-size: 8.5px;
      opacity: 0.9;
      margin-bottom: 6px;
    }}
    .guest-key-btn {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      background: linear-gradient(135deg, #338802 0%, #256601 100%);
      color: #FFFFFF;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.3px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }}
    .guest-quick-row {{
      display: flex;
      gap: 4px;
      justify-content: center;
    }}
    .guest-chip {{
      background: rgba(255, 255, 255, 0.92);
      color: #1F2937;
      font-size: 7.5px;
      font-weight: 700;
      padding: 2.5px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 3px;
    }}

    .card-body {{
      padding: 8px 10px 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }}
    .card-title {{
      font-size: 12px;
      font-weight: 800;
      color: #1F2937;
      margin-bottom: 2px;
    }}
    .card-desc {{
      font-size: 9.8px;
      color: #6B7280;
      line-height: 1.35;
    }}

    /* Section: What It Does */
    .section-head {{
      font-size: 14.5px;
      font-weight: 800;
      color: #1E6B15;
      margin-bottom: 9px;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.2px;
    }}
    .section-head::after {{
      content: '';
      flex: 1;
      height: 1px;
      background: #E5E7EB;
    }}

    .features-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 22px;
      row-gap: 9px;
      margin-bottom: 13px;
    }}
    .feature-item {{
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }}
    .feature-num {{
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: #DEF7EC;
      color: #0E9F6E;
      font-size: 9.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }}
    .feature-text {{
      font-size: 10px;
      line-height: 1.38;
      color: #4B5563;
    }}
    .feature-text strong {{
      color: #111827;
      font-weight: 700;
    }}

    /* Capabilities Pills */
    .pills-wrap {{
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 12px;
    }}
    .spec-pill {{
      padding: 3px 9px;
      border-radius: 14px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      color: #374151;
      font-size: 9.2px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }}
    .spec-pill.highlight {{
      background: #F0FDF4;
      border-color: #BBF7D0;
      color: #166534;
      font-weight: 700;
    }}

    /* Callout Live Action Card */
    .live-callout {{
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 9px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }}
    .callout-left {{
      display: flex;
      flex-direction: column;
    }}
    .callout-eyebrow {{
      font-size: 8px;
      font-weight: 800;
      color: #166534;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 1px;
    }}
    .callout-link {{
      font-size: 14.5px;
      font-weight: 900;
      color: #1E6B15;
      text-decoration: none;
      letter-spacing: -0.2px;
    }}
    .callout-right {{
      font-size: 9px;
      color: #4B5563;
      text-align: right;
      line-height: 1.35;
      max-width: 280px;
    }}

    /* Mockup Notice */
    .disclaimer-box {{
      border-left: 2.5px solid #D97706;
      padding: 3px 0 3px 8px;
      margin-bottom: 12px;
    }}
    .disclaimer-text {{
      font-size: 8px;
      line-height: 1.35;
      color: #6B7280;
    }}
    .disclaimer-text strong {{
      color: #374151;
    }}

    /* Footer Strip */
    .footer-bar {{
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 0.38in;
      background: #1F2937;
      color: #9CA3AF;
      padding: 0 34px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      font-weight: 500;
      z-index: 5;
    }}
    .footer-bar span.accent {{
      color: #F3F4F6;
      font-weight: 600;
    }}
  </style>
</head>
<body>

  <!-- Background Watermarks -->
  <div class="watermark-layer">
    <div class="watermark" style="top: 180px; left: 40px;">theroyeffect.com</div>
    <div class="watermark" style="top: 190px; left: 380px;">theroyeffect.com</div>
    <div class="watermark" style="top: 200px; left: 660px;">theroyeffect.com</div>
    <div class="watermark" style="top: 360px; left: 20px;">theroyeffect.com</div>
    <div class="watermark" style="top: 380px; left: 370px;">theroyeffect.com</div>
    <div class="watermark" style="top: 550px; left: 10px;">theroyeffect.com</div>
    <div class="watermark" style="top: 580px; left: 360px;">theroyeffect.com</div>
    <div class="watermark" style="top: 560px; left: 680px;">theroyeffect.com</div>
    <div class="watermark" style="top: 730px; left: 15px;">theroyeffect.com</div>
    <div class="watermark" style="top: 760px; left: 390px;">theroyeffect.com</div>
    <div class="watermark" style="top: 750px; left: 690px;">theroyeffect.com</div>
  </div>

  <!-- Header Banner -->
  <header class="header-banner">
    <div class="header-overlay"></div>
    <div class="header-content">
      <img class="header-logo" src="data:image/png;base64,{img_1_b64}" alt="Extended Stay America Suites">
      <div class="header-eyebrow">HOUSTON IAH AIRPORT · 96 SUITES</div>
      <h1 class="header-title">Housekeeping Operations App</h1>
      <p class="header-subtitle">One live operational view for front desk, supervisors, housekeepers, and guests.</p>
    </div>
  </header>

  <!-- Body Content -->
  <main class="content-wrap">

    <!-- Overview Statement -->
    <p class="lead-text">
      We built a cloud web app that replaces paper boards, physical master keys, and radio calls with <span class="highlight">live suite and electronic lock status on the iPads and phones staff already use</span>. Supervisors dispatch suites and monitor floor readiness, housekeepers complete 21-point turnover checklists with deadbolt privacy detection, and guests unlock their doors with digital keys or request service from an in-suite QR card. Every action synchronizes instantly across all devices.
    </p>

    <!-- 3 Preview Cards Grid -->
    <div class="cards-grid">
      <!-- Card 1: Front Desk Board -->
      <div class="preview-card">
        <div class="card-thumb">
          <img src="data:image/png;base64,{img_2_b64}" alt="Front desk board">
        </div>
        <div class="card-body">
          <div class="card-title">Front desk board</div>
          <div class="card-desc">Live room readiness, urgent priorities, floor meters, and lock battery/DND status at a glance.</div>
        </div>
      </div>

      <!-- Card 2: Housekeeper View -->
      <div class="preview-card">
        <div class="card-thumb">
          <img src="data:image/png;base64,{img_3_b64}" alt="Housekeeper view">
        </div>
        <div class="card-body">
          <div class="card-title">Housekeeper view</div>
          <div class="card-desc">Assigned suites, 21-point checklist, turn/stay tags, and live deadbolt (DND) detection.</div>
        </div>
      </div>

      <!-- Card 3: Keyless Guest Portal -->
      <div class="preview-card">
        <div class="card-thumb">
          <div class="guest-mockup">
            <div class="guest-mockup-top">
              <span class="guest-pill">Suite 101 · Floor 1</span>
              <div class="guest-lang">
                <span class="active">EN</span>
                <span style="opacity:0.7">ES</span>
              </div>
            </div>
            <div class="guest-mockup-center">
              <div class="guest-suite-title">Keyless Mobile Entry</div>
              <div class="guest-suite-sub">Onity Trillium DirectKey BLE Lock</div>
              <div class="guest-key-btn">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Unlock Suite 101</span>
              </div>
            </div>
            <div class="guest-quick-row">
              <div class="guest-chip">
                <span>🔒</span><span>Privacy Deadbolt</span>
              </div>
              <div class="guest-chip">
                <span>🛎️</span><span>Fresh Towels</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">Keyless & guest page</div>
          <div class="card-desc">Mobile BLE unlock with solenoid acoustic chime, privacy deadbolt sync, and service requests.</div>
        </div>
      </div>
    </div>

    <!-- Section: What It Does -->
    <div class="section-head">What it does</div>

    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-num">1</div>
        <div class="feature-text">
          <strong>Live room & lock status.</strong> Dirty, cleaning in progress, awaiting inspection, clean, maintenance, and privacy deadbolt (DND) for every suite, synced in real time.
        </div>
      </div>

      <div class="feature-item">
        <div class="feature-num">2</div>
        <div class="feature-text">
          <strong>Assign in bulk & workload.</strong> Supervisors assign multiple suites to an attendant with priorities (urgent, high, standard) and balance housekeeping workloads live.
        </div>
      </div>

      <div class="feature-item">
        <div class="feature-num">3</div>
        <div class="feature-text">
          <strong>Checklists and inspection.</strong> A 21-item cleaning checklist with dual QA: housekeepers cannot self-approve; supervisors inspect and log photo-verified tickets.
        </div>
      </div>

      <div class="feature-item">
        <div class="feature-num">4</div>
        <div class="feature-text">
          <strong>Keyless entry & lock health.</strong> Secure BLE unlock matching commercial Onity Trillium mortise locks; staff monitors 4x AA battery pack voltage and signal RSSI.
        </div>
      </div>

      <div class="feature-item">
        <div class="feature-num">5</div>
        <div class="feature-text">
          <strong>Guest requests by QR.</strong> Each suite has a signed QR card. Guests unlock doors and request towels, cleaning, or DND with zero login or app download required.
        </div>
      </div>

      <div class="feature-item">
        <div class="feature-num">6</div>
        <div class="feature-text">
          <strong>Reports & multi-brand.</strong> Cleaning velocity, first-pass QA rates, printable morning shift rosters, and instant multi-brand hotel switching (ESA, Marriott, Hilton, Hyatt).
        </div>
      </div>
    </div>

    <!-- Feature Pills -->
    <div class="pills-wrap">
      <span class="spec-pill highlight">Keyless Mobile Entry (BLE/RFID)</span>
      <span class="spec-pill">iPad & phone first</span>
      <span class="spec-pill">English / Spanish for staff and guests</span>
      <span class="spec-pill">3D building board by floor</span>
      <span class="spec-pill">Onity Lock Hardware Telemetry</span>
      <span class="spec-pill">Universal Hotel White-Labeling</span>
      <span class="spec-pill">Role-based staff sign-in</span>
      <span class="spec-pill highlight">Nothing to install, runs in the browser</span>
    </div>

    <!-- Live Callout Box -->
    <div class="live-callout">
      <div class="callout-left">
        <span class="callout-eyebrow">SEE IT LIVE</span>
        <span class="callout-link">esa-housekeeping.theroyeffect.com</span>
      </div>
      <div class="callout-right">
        Concept mock-up for operational review.<br>Staff sign-in PINs are shared separately.
      </div>
    </div>

    <!-- Concept Mockup Disclaimer -->
    <div class="disclaimer-box">
      <p class="disclaimer-text">
        <strong>Concept mock-up.</strong> This is an independent prototype by theroyeffect.com, not an official Extended Stay America or J&P Asset Management website or product. ESA names, logos and photos are shown for illustration only, and all room data is sample data.
      </p>
    </div>

  </main>

  <!-- Footer Strip -->
  <footer class="footer-bar">
    <span><span class="accent">Extended Stay America Suites</span> · Houston IAH Airport</span>
    <span>© 2026 theroyeffect.com</span>
    <span>1500 N Sam Houston Pkwy E, Houston, TX 77032</span>
  </footer>

</body>
</html>"""

    html_path = os.path.join(root, "public", "pdf-assets", "overview_template.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Wrote HTML template to", html_path)

    # Output paths
    downloads_pdf = r"C:\Users\roryulloa\Downloads\ESA-IAH-Housekeeping-App-Overview.pdf"
    docs_dir = os.path.join(root, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    docs_pdf = os.path.join(docs_dir, "ESA-IAH-Housekeeping-App-Overview.pdf")
    brain_pdf = r"C:\Users\roryulloa\.gemini\antigravity-ide\brain\64f8f55f-2084-4875-bd51-5edd4ca34688\ESA-IAH-Housekeeping-App-Overview.pdf"

    edge_bin = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    cmd = [
        edge_bin,
        "--headless",
        "--disable-gpu",
        "--no-margins",
        "--no-pdf-header-footer",
        f"--print-to-pdf={downloads_pdf}",
        html_path
    ]
    
    print("Running Edge headless print...")
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
        print("Edge stdout:", res.stdout)
        print("Edge stderr:", res.stderr)
    except subprocess.TimeoutExpired:
        print("Edge print completed (timed out waiting for exit, proceeding)")

    if os.path.exists(downloads_pdf):
        print("Successfully generated:", downloads_pdf, "Size:", os.path.getsize(downloads_pdf))
        # Copy to docs and brain
        import shutil
        shutil.copy2(downloads_pdf, docs_pdf)
        shutil.copy2(downloads_pdf, brain_pdf)
        print("Copied to", docs_pdf, "and", brain_pdf)

        # Render preview PNG with PyMuPDF
        doc = fitz.open(downloads_pdf)
        pix = doc[0].get_pixmap(dpi=150)
        preview_png = r"C:\Users\roryulloa\.gemini\antigravity-ide\brain\64f8f55f-2084-4875-bd51-5edd4ca34688\updated_overview_pdf_p1.png"
        pix.save(preview_png)
        print("Saved preview image to", preview_png)

if __name__ == "__main__":
    main()
