import { EmployeesUpload } from "@/components/admin/employees/employees-upload";
import { EmployeesTable } from "@/components/admin/employees/employees-table";

export function EmployeesSection() {
  return (
    <div className="space-y-8">
      <EmployeesUpload />
      <EmployeesTable />
    </div>
  );
}