const subject = "Access Credentials: ESA Houston IAH Housekeeping Operations Platform";
const body = `Dear General Manager,

Your executive access to the Extended Stay America Suites — Houston IAH Airport Housekeeping Operations Platform is now active.

==================================================
SIGN-IN CREDENTIALS & ACCESS
==================================================
• Portal URL: https://esa-housekeeping-eight.vercel.app/login
• Role: Administrator (or Supervisor)
• Administrator PIN: 9999
• Supervisor PIN: 1234

==================================================
EXECUTIVE FEATURES & WORKFLOWS
==================================================
• Property-Wide Real-Time Status: Full 96 suites (Floors 1–3) with live turnaround meters.
• Operations & QA Inspections: 7-category quality assurance checklists and defect logging.
• Maintenance Dispatch: Real-time work order tracking with automated out-of-order suite isolation.
• Interactive 3D Building Model: 3D floorplan visualization at /housekeeping.
• Operational Reporting: One-click CSV export of daily shift rosters and attendant performance metrics.
• Mobile Attendant Workspace: Smartphone interface for room attendants at /housekeeper (PIN: 1234).
• Guest Self-Service: Contactless QR cards for guest towel and amenity requests at /guest-links.

Please let us know if you need any adjustments or custom staff roles configured.

Best regards,
Extended Stay America — Houston IAH Airport
Housekeeping & Operations Team`;

const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
console.log(mailto);
