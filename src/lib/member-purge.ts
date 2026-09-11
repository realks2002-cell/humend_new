import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { list, del } from "@vercel/blob";
import { createAdminClient } from "@/lib/supabase/server";

// 회원 파일은 모두 회원 id 폴더에 저장됨
const BLOB_PREFIXES = ["profile-photos", "health-certs", "consent-signatures"];
const STORAGE_BUCKETS = ["signatures", "family-certs"];

async function removeStorageFolder(client: SupabaseClient, bucket: string, folder: string) {
  const { data, error } = await client.storage.from(bucket).list(folder, { limit: 1000 });
  if (error) throw new Error(`${bucket}/${folder}: ${error.message}`);
  const paths = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
  if (paths.length === 0) return;
  const { error: rmError } = await client.storage.from(bucket).remove(paths);
  if (rmError) throw new Error(`${bucket}/${folder}: ${rmError.message}`);
}

async function removeBlobFolder(prefix: string) {
  let cursor: string | undefined;
  do {
    const res = await list({ prefix, cursor, limit: 1000 });
    if (res.blobs.length > 0) await del(res.blobs.map((b) => b.url));
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
}

function createBackupClient() {
  const url = process.env.BACKUP_SUPABASE_URL;
  const key = process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createSupabaseClient(url, key) : null;
}

/**
 * 삭제(비활성) 회원을 DB에서 완전 제거 — 계정 + 회원정보 + 근무·급여·계약·지원·채팅(CASCADE) + 파일·백업.
 * 되돌릴 수 없음. DB 삭제가 먼저 성공해야 파일을 지운다(파일 삭제 실패는 fileErrors로 보고).
 */
export async function purgeMember(memberId: string): Promise<{ fileErrors: string[] }> {
  const admin = createAdminClient();

  const { data: member, error: memberError } = await admin
    .from("members")
    .select("id, status, phone")
    .eq("id", memberId)
    .maybeSingle();
  if (memberError) throw new Error(`회원 조회 실패: ${memberError.message}`);
  if (!member) throw new Error("회원을 찾을 수 없습니다.");
  if (member.status === "active") throw new Error("활성 회원은 완전 삭제할 수 없습니다. 먼저 삭제 처리하세요.");

  // 같은 계정이 관리자이면 로그인 계정은 남기고 회원 데이터만 삭제
  const { data: adminRow } = await admin.from("admins").select("id").eq("id", memberId).maybeSingle();
  if (!adminRow) {
    const { error: authError } = await admin.auth.admin.deleteUser(memberId);
    if (authError && authError.status !== 404) throw new Error(`계정 삭제 실패: ${authError.message}`);
  }

  // 계정 삭제 시 CASCADE로 지워지지만, 계정이 없던 회원도 확실히 제거
  const { error: deleteError } = await admin.from("members").delete().eq("id", memberId);
  if (deleteError) throw new Error(`회원 데이터 삭제 실패: ${deleteError.message}`);

  const fileErrors: string[] = [];
  const attempt = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      fileErrors.push((e as Error).message);
    }
  };

  if (member.phone) await attempt(async () => {
    const { error } = await admin.from("phone_verifications").delete().eq("phone", member.phone);
    if (error) throw new Error(`phone_verifications: ${error.message}`);
  });
  for (const bucket of STORAGE_BUCKETS) await attempt(() => removeStorageFolder(admin, bucket, memberId));
  for (const prefix of BLOB_PREFIXES) await attempt(() => removeBlobFolder(`${prefix}/${memberId}/`));

  const backup = createBackupClient();
  if (backup) {
    const bucket = process.env.BACKUP_BUCKET ?? "hr-backup";
    await attempt(() => removeStorageFolder(backup, bucket, `signatures/${memberId}`));
    for (const prefix of BLOB_PREFIXES) {
      await attempt(() => removeStorageFolder(backup, bucket, `vercel-blob/${prefix}/${memberId}`));
    }
  }

  return { fileErrors };
}
