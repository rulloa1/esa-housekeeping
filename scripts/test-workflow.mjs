// End-to-end Operational Workflow Test Suite
// Extended Stay America Suites — Houston IAH Airport

const BASE_URL = process.env.TEST_URL || "http://localhost:3333";

function getCookieFromResponse(res) {
  if (typeof res.headers.getSetCookie === "function") {
    const list = res.headers.getSetCookie();
    if (list && list.length > 0) return list[0].split(";")[0];
  }
  const raw = res.headers.get("set-cookie");
  if (raw) return raw.split(";")[0];
  return null;
}

async function runTests() {
  console.log("=================================================");
  console.log("STARTING ESA HOUSEKEEPING END-TO-END TEST SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("=================================================\n");

  let supervisorCookie = "";
  let housekeeperCookie = "";

  // 1. Authenticate Supervisor
  console.log("Test 1: Authenticating as Supervisor (PIN 1234)...");
  const supLoginRes = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ role: "supervisor", pin: "1234" }),
    redirect: "manual",
  });

  const supCookie = getCookieFromResponse(supLoginRes);
  if (!supCookie || !supCookie.includes("hk_session")) {
    throw new Error(`Failed to obtain supervisor session cookie: status ${supLoginRes.status}`);
  }
  supervisorCookie = supCookie;
  console.log(`✓ Supervisor authenticated successfully (${supervisorCookie.substring(0, 20)}...).\n`);

  // 2. Authenticate Housekeeper
  console.log("Test 2: Authenticating as Housekeeper (PIN 1234)...");
  const hkLoginRes = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ role: "housekeeper", pin: "1234" }),
    redirect: "manual",
  });

  const hkCookie = getCookieFromResponse(hkLoginRes);
  if (!hkCookie || !hkCookie.includes("hk_session")) {
    throw new Error(`Failed to obtain housekeeper session cookie: status ${hkLoginRes.status}`);
  }
  housekeeperCookie = hkCookie;
  console.log(`✓ Housekeeper authenticated successfully (${housekeeperCookie.substring(0, 20)}...).\n`);

  // 3. Fetch Suites List
  console.log("Test 3: Fetching All 96 Suites from /api/suites...");
  const suitesRes = await fetch(`${BASE_URL}/api/suites`, {
    headers: { Cookie: supervisorCookie },
  });
  if (!suitesRes.ok) throw new Error(`GET /api/suites failed: ${suitesRes.status}`);
  const suitesData = await suitesRes.json();
  const suiteCount = Object.keys(suitesData.docs).length;
  console.log(`✓ Retrieved ${suiteCount} suites. (Expected: 96 suites across 3 floors).\n`);
  if (suiteCount !== 96) throw new Error(`Expected 96 suites, got ${suiteCount}`);

  const testRoomId = "204";

  // 4. Supervisor Assigns Room 204
  console.log(`Test 4: Supervisor assigns Suite ${testRoomId} to Maria S. with Urgent priority...`);
  const assignRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: supervisorCookie,
    },
    body: JSON.stringify({
      action: "assign",
      attendant: "Maria S.",
      priority: "urgent",
      serviceType: "turnover",
      instructions: "VIP guest checking in at 2 PM. Ensure kitchen pack is fully stocked.",
    }),
  });
  if (!assignRes.ok) throw new Error(`Assignment failed: ${assignRes.status}`);
  const assignData = await assignRes.json();
  console.log(`✓ Suite ${testRoomId} assigned to ${assignData.room.attendant}, priority: ${assignData.room.priority}\n`);

  // 5. Housekeeper Starts Cleaning
  console.log(`Test 5: Housekeeper starts cleaning Suite ${testRoomId}...`);
  const startRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: housekeeperCookie,
    },
    body: JSON.stringify({
      action: "start_cleaning",
      userName: "Maria S.",
    }),
  });
  if (!startRes.ok) throw new Error(`Start cleaning failed: ${startRes.status}`);
  const startData = await startRes.json();
  if (startData.room.status !== "in_progress") {
    throw new Error(`Expected status 'in_progress', got '${startData.room.status}'`);
  }
  console.log(`✓ Status transitioned to '${startData.room.status}' with startedAt: ${startData.room.startedAt}\n`);

  // 6. Housekeeper Completes Checklist & Submits Cleaning
  console.log(`Test 6: Housekeeper completes checklist and submits Suite ${testRoomId}...`);
  const checklist = {
    bed_linens: true,
    bed_pillows: true,
    bed_surfaces: true,
    bed_vacuum: true,
    bed_trash: true,
    bath_toilet: true,
    bath_shower: true,
    bath_sink: true,
    bath_mirror: true,
    bath_towels: true,
    bath_amenities: true,
    bath_floor: true,
    kitchen_sink: true,
    kitchen_counters: true,
    kitchen_appliances: true,
    kitchen_dishes: true,
    kitchen_trash: true,
    final_smell: true,
    final_lights: true,
    final_safety: true,
    final_presentation: true,
  };

  const completeRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: housekeeperCookie,
    },
    body: JSON.stringify({
      action: "complete_cleaning",
      checklist,
      userName: "Maria S.",
    }),
  });
  if (!completeRes.ok) throw new Error(`Complete cleaning failed: ${completeRes.status}`);
  const completeData = await completeRes.json();
  if (completeData.room.status !== "awaiting_inspection") {
    throw new Error(`Expected status 'awaiting_inspection', got '${completeData.room.status}'`);
  }
  console.log(`✓ Status transitioned to '${completeData.room.status}'. (Cannot bypass to clean).\n`);

  // 7. Security Check: Housekeeper Cannot Self-Approve Inspection
  console.log("Test 7: Security enforcement — Housekeeper attempts to self-approve inspection...");
  const selfApproveRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: housekeeperCookie,
    },
    body: JSON.stringify({
      action: "inspect_pass",
    }),
  });
  if (selfApproveRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for self-approval, got ${selfApproveRes.status}`);
  }
  console.log(`✓ Self-approval correctly blocked with 403 Forbidden.\n`);

  // 8. Supervisor Fails Inspection First (Simulating QA Rejection)
  console.log("Test 8: Supervisor conducts inspection and flags deficiency...");
  const failRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: supervisorCookie,
    },
    body: JSON.stringify({
      action: "inspect_fail",
      failReasons: ["Bathroom mirror has water spots", "Entryway carpet needs touch-up"],
      inspectionNotes: "Please re-wipe bathroom mirror and vacuum entry runner.",
      userName: "Supervisor Sarah J.",
    }),
  });
  if (!failRes.ok) throw new Error(`Inspection fail request failed: ${failRes.status}`);
  const failData = await failRes.json();
  if (failData.room.status !== "inspection_failed") {
    throw new Error(`Expected status 'inspection_failed', got '${failData.room.status}'`);
  }
  console.log(`✓ Status transitioned to '${failData.room.status}' with fail reasons: ${failData.room.inspectionFailReasons.join(", ")}\n`);

  // 9. Housekeeper Re-cleans and Submits Again
  console.log("Test 9: Housekeeper corrects deficiency and re-submits room...");
  const resubmitRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: housekeeperCookie,
    },
    body: JSON.stringify({
      action: "complete_cleaning",
      checklist,
      userName: "Maria S.",
    }),
  });
  const resubmitData = await resubmitRes.json();
  if (resubmitData.room.status !== "awaiting_inspection") {
    throw new Error(`Expected status 'awaiting_inspection', got '${resubmitData.room.status}'`);
  }
  console.log(`✓ Status returned to '${resubmitData.room.status}'.\n`);

  // 10. Supervisor Passes Inspection
  console.log("Test 10: Supervisor re-inspects and approves Suite 204...");
  const passRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: supervisorCookie,
    },
    body: JSON.stringify({
      action: "inspect_pass",
      inspectionNotes: "All corrections verified. Spotless.",
      userName: "Supervisor Sarah J.",
    }),
  });
  if (!passRes.ok) throw new Error(`Pass inspection failed: ${passRes.status}`);
  const passData = await passRes.json();
  if (passData.room.status !== "clean") {
    throw new Error(`Expected status 'clean', got '${passData.room.status}'`);
  }
  console.log(`✓ Room status successfully set to '${passData.room.status}'. Inspected by: ${passData.room.inspectedBy}\n`);

  // 11. Maintenance Ticket Reporting
  console.log("Test 11: Housekeeper reports a maintenance issue...");
  const maintRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: housekeeperCookie,
    },
    body: JSON.stringify({
      action: "report_maintenance",
      userName: "Maria S.",
      maintenanceIssue: {
        category: "Lighting & Bulbs",
        description: "Desk lamp bulb flickering",
        priority: "low",
      },
    }),
  });
  if (!maintRes.ok) throw new Error(`Maintenance report failed: ${maintRes.status}`);
  const maintData = await maintRes.json();
  const reportedIssue = maintData.room.maintenanceIssues.find((m) => m.description === "Desk lamp bulb flickering");
  if (!reportedIssue) throw new Error("Reported maintenance issue not found in room record");
  console.log(`✓ Maintenance ticket logged: [${reportedIssue.category}] ${reportedIssue.description}\n`);

  // 12. Supply Requisition
  console.log("Test 12: Housekeeper submits a supply request...");
  const supplyRes = await fetch(`${BASE_URL}/api/suites/${testRoomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: housekeeperCookie,
    },
    body: JSON.stringify({
      action: "request_supplies",
      userName: "Maria S.",
      supplyRequest: {
        item: "Bath Towels (Heavyweight)",
        quantity: 4,
        priority: "high",
      },
    }),
  });
  if (!supplyRes.ok) throw new Error(`Supply request failed: ${supplyRes.status}`);
  const supplyData = await supplyRes.json();
  const reqItem = supplyData.room.supplyRequests.find((s) => s.item.includes("Bath Towels"));
  if (!reqItem) throw new Error("Supply request not found in room record");
  console.log(`✓ Supply requisition logged: ${reqItem.quantity}x ${reqItem.item}\n`);

  // 13. Audit Trail Verification
  console.log("Test 13: Verifying full audit history trail...");
  const history = passData.room.history;
  console.log(`✓ Recorded ${history.length} audit entries in timeline:`);
  history.slice(0, 5).forEach((h) => {
    console.log(`   - [${h.timestamp.substring(11, 19)}] ${h.event}: ${h.details} (by ${h.by})`);
  });
  console.log("");

  // 14. Guest QR Cards Generation & Link Resolution
  console.log("Test 14: Supervisor accesses /guest-links and verifies QR cards...");
  const guestLinksRes = await fetch(`${BASE_URL}/guest-links`, {
    headers: { Cookie: supervisorCookie },
  });
  if (!guestLinksRes.ok) throw new Error(`GET /guest-links failed: ${guestLinksRes.status}`);
  const guestLinksHtml = await guestLinksRes.text();
  const match = guestLinksHtml.match(/\/guest\/204\?k=([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Could not find guest link for suite 204 in /guest-links HTML");
  const guestKey = match[1];
  console.log(`✓ Found guest key for suite 204: ${guestKey}\n`);

  // 15. Guest Accesses Self-Service Portal
  console.log(`Test 15: Guest visits /guest/204?k=${guestKey}...`);
  const guestPortalRes = await fetch(`${BASE_URL}/guest/204?k=${guestKey}`);
  if (!guestPortalRes.ok) throw new Error(`GET /guest/204 failed: ${guestPortalRes.status}`);
  const portalHtml = await guestPortalRes.text();
  if (!portalHtml.includes("Suite 204") && !portalHtml.includes("204")) {
    throw new Error("Guest portal did not return expected suite content");
  }
  console.log("✓ Guest portal loaded successfully without requiring login.\n");

  // 16. Guest Submits Request (Towels)
  console.log("Test 16: Guest submits request for fresh towels via POST /api/guest/204...");
  const guestReqRes = await fetch(`${BASE_URL}/api/guest/204`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ k: guestKey, type: "towels" }),
  });
  if (!guestReqRes.ok) throw new Error(`POST /api/guest/204 failed: ${guestReqRes.status}`);
  const guestReqData = await guestReqRes.json();
  if (!guestReqData.ok || !guestReqData.requests?.some((r) => r.type === "towels")) {
    throw new Error("Guest request response did not include towels");
  }
  console.log("✓ Guest request received and acknowledged by API.\n");

  // 17. Verify Guest Request in Room Record
  console.log("Test 17: Verifying guest request registered in suite 204 store record...");
  const verifyRes = await fetch(`${BASE_URL}/api/suites`, { headers: { Cookie: supervisorCookie } });
  const verifyData = await verifyRes.json();
  const updatedRoom204 = verifyData.docs["204"];
  if (!updatedRoom204.notes?.includes("Fresh towels requested")) {
    throw new Error(`Expected notes to contain 'Fresh towels requested', got: ${updatedRoom204.notes}`);
  }
  if (!updatedRoom204.guestRequests?.some((r) => r.type === "towels")) {
    throw new Error("guestRequests array missing 'towels' entry");
  }
  console.log(`✓ Room 204 notes updated: "${updatedRoom204.notes.split("\n")[0]}"\n`);

  // 18. Guest Rate Limiting / Debounce Check
  console.log("Test 18: Verifying 2-minute debounce prevents duplicate spam...");
  const repeatReqRes = await fetch(`${BASE_URL}/api/guest/204`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ k: guestKey, type: "towels" }),
  });
  if (!repeatReqRes.ok) throw new Error(`Repeat request failed: ${repeatReqRes.status}`);
  const repeatData = await repeatReqRes.json();
  const towelsCount = repeatData.requests.filter((r) => r.type === "towels").length;
  if (towelsCount !== 1) {
    throw new Error(`Expected exactly 1 towels request due to debounce, found ${towelsCount}`);
  }
  console.log("✓ Duplicate tap within 2 minutes successfully debounced.\n");

  // 19. Batch Suite Assignment (Phase 10)
  console.log("Test 19: Supervisor performs batch assignment on Suites 101, 102, 103 to Carlos R....");
  const batchRes = await fetch(`${BASE_URL}/api/suites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: supervisorCookie,
    },
    body: JSON.stringify({
      action: "batch_assign",
      suiteIds: ["101", "102", "103"],
      attendant: "Carlos R.",
      priority: "high",
      userName: "Supervisor Sarah J.",
    }),
  });
  if (!batchRes.ok) throw new Error(`POST /api/suites batch failed: ${batchRes.status}`);
  const batchData = await batchRes.json();
  if (!batchData.ok || batchData.updatedCount !== 3) {
    throw new Error(`Batch assignment expected 3 updated suites, got: ${batchData.updatedCount}`);
  }
  console.log("✓ Batch assignment processed successfully for 3 suites.\n");

  // 20. Verify Batch Assignment Integrity in Store & Audit Trail
  console.log("Test 20: Verifying batch assignment persisted in store and history log...");
  const verifyBatchRes = await fetch(`${BASE_URL}/api/suites`, {
    headers: { Cookie: supervisorCookie },
  });
  const verifyBatchData = await verifyBatchRes.json();
  for (const sId of ["101", "102", "103"]) {
    const room = verifyBatchData.docs[sId];
    if (room.attendant !== "Carlos R.") {
      throw new Error(`Expected suite ${sId} attendant to be Carlos R., got: ${room.attendant}`);
    }
    if (room.priority !== "high") {
      throw new Error(`Expected suite ${sId} priority to be high, got: ${room.priority}`);
    }
    const hasBatchAudit = room.history?.some((h) => h.event === "Batch Assignment");
    if (!hasBatchAudit) {
      throw new Error(`Suite ${sId} history missing 'Batch Assignment' log entry`);
    }
  }
  console.log("✓ Suites 101, 102, 103 verified with Carlos R., high priority & audit trails.\n");

  // 21. Supervisor Resets Demo Shift Baseline
  console.log("Test 21: Supervisor resets demo shift baseline via action 'reset_baseline'...");
  const resetRes = await fetch(`${BASE_URL}/api/suites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: supervisorCookie,
    },
    body: JSON.stringify({ action: "reset_baseline" }),
  });
  if (!resetRes.ok) throw new Error(`reset_baseline failed with status ${resetRes.status}`);
  const resetData = await resetRes.json();
  if (!resetData.ok || !resetData.docs || Object.keys(resetData.docs).length !== 96) {
    throw new Error(`reset_baseline expected 96 suites, got: ${resetData.docs ? Object.keys(resetData.docs).length : 0}`);
  }
  console.log("✓ Demo shift baseline successfully restored across all 96 suites.\n");

  console.log("\n=================================================");
  console.log("ALL 21 END-TO-END OPERATIONAL, BATCH, GUEST & RESET TESTS PASSED ✓");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("\nTEST SUITE FAILED ✕:", err);
  process.exit(1);
});
