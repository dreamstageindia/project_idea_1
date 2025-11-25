export async function uploadFiles(files: File[]): Promise<string[]> {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.urls as string[];
  }
  
  export function move<T>(arr: T[], from: number, to: number): T[] {
    const copy = arr.slice();
    const item = copy.splice(from, 1)[0];
    copy.splice(to, 0, item);
    return copy;
  }
  
  export function removeAt<T>(arr: T[], index: number): T[] {
    const copy = arr.slice();
    copy.splice(index, 1);
    return copy;
  }