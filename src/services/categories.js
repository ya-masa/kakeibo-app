import { GAS_URL } from "@/constants/index.js";

// ① ALLLIST を取得（支出・収入・口座・お店）
export async function fetchAllList() {
  const url = `${GAS_URL}?list=ALLLIST`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("ALLLIST の取得に失敗しました");
  }

  const data = await res.json();
  return data; // ← 正常に返す
}

// ② カテゴリ一覧を取得
export async function fetchCategories() {
  const url = `${GAS_URL}?list=categories`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("カテゴリ取得に失敗しました");
  }

  const data = await res.json();
  return data; // ← 正常に返す
}

