import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, X, Unlock } from "lucide-react";
import { useState } from "react";
import type { Employee } from "./types";

export function EmployeesTable() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: employees = [] } = useQuery<Employee[]>({ 
    queryKey: ["/api/admin/employees"] 
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmpDraft, setEditEmpDraft] = useState<Partial<Employee>>({});

  const unlockEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/employees/${id}/unlock`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({ title: "Employee unlocked" });
    },
    onError: (e: any) => toast({ 
      title: "Failed to unlock", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (payload: Partial<Employee> & { id: string }) => {
      const { id, ...body } = payload;
      const res = await apiRequest("PUT", `/api/admin/employees/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({ title: "Employee updated" });
    },
    onError: (e: any) => toast({ 
      title: "Failed to update employee", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const startEditEmp = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditEmpDraft({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email || "",
      points: emp.points,
    });
  };

  const saveEditEmp = () => {
    if (!editingEmployeeId) return;
    updateEmployeeMutation.mutate({ id: editingEmployeeId, ...editEmpDraft });
    setEditingEmployeeId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Login Attempts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[260px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                const isEditing = editingEmployeeId === emp.id;
                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            value={editEmpDraft.firstName || ""}
                            onChange={(e) =>
                              setEditEmpDraft((d) => ({ ...d, firstName: e.target.value }))
                            }
                            placeholder="First name"
                          />
                          <Input
                            value={editEmpDraft.lastName || ""}
                            onChange={(e) =>
                              setEditEmpDraft((d) => ({ ...d, lastName: e.target.value }))
                            }
                            placeholder="Last name"
                          />
                        </div>
                      ) : (
                        `${emp.firstName} ${emp.lastName}`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editEmpDraft.email || ""}
                          onChange={(e) =>
                            setEditEmpDraft((d) => ({ ...d, email: e.target.value }))
                          }
                          placeholder="employee@company.com"
                          type="email"
                        />
                      ) : (
                        emp.email || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={String(editEmpDraft.points ?? 0)}
                          onChange={(e) =>
                            setEditEmpDraft((d) => ({
                              ...d,
                              points: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        emp.points
                      )}
                    </TableCell>
                    <TableCell>{emp.loginAttempts}</TableCell>
                    <TableCell>
                      <Badge variant={emp.isLocked ? "destructive" : "default"}>
                        {emp.isLocked ? "Locked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditEmp}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingEmployeeId(null)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditEmp(emp)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => unlockEmployeeMutation.mutate(emp.id)}
                            disabled={!emp.isLocked}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unblock
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}