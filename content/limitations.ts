/**
 * Data limitations (PRD.md Appendix B), shown on /data-quality#batasan.
 * Figures are `{placeholders}` filled from the latest run.
 */
export const LIMITATIONS: readonly string[] = [
  "Semua data adalah data dummy yang dibuat dengan seed tetap; pola sengaja disisipkan untuk latihan analisis.",
  "Data hanya mencakup {months} bulan ({period}), sehingga pola musiman belum bisa dipastikan.",
  "Tidak ada karyawan baru dalam periode ini; headcount hanya turun karena ada karyawan yang keluar.",
  "Alasan keluar (resign, habis kontrak, PHK) tidak tersedia; semua karyawan yang keluar dihitung sama.",
  "{null_rows} nilai lembur kosong diasumsikan 0 jam, sehingga biaya lembur bisa lebih rendah dari sebenarnya.",
  "Hubungan lembur dan absensi dengan keluarnya karyawan adalah korelasi, bukan bukti sebab-akibat.",
];
