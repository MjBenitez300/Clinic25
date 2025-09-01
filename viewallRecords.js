const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
if (!loggedInUser) {
  alert("Please login first.");
  window.location.href = "index.html";
}

const recordsTable = document.getElementById("recordsTable");
const viewAllBtn = document.getElementById("viewAllBtn");
const viewGuestBtn = document.getElementById("viewGuestBtn");
const viewEmployeeBtn = document.getElementById("viewEmployeeBtn");
const printBtn = document.getElementById("printBtn");
const exportBtn = document.getElementById("exportBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const backBtn = document.getElementById("backBtn");
const viewHistoryBtn = document.getElementById("viewHistoryBtn");

const historySearchSection = document.getElementById("historySearchSection");
const historySearchInput = document.getElementById("historySearchInput");
const historySearchBtn = document.getElementById("historySearchBtn");
const historyResults = document.getElementById("historyResults");

const employeeExtraFields = [
  { id: "civilStatus", label: "Civil Status" },
  { id: "department", label: "Department" }
];

const commonFields = [
  { id: "patientID", label: "Patient ID" },
  { id: "patientName", label: "Patient Name" },
  { id: "patientAge", label: "Age" },
  { id: "sex", label: "Sex" },
  { id: "patientAddress", label: "Address" },
  { id: "walkInDate", label: "Walk-in Date" },
  { id: "chiefComplaint", label: "Chief Complaint" },
  { id: "history", label: "History of Past Illness" },
  { id: "medicationCombined", label: "Medication" }
];

let currentFilter = null;

// Utility: Get full patient name formatted
function getFullName(p) {
  return `${p.lastName || ""}, ${p.firstName || ""}${p.middleName ? " " + p.middleName : ""}`.trim();
}

// Render table header with appropriate fields based on currentFilter
function renderTableHeader() {
  recordsTable.innerHTML = "";
  const header = recordsTable.createTHead().insertRow();
  let fields = [...commonFields];
  if (currentFilter !== "guest") fields = fields.concat(employeeExtraFields);
  fields.forEach(f => {
    const th = document.createElement("th");
    th.textContent = f.label;
    header.appendChild(th);
  });
  const th = document.createElement("th");
  th.textContent = "Actions";
  header.appendChild(th);
}

// Load patients based on current filter
function loadPatients() {
  const all = JSON.parse(localStorage.getItem("patients")) || [];
  if (currentFilter === "guest" || currentFilter === "employee") {
    return all.filter(p => p.type === currentFilter);
  }
  return all;
}

// Render the patient records in the table
function renderRecords() {
  renderTableHeader();
  const tbody = recordsTable.createTBody();
  const patients = loadPatients();

  let fields = [...commonFields];
  if (currentFilter !== "guest") fields = fields.concat(employeeExtraFields);

  if (patients.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = fields.length + 1;
    cell.style.textAlign = "center";
    cell.textContent = "No patient records found.";
    return;
  }

  patients.forEach(p => {
    const row = tbody.insertRow();
    fields.forEach(f => {
      const cell = row.insertCell();
      if (f.id === "sex") {
        cell.textContent = p[f.id] === "M" ? "Male" : p[f.id] === "F" ? "Female" : "";
      } else if (f.id === "patientName") {
        cell.textContent = getFullName(p);
      } else if (f.id === "medicationCombined") {
        const med1 = p["medication1"] || "";
        const med2 = p["medication2"] || "";
        cell.textContent = [med1, med2].filter(Boolean).join(", ");
      } else {
        cell.textContent = p[f.id] || "";
      }
    });

    const cellActions = row.insertCell();

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.setAttribute("aria-label", `Delete record for patient ${getFullName(p)}`);
    delBtn.onclick = () => {
      if (confirm("Are you sure you want to delete this record?")) {
        deletePatient(p.patientID);
      }
    };
    cellActions.appendChild(delBtn);
  });
}

// Delete patient record by ID and refresh table
function deletePatient(id) {
  let all = JSON.parse(localStorage.getItem("patients")) || [];
  all = all.filter(p => p.patientID !== id);
  localStorage.setItem("patients", JSON.stringify(all));
  renderRecords();
}

// Filter buttons
viewAllBtn.onclick = () => {
  currentFilter = null;
  renderRecords();
  hideHistorySearch();
};
viewGuestBtn.onclick = () => {
  currentFilter = "guest";
  renderRecords();
  hideHistorySearch();
};
viewEmployeeBtn.onclick = () => {
  currentFilter = "employee";
  renderRecords();
  hideHistorySearch();
};

// Print current view table
printBtn.onclick = () => {
  if (recordsTable.rows.length === 0) {
    return alert("No records to print.");
  }
  const newWin = window.open("", "", "width=900,height=600");
  newWin.document.write(`<html><head><title>Print</title><style>
    table{width:100%;border-collapse:collapse;}
    th,td{border:1px solid #ddd;padding:8px;text-align:left;}
    th{background:#007bff;color:#fff;}
  </style></head><body>`);
  newWin.document.write(recordsTable.outerHTML);
  newWin.document.write(`</body></html>`);
  newWin.document.close();
  newWin.print();
};

// Export current view table as CSV
exportBtn.onclick = () => {
  if (recordsTable.rows.length === 0) {
    return alert("No records to export.");
  }
  const rows = [...recordsTable.rows].map(r =>
    [...r.cells].map(c => `"${c.textContent}"`).join(",")
  );
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "patient_records.csv";
  a.click();
  URL.revokeObjectURL(url);
};

// Delete all displayed records based on filter
deleteAllBtn.onclick = () => {
  if (!confirm("Delete all displayed records?")) return;
  const all = JSON.parse(localStorage.getItem("patients")) || [];
  let kept;
  if (currentFilter) {
    kept = all.filter(p => p.type !== currentFilter);
  } else {
    kept = [];
  }
  localStorage.setItem("patients", JSON.stringify(kept));
  renderRecords();
};

// Navigation
backBtn.onclick = () => window.location.href = "dashboard.html";

// View History toggle
viewHistoryBtn.onclick = () => {
  if(historySearchSection.style.display === "none" || historySearchSection.style.display === "") {
    showHistorySearch();
  } else {
    hideHistorySearch();
  }
};

function showHistorySearch() {
  historySearchSection.style.display = "block";
  historySearchInput.focus();
  historyResults.innerHTML = "";
  historySearchInput.value = "";
}

function hideHistorySearch() {
  historySearchSection.style.display = "none";
  historyResults.innerHTML = "";
  historySearchInput.value = "";
}

// History search action
historySearchBtn.onclick = () => {
  const query = historySearchInput.value.trim().toLowerCase();
  if (!query) {
    alert("Please enter a patient name to search.");
    return;
  }
  const allPatients = JSON.parse(localStorage.getItem("patients")) || [];
  const results = allPatients.filter(p => {
    const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ").toLowerCase();
    return fullName.includes(query);
  });
  renderHistoryResults(results);
};

// Render search results table for history
function renderHistoryResults(results) {
  if (results.length === 0) {
    historyResults.innerHTML = "<p>No records found.</p>";
    return;
  }
  let html = `<table>
    <thead>
      <tr>
        <th>Patient Name</th>
        <th>Walk-in Date</th>
        <th>Medication</th>
        <th>Print</th>
      </tr>
    </thead>
    <tbody>`;
  results.forEach(p => {
    const patientName = getFullName(p);
    const medication = [p.medication1, p.medication2].filter(Boolean).join(", ");
    html += `<tr>
      <td>${patientName}</td>
      <td>${p.walkInDate || ""}</td>
      <td>${medication}</td>
      <td><button class="printBtn" data-patientid="${p.patientID}" aria-label="Print record for ${patientName}">Print</button></td>
    </tr>`;
  });
  html += "</tbody></table>";
  historyResults.innerHTML = html;

  // Attach print handlers
  document.querySelectorAll("#historyResults .printBtn").forEach(btn => {
    btn.onclick = (e) => {
      const pid = e.target.getAttribute("data-patientid");
      printPatientHistory(pid, results);
    };
  });
}

// Print individual patient history
function printPatientHistory(patientID, data) {
  const patient = data.find(p => p.patientID === patientID);
  if (!patient) {
    alert("Patient record not found.");
    return;
  }
  const newWin = window.open("", "", "width=900,height=600");
  newWin.document.write("<html><head><title>Patient History</title><style>");
  newWin.document.write(`body{font-family: Arial,sans-serif; padding: 20px;}
    h2 {color:#007bff;}
    table {width: 100%; border-collapse: collapse;}
    th, td {border: 1px solid #ddd; padding: 10px;}
    th {background: #007bff; color: white;}
  `);
  newWin.document.write("</style></head><body>");
  newWin.document.write(`<h2>Patient History: ${getFullName(patient)}</h2>`);
  newWin.document.write("<table>");
  newWin.document.write("<tr><th>Patient ID</th><td>" + patient.patientID + "</td></tr>");
  newWin.document.write("<tr><th>Name</th><td>" + getFullName(patient) + "</td></tr>");
  newWin.document.write("<tr><th>Walk-in Date</th><td>" + (patient.walkInDate || "") + "</td></tr>");
  newWin.document.write("<tr><th>Medication 1</th><td>" + (patient.medication1 || "") + "</td></tr>");
  newWin.document.write("<tr><th>Medication 2</th><td>" + (patient.medication2 || "") + "</td></tr>");
  newWin.document.write("<tr><th>Chief Complaint</th><td>" + (patient.chiefComplaint || "") + "</td></tr>");
  newWin.document.write("<tr><th>History of Past Illness</th><td>" + (patient.history || "") + "</td></tr>");
  if(patient.type === "employee") {
    newWin.document.write("<tr><th>Civil Status</th><td>" + (patient.civilStatus || "") + "</td></tr>");
    newWin.document.write("<tr><th>Department</th><td>" + (patient.department || "") + "</td></tr>");
  }
  newWin.document.write("</table>");
  newWin.document.write("</body></html>");
  newWin.document.close();
  newWin.print();
}

// Initial render on page load
renderRecords();
