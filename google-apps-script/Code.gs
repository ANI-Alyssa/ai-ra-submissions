// Paste this into the sheet's Extensions -> Apps Script editor (Code.gs), then deploy as a Web
// App (Deploy -> New deployment -> type "Web app" -> Execute as "Me" -> Who has access "Anyone").
// Copy the resulting /exec URL into the main app's GOOGLE_SHEETS_WEBHOOK_URL env var.
//
// Appends one row per AI-approved submission to the target tab, in the same column order as the
// existing "Tasks + Approvals" tabs:
// A Tasks+Approvals | B Type | C ClickUp Task Link | D Asset Link | E Loom/Audio |
// F Project Status | G Publish Date | H Estimated time to complete | I Priority |
// J Project manager | K Notes

var SHARED_SECRET = "cb3c62876e4af2c1a9c82a4a205bd9a1bfe3f02c73f0dadc"; // must match GOOGLE_SHEETS_SHARED_SECRET
var TARGET_SHEET_NAME = "[test] 1.Review & Approvals"; // switch to "1.Review & Approvals" once verified

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);

  if (payload.secret !== SHARED_SECRET) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    return jsonResponse({ error: "Sheet tab not found: " + TARGET_SHEET_NAME }, 404);
  }

  sheet.appendRow([
    payload.taskName || "",
    payload.type || "",
    payload.clickupLink || "",
    payload.assetLink || "",
    payload.loomLink || "",
    payload.projectStatus || "",
    payload.publishDate || "",
    payload.estimatedTime || "",
    payload.priority || "",
    payload.projectManager || "",
    payload.notes || "",
  ]);

  return jsonResponse({ ok: true });
}

function jsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
