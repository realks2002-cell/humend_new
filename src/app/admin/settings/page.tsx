"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Trash2, Loader2, Shield } from "lucide-react";
import { getAdmins, createAdmin, deleteAdmin } from "./actions";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Form
  const [adminId, setAdminId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const loadAdmins = async () => {
    const result = await getAdmins();
    if (result.data) {
      setAdmins(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreate = async () => {
    setError("");
    setCreating(true);

    const result = await createAdmin(adminId, name, password);
    setCreating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setAdminId("");
    setName("");
    setPassword("");
    setDialogOpen(false);
    loadAdmins();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 관리자를 삭제하시겠습니까?")) return;

    setDeletingId(id);
    const result = await deleteAdmin(id);
    setDeletingId(null);

    if (result.error) {
      alert(result.error);
      return;
    }

    loadAdmins();
  };

  const extractAdminId = (email: string) => {
    return email.replace("@admin.humend.hr", "");
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">관리자 설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관리자 계정을 추가하거나 삭제할 수 있습니다.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="mr-1.5 h-4 w-4" />
              관리자 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>관리자 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200/50">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  아이디
                </label>
                <Input
                  placeholder="관리자 아이디"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  로그인 시 사용할 아이디입니다.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  이름
                </label>
                <Input
                  placeholder="관리자 이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">
                  비밀번호
                </label>
                <Input
                  type="password"
                  placeholder="6자리 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "관리자 추가"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <div className="py-16 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                등록된 관리자가 없습니다.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium">아이디</th>
                    <th className="px-4 py-3 font-medium">이름</th>
                    <th className="px-4 py-3 font-medium">역할</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">생성일</th>
                    <th className="w-[60px] px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {extractAdminId(admin.email)}
                      </td>
                      <td className="px-4 py-3">{admin.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {admin.role}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {new Date(admin.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(admin.id)}
                          disabled={deletingId === admin.id}
                        >
                          {deletingId === admin.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
