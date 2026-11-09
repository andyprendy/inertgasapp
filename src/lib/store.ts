import { get, set, del, keys, getMany } from "idb-keyval";
import type { Assessment } from "./assessment";

const PREFIX = "assessment:";

export async function saveAssessment(a: Assessment) {
  await set(PREFIX + a.id, a);
}
export async function getAssessment(id: string) {
  return (await get<Assessment>(PREFIX + id)) ?? null;
}
export async function deleteAssessment(id: string) {
  await del(PREFIX + id);
}
export async function listAssessments(): Promise<Assessment[]> {
  const k = (await keys()).filter((x) => String(x).startsWith(PREFIX));
  const all = (await getMany<Assessment | undefined>(k)).filter((x): x is Assessment => !!x);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getLastAssessor() {
  return localStorage.getItem("lastAssessor") ?? "";
}
export function setLastAssessor(name: string) {
  localStorage.setItem("lastAssessor", name);
}

/** Resize a photo to keep storage small. */
export async function compressImage(file: File, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}
