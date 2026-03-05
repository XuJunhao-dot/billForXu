// Prod 推荐同域部署（Caddy/Nginx 反代），此时 API_BASE 为空串即可走相对路径。
// 本地开发可通过 NEXT_PUBLIC_API_BASE 指向本地后端（如 http://localhost:8080）。
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
