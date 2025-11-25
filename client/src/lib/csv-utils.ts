export function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return "";
    const s = String(value);
    const needsWrap = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsWrap ? `"${escaped}"` : escaped;
  }
  
  export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  export async function parseAnySpreadsheet(file: File) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
      return rows.map((r) => ({
        firstName: String(r.firstName || r["first name"] || r["First Name"] || "").trim(),
        lastName: String(r.lastName || r["last name"] || r["Last Name"] || "").trim(),
        email: String(r.email || r["Email"] || "").trim().toLowerCase(),
        points: Number(r.points ?? r["Points"] ?? 0),
      }));
    }
  
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const header = lines[0].split(",").map((s) => s.trim());
    const idx = {
      firstName: header.indexOf("firstName"),
      lastName: header.indexOf("lastName"),
      email: header.indexOf("email"),
      points: header.indexOf("points"),
    };
    if (Object.values(idx).some((i) => i === -1)) {
      throw new Error("File must have headers: firstName,lastName,email,points");
    }
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      return {
        firstName: cols[idx.firstName],
        lastName: cols[idx.lastName],
        email: cols[idx.email].toLowerCase(),
        points: Number(cols[idx.points]),
      };
    });
    return rows;
  }
  
  export async function downloadSample() {
    const rows = [
      { firstName: "bharath", lastName: "c", email: "bharath.c@company.com", points: 2000 },
      { firstName: "sita", lastName: "r", email: "sita.r@company.com", points: 1500 },
    ];
    
    const header = "firstName,lastName,email,points";
    const csvRows = rows.map((r) =>
      [r.firstName, r.lastName, r.email, String(r.points)].map(csvEscape).join(",")
    );
    const csv = [header, ...csvRows].join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "employees-sample.csv");
    
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "employees-sample.xlsx");
    } catch {
      // If xlsx not available, CSV is still downloaded
    }
  }