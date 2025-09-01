// Check if logged in
const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
if (!loggedInUser) {
  alert("Please login first.");
  window.location.href = "index.html";
}

// Get patient type from URL
const urlParams = new URLSearchParams(window.location.search);
const patientType = urlParams.get("type");
if (!patientType || !["guest", "employee"].includes(patientType)) {
  alert("Invalid patient type.");
  window.location.href = "dashboard.html";
}

// Set page title accordingly
document.getElementById("pageTitle").textContent = `View My ${patientType.charAt(0).toUpperCase() + patientType.slice(1)} Records`;

const recordsTable = document.getElementById("recordsTable");
const backBtn = document.getElementById("backBtn");
const printBtn = document.getElementById("printBtn");
const exportBtn = document.getElementById("exportBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const downloadStatsBtn = document.getElementById("downloadStatsBtn");

backBtn.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

// Fields in the same order as form.js to keep consistency
const employeeExtraFields = [
  { id: "patientID", label: "Patient ID" },
];

const commonFields = [
  { id: "patientName", label: "Patient Name" },
  { id: "patientAge", label: "Age" },
  { id: "sex", label: "Sex" },
  { id: "patientAddress", label: "Address" },
  { id: "civilStatus", label: "Civil Status" },
  { id: "department", label: "Department" },
  { id: "walkInDate", label: "Walk-in Date" },
  { id: "chiefComplaint", label: "Chief Complaint" },
  { id: "history", label: "History of Past Illness" },
  { id: "medication", label: "Medication" },
];

const fields = patientType === "employee" ? [...employeeExtraFields, ...commonFields] :
  // guest excludes patientID, civilStatus, department
  commonFields.filter(f => !["civilStatus", "department"].includes(f.id));

// Render table header
function renderTableHeader() {
  recordsTable.innerHTML = "";
  const header = recordsTable.createTHead();
  const row = header.insertRow();

  fields.forEach(f => {
    const th = document.createElement("th");
    th.textContent = f.label;
    row.appendChild(th);
  });

  // Extra columns
  ["Timestamp", "Actions"].forEach(txt => {
    const th = document.createElement("th");
    th.textContent = txt;
    row.appendChild(th);
  });
}

// Load records saved by current user and patient type
function loadRecords() {
  const allPatients = JSON.parse(localStorage.getItem("patients")) || [];
  return allPatients.filter(p => p.type === patientType && p.savedBy === loggedInUser.username);
}

// Render records table body
function renderRecords() {
  renderTableHeader();
  const patients = loadRecords();

  const tbody = recordsTable.createTBody();

  patients.forEach(p => {
    const row = tbody.insertRow();

    fields.forEach(f => {
      const cell = row.insertCell();
      if (f.id === "sex") {
        cell.textContent = p.sex === "M" ? "Male" : "Female";
      } else if (f.id === "chiefComplaint" && p.chiefComplaint === "Other" && p.otherChiefComplaint) {
        cell.textContent = p.otherChiefComplaint;
      } else {
        cell.textContent = p[f.id] || "";
      }
    });

    // Timestamp cell
    const cellTimestamp = row.insertCell();
    cellTimestamp.textContent = p.timestamp || "";

    // Actions cell - Delete button for each record
    const cellActions = row.insertCell();
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.style.color = "red";
    delBtn.onclick = () => {
      if (confirm("Are you sure you want to delete this record?")) {
        deleteRecord(p.id);
      }
    };
    cellActions.appendChild(delBtn);
  });
}

// Delete a single record by id
function deleteRecord(id) {
  let allPatients = JSON.parse(localStorage.getItem("patients")) || [];
  allPatients = allPatients.filter(p => p.id !== id);
  localStorage.setItem("patients", JSON.stringify(allPatients));
  renderRecords();
}

// Print records table
printBtn.addEventListener("click", () => {
  const printContents = recordsTable.outerHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = `<h1>${document.getElementById("pageTitle").textContent}</h1>` + printContents;
  window.print();
  document.body.innerHTML = originalContents;

  // Re-attach event listeners after printing
  attachEventListeners();
  renderRecords();
});

// Export to Excel (CSV) function
exportBtn.addEventListener("click", () => {
  const patients = loadRecords();
  if (patients.length === 0) {
    alert("No records to export.");
    return;
  }

  // Prepare CSV headers
  const headers = fields.map(f => `"${f.label}"`).join(",") + `,"Timestamp"`;

  const csvRows = [headers];

  patients.forEach(p => {
    const row = fields.map(f => {
      if (f.id === "sex") {
        return p.sex === "M" ? '"Male"' : '"Female"';
      } else if (f.id === "chiefComplaint" && p.chiefComplaint === "Other" && p.otherChiefComplaint) {
        return `"${p.otherChiefComplaint.replace(/"/g, '""')}"`;
      } else {
        return `"${(p[f.id] || "").replace(/"/g, '""')}"`;
      }
    });
    row.push(`"${p.timestamp || ""}"`);
    csvRows.push(row.join(","));
  });

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${patientType}_records_${loggedInUser.username}.csv`;
  a.click();

  URL.revokeObjectURL(url);
});

// Delete all records for current user and patient type
deleteAllBtn.addEventListener("click", () => {
  if (confirm(`Are you sure you want to delete ALL your ${patientType} records? This action cannot be undone.`)) {
    let allPatients = JSON.parse(localStorage.getItem("patients")) || [];
    allPatients = allPatients.filter(p => !(p.type === patientType && p.savedBy === loggedInUser.username));
    localStorage.setItem("patients", JSON.stringify(allPatients));
    renderRecords();
  }
});

// New function: Download complaint and medication stats CSV
downloadStatsBtn.addEventListener("click", () => {
  const patients = loadRecords();
  if (patients.length === 0) {
    alert("No records to generate stats from.");
    return;
  }

  // Helper to count occurrences
  function countOccurrences(items) {
    const counts = {};
    items.forEach(item => {
      if (!item) return;
      counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
  }

  // Collect chief complaints properly (considering "Other")
  const complaintList = patients.map(p => {
    if (p.chiefComplaint === "Other" && p.otherChiefComplaint) {
      return p.otherChiefComplaint;
    }
    return p.chiefComplaint;
  });
  const complaintCounts = countOccurrences(complaintList);

  // Collect medications properly (considering "Other")
  const medicationList = patients.map(p => {
    if (p.medication === "Other" && p.medicationOther) {
      return p.medicationOther;
    }
    return p.medication || "";
  });
  const medicationCounts = countOccurrences(medicationList);

  // Compose CSV rows
  const csvRows = [
    `"Category","Item","Count"`
  ];

  for (const [complaint, count] of Object.entries(complaintCounts)) {
    if (complaint === "") continue;
    csvRows.push(`"Chief Complaint","${complaint.replace(/"/g, '""')}",${count}`);
  }

  for (const [med, count] of Object.entries(medicationCounts)) {
    if (med === "") continue;
    csvRows.push(`"Medication","${med.replace(/"/g, '""')}",${count}`);
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${patientType}_stats_${loggedInUser.username}.csv`;
  a.click();

  URL.revokeObjectURL(url);
});

// Attach event listeners (for printing restoring DOM etc.)
function attachEventListeners() {
  backBtn.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  printBtn.addEventListener("click", () => {
    const printContents = recordsTable.outerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = `<h1>${document.getElementById("pageTitle").textContent}</h1>` + printContents;
    window.print();
    document.body.innerHTML = originalContents;

    attachEventListeners();
    renderRecords();
  });

  exportBtn.addEventListener("click", () => {
    // Same export logic as above
  });

  deleteAllBtn.addEventListener("click", () => {
    if (confirm(`Are you sure you want to delete ALL your ${patientType} records? This action cannot be undone.`)) {
      let allPatients = JSON.parse(localStorage.getItem("patients")) || [];
      allPatients = allPatients.filter(p => !(p.type === patientType && p.savedBy === loggedInUser.username));
      localStorage.setItem("patients", JSON.stringify(allPatients));
      renderRecords();
    }
  });
}

// Initial render
renderRecords();
