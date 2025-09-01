const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
if (!loggedInUser) {
  alert("Please login first.");
  window.location.href = "index.html";
}

const departmentSelect = document.getElementById("departmentSelect");
const monthSelect = document.getElementById("monthSelect");
const yearInput = document.getElementById("yearInput");
const statsSection = document.getElementById("statsSection");

const knownDepartments = [
  "Finance and Corporate Services", "Front Office", "HR", "Guest", "Engineering",
  "Life Sciences & Education", "Base Camp", "Motorpool", "Office of the VP",
  "Parks and Adventure", "Park Grounds", "Sales & Marketing", "Safari Camp",
  "Santican Cattle Station", "Security", "Tenants-Outpost", "Tenants-Auntie Anne's",
  "Tenants-Pizzeria Michelangelo", "Tenants-Convenient Store", "Tunnel Garden",
  "ML-Agri Ventures"
];

function loadAllPatients() {
  return JSON.parse(localStorage.getItem("patients")) || [];
}

function filterByMonthAndYear(p) {
  const selectedMonth = monthSelect.value;
  const selectedYear = parseInt(yearInput.value);
  const walkInDate = p.walkInDate || p.date;
  const recordDate = new Date(walkInDate);
  if (isNaN(recordDate)) return false;

  const recordMonth = recordDate.getMonth() + 1;
  const recordYear = recordDate.getFullYear();

  return (
    (selectedMonth === "all" || recordMonth === parseInt(selectedMonth)) &&
    (isNaN(selectedYear) || recordYear === selectedYear)
  );
}

function getDepartment(p) {
  const deptRaw = p.department?.trim() || "";
  return !deptRaw || !knownDepartments.includes(deptRaw) ? "Other" : deptRaw;
}

function parseMedication(medName, medQtyRaw) {
  if (!medName || medName.toLowerCase() === "none" || medName.toLowerCase().includes("select medication")) {
    return null;
  }

  const name = medName.trim();

  let qty = 0;
  if (typeof medQtyRaw === 'string') {
    const match = medQtyRaw.match(/\d+/);
    if (match) {
      qty = parseInt(match[0]);
    }
  } else if (typeof medQtyRaw === 'number') {
    qty = medQtyRaw;
  }

  if (qty === 0) {
    const matchFromName = name.match(/\((\d+)\s*pcs\)/i);
    if (matchFromName) {
      qty = parseInt(matchFromName[1]);
    }
  }

  if (!qty || isNaN(qty)) qty = 1;

  return {
    name,
    qty,
  };
}

function renderDepartmentHistory() {
  const selectedDepartment = departmentSelect.value;
  const patients = loadAllPatients();

  const departmentStats = {};

  patients.forEach(p => {
    if (!filterByMonthAndYear(p)) return;
    const dept = getDepartment(p);

    if (
      selectedDepartment !== "all" &&
      selectedDepartment !== "other" &&
      dept !== selectedDepartment
    ) return;

    if (selectedDepartment === "other" && dept !== "Other") return;

    const chiefComplaint = p.chiefComplaint || "Unknown";
    const displayDept = dept === "Other" ? (p.department?.trim() || "Other") : dept;

    if (!departmentStats[displayDept]) departmentStats[displayDept] = {};
    if (!departmentStats[displayDept][chiefComplaint]) {
      departmentStats[displayDept][chiefComplaint] = {
        complaintCount: 0,
        medications: []
      };
    }

    departmentStats[displayDept][chiefComplaint].complaintCount++;

    const med1 = parseMedication(p.medication1, p.medication1Qty);
    const med2 = parseMedication(p.medication2, p.medication2Qty);

    // Store medications in an array
    if (med1) {
      departmentStats[displayDept][chiefComplaint].medications.push(med1);
    }
    if (med2) {
      departmentStats[displayDept][chiefComplaint].medications.push(med2);
    }
  });

  if (Object.keys(departmentStats).length === 0) {
    statsSection.innerHTML = "<p>No records match the selected filters.</p>";
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>Department</th>
          <th>Chief Complaint</th>
          <th>Complaint Count</th>
          <th>Medication1</th>
          <th> Count</th> <!-- Added Medication1 Count -->
          <th>Medication2</th>
          <th> Count</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Render each department and complaint data
  Object.entries(departmentStats).forEach(([dept, complaints]) => {
    Object.entries(complaints).forEach(([complaint, data]) => {
      const med1 = data.medications[0] || {};
      const med2 = data.medications[1] || {};

      // Medication counts
      const med1Count = med1.qty || 0;
      const med2Count = med2.qty || 0;

      // If Medication2 is empty or the same as Medication1, show only Medication1
      if (!med2.name || med2.name === med1.name || med2.name === "-") {
        html += `
          <tr>
            <td>${dept}</td>
            <td>${complaint}</td>
            <td>${data.complaintCount}</td>
            <td>${med1.name || "-"}</td>
            <td>${med1Count * data.complaintCount}</td> <!-- Count -->
            <td>-</td> <!-- Medication 2 -->
            <td>-</td> <!-- Count -->
          </tr>
        `;
      } else {
        html += `
          <tr>
            <td>${dept}</td>
            <td>${complaint}</td>
            <td>${data.complaintCount}</td>
            <td>${med1.name || "-"}</td>
            <td>${med1Count * data.complaintCount}</td> <!--  Count -->
            <td>${med2.name || "-"}</td>
            <td>${med2Count * data.complaintCount}</td> <!-- Count -->
          </tr>
        `;
      }
    });
  });

  html += "</tbody></table>";
  statsSection.innerHTML = html;
}

function deleteAllFilteredRecords() {
  if (!confirm("Are you sure you want to DELETE ALL filtered records? This action cannot be undone.")) return;

  let patients = loadAllPatients();
  const selectedDepartment = departmentSelect.value;

  patients = patients.filter(p => {
    if (!filterByMonthAndYear(p)) return true;
    const dept = getDepartment(p);

    if (selectedDepartment !== "all" && selectedDepartment !== "other" && dept !== selectedDepartment) return true;
    if (selectedDepartment === "other" && dept !== "Other") return true;

    return false;
  });

  localStorage.setItem("patients", JSON.stringify(patients));
  alert("Filtered records deleted successfully.");
  statsSection.innerHTML = "";
}

document.getElementById("viewDeptBtn").addEventListener("click", renderDepartmentHistory);
document.getElementById("deleteAllBtn").addEventListener("click", deleteAllFilteredRecords);

document.getElementById("exportBtn").addEventListener("click", () => {
  const table = statsSection.querySelector("table");
  if (!table) {
    alert("No data to export");
    return;
  }

  const rows = [...table.rows].map(row =>
    [...row.cells].map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const selectedDepartment = departmentSelect.options[departmentSelect.selectedIndex].text;
  const selectedMonth = monthSelect.options[monthSelect.selectedIndex].text;
  const year = yearInput.value || "All Years";

  const url = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `Status_${selectedDepartment}_${selectedMonth}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});
