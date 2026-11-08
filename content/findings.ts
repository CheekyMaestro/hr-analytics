/**
 * The 3 findings (PRD.md §8.5) as templates. Every number is a `{placeholder}`
 * filled from query results by lib/domain/findings.ts — no figures in this file.
 * Copy rules (DESIGN.md §7): the title states the pattern, the body names the
 * comparison group, the recommendation starts with a verb and names who or how
 * often. Never "menyebabkan".
 */
export type FindingTemplate = {
  no: number;
  title: string;
  body: string;
  recommendation: string;
};

export const FINDING_TEMPLATES: readonly FindingTemplate[] = [
  {
    no: 1,
    title: "{dept} paling berisiko: turnover {dept_ratio} rata-rata site",
    body:
      "Turnover bulanan {dept} rata-rata {dept_turnover}, dibanding {site_turnover} untuk seluruh site. " +
      "Absensinya {dept_absence}, sementara rata-rata site {site_absence}; {dept_leavers} karyawan {dept} keluar dalam periode ini.",
    recommendation:
      "Jadwalkan stay interview bulanan dengan karyawan {dept} dan tinjau pola roster bersama superintendent-nya setiap kuartal.",
  },
  {
    no: 2,
    title: "Lembur {high_label}: {ot_ratio} lebih sering keluar",
    body:
      "Karyawan dengan rata-rata lembur 3 bulan {high_label} keluar {high_rate} per bulan ({high_leavers} dari {high_rows} baris), " +
      "dibanding {low_rate} pada kelompok {low_label}.",
    recommendation:
      "Pasang peringatan lembur {high_label} per orang dan tinjau daftarnya setiap bulan bersama kepala departemen.",
  },
  {
    no: 3,
    title: "Absensi naik menjelang keluar",
    body:
      "Dalam 3 bulan terakhir sebelum keluar, absensi {leaver_count} karyawan yang keluar mencapai {leaver_absence}, " +
      "{absence_ratio} dibanding {stayer_absence} pada {stayer_count} karyawan yang bertahan.",
    recommendation:
      "Minta atasan langsung melapor ke HR setiap awal bulan bila absensi anggota timnya naik dua bulan berturut-turut.",
  },
];
