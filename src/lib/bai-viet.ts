import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type BaiViet = CollectionEntry<'baiViet'>['data'];

/** Mọi bài, mới nhất trước */
export const tatCaBai = async () =>
  (await getCollection('baiViet')).sort((a, b) => b.data.ngay.getTime() - a.data.ngay.getTime());

export const layBai = async (id: string) => {
  const bai = await getEntry('baiViet', id);
  if (!bai) throw new Error(`Không có bài "${id}" trong src/data/bai-viet.yaml`);
  return bai;
};

/** Phương pháp dùng làm giá trị (dung: true) — schema đã bảo đảm có đúng một */
export const phuongPhapDung = (dinhGia: NonNullable<BaiViet['dinhGia']>) => dinhGia.phuongPhap.find((p) => p.dung)!;

// Định dạng kiểu Việt Nam
const so0 = new Intl.NumberFormat('vi-VN');
const so1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const so2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ngayVN = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export const dong = (n: number) => so0.format(n); // 26694 → "26.694"
export const nghin1 = (n: number) => so1.format(n / 1000); // 14575 → "14,6"
export const nghin2 = (n: number) => so2.format(n / 1000); // 26600 → "26,60"
export const phanTram1 = (n: number) => so1.format(n) + '%'; // 0.6 → "0,6%"
export const ngay = (d: Date) => ngayVN.format(d); // → "15/10/2026"
