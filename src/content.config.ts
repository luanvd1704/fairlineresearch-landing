// Kiểm kiểu dữ liệu của src/data/bai-viet.yaml lúc build: sai kiểu hoặc thiếu mục là build dừng, không lên web
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const dong = z.number().int().positive();

const phuongPhap = z.object({
  tenNgan: z.string(),
  tenDayDu: z.string(),
  dung: z.boolean().default(false),
  xau: dong,
  coSo: dong,
  tot: dong,
});

const baiViet = defineCollection({
  loader: file('src/data/bai-viet.yaml'),
  schema: z.object({
    ma: z.string(),
    ten: z.string(),
    san: z.string(),
    nganh: z.string(),
    danhMuc: z.string(),
    tieuDe: z.string(),
    ngay: z.coerce.date(),
    soLieuDen: z.string(),
    taiLieu: z.string(),
    tomTat: z.string(),
    tomTatThuVien: z.string(),
    bia: z.object({
      mau: z.enum(['teal']).optional(),
      cot: z.array(z.number().min(0).max(100)).length(5),
    }),
    dinhGia: z
      .object({
        giaThamChieu: dong,
        ngayGia: z.coerce.date(),
        bienAnToan: z.number(),
        phuongPhap: z
          .array(phuongPhap)
          .refine((ds) => ds.filter((p) => p.dung).length === 1, 'cần đúng một phương pháp có dung: true'),
      })
      .optional(),
  }),
});

export const collections = { baiViet };
