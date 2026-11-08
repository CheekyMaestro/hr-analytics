/**
 * KPI definitions shown on /data-quality#definisi (PRD.md §8.2). They describe
 * exactly the formulas implemented in lib/domain/kpi.ts (RULES.md §1.3).
 */
export type KpiDefinition = { id: string; name: string; formula: string; note: string };

export const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  {
    id: "turnover",
    name: "Turnover bulanan",
    formula: "karyawan keluar bulan m ÷ headcount bulan m × 100%",
    note:
      "Headcount bulan m = karyawan yang punya baris bersih di bulan itu, termasuk yang keluar di bulan itu. " +
      "Angka periode = rata-rata nilai bulanan. Turnover tahunan = total keluar ÷ rata-rata headcount bulanan × 100%.",
  },
  {
    id: "absenteeism",
    name: "Absenteeism rate",
    formula: "Σ absent_days ÷ Σ work_days × 100%",
    note:
      "Hanya absen tidak terencana terhadap hari kerja terjadwal dari roster. Cuti tahunan yang disetujui tidak dihitung " +
      "sebagai absen karena tidak masuk ke absent_days.",
  },
  {
    id: "overtime-cost",
    name: "Biaya lembur",
    formula: "Σ overtime_hours × (base_salary ÷ 173) × 1,5",
    note:
      "Penyederhanaan: setiap jam lembur dibayar 1,5× upah per jam; ÷173 adalah pembagi baku upah bulanan ke upah per jam. " +
      "Aturan sebenarnya (jam pertama 1,5×, jam berikutnya 2×) membuat biaya riil lebih tinggi. Dikelompokkan per departemen dan bulan.",
  },
  {
    id: "leave-rate",
    name: "Tingkat keluar per kelompok",
    formula: "baris dengan left_this_month = 1 ÷ semua baris dalam kelompok × 100%",
    note:
      "Kelompok lembur memakai rata-rata lembur karyawan 3 bulan terakhir (termasuk bulan berjalan): ≤ 20, 20–40, dan > 40 jam. " +
      "Lembur kosong dihitung 0 jam. Absen sebelum keluar membandingkan absensi 3 bulan terakhir karyawan yang keluar dengan " +
      "absensi karyawan yang bertahan sepanjang periode.",
  },
];
