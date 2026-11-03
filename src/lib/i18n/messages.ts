import type { Locale } from "./config";

/**
 * Server Actions, validation and database errors answer in English (tests and logs rely on it).
 * This turns those messages into the viewer's language at the moment they are shown. Exact
 * sentences first, then patterns for messages that carry a name. Unknown text is shown as is.
 */
const EXACT_ID: Record<string, string> = {
  // validation.ts
  "Choose Mahasiswa or Dosen.": "Pilih Mahasiswa atau Dosen.",
  "Enter the full name.": "Isi nama lengkap.",
  "Use at most 120 characters.": "Maksimal 120 karakter.",
  "Enter a valid email address.": "Isi alamat email yang benar.",
  "NIM must be 6–12 digits.": "NIM terdiri dari 6–12 angka.",
  "NIP/NIDN must be 8–20 digits.": "NIP/NIDN terdiri dari 8–20 angka.",
  "Enter 8–15 digits, optionally starting with +.": "Isi 8–15 angka, boleh diawali +.",
  "Invalid id.": "Data tidak dikenali.",
  "Enter a role name.": "Isi nama role.",
  "Use at most 60 characters.": "Maksimal 60 karakter.",
  "Use at most 280 characters.": "Maksimal 280 karakter.",
  "Use a whole number.": "Pakai bilangan bulat.",
  "Use 0 or more.": "Pakai 0 atau lebih.",
  "Use at most 9999.": "Maksimal 9999.",
  "Enter a name.": "Isi nama.",
  "Use at most 80 characters.": "Maksimal 80 karakter.",
  "Choose a unit type.": "Pilih jenis unit.",
  "Enter a position name.": "Isi nama posisi.",
  "Enter a rank.": "Isi tingkat.",
  "Use 1 or more.": "Pakai 1 atau lebih.",
  "Use at most 999.": "Maksimal 999.",
  "Use a valid date.": "Pakai tanggal yang benar.",
  "Use the format 2026/2027.": "Pakai format 2026/2027.",
  "The second year must follow the first (e.g. 2026/2027).":
    "Tahun kedua harus tepat setelah tahun pertama (mis. 2026/2027).",
  "End date must be after the start date.": "Tanggal selesai harus setelah tanggal mulai.",
  "Choose a member.": "Pilih anggota.",
  "Choose a unit.": "Pilih unit.",
  "Choose a position.": "Pilih posisi.",
  "Choose a period.": "Pilih periode.",
  "Use at least 8 characters.": "Minimal 8 karakter.",
  "Use at most 72 characters.": "Maksimal 72 karakter.",
  "Include at least one letter.": "Sertakan minimal satu huruf.",
  "Include at least one digit.": "Sertakan minimal satu angka.",
  "Enter your current password.": "Isi kata sandi sekarang.",
  "Passwords do not match.": "Kata sandi belum sama.",
  "Choose a password different from the current one.": "Pilih kata sandi yang berbeda dari yang sekarang.",
  "Enter your password.": "Isi kata sandi kamu.",
  "Enter the organization name.": "Isi nama organisasi.",
  // db-errors.ts
  "That record already exists.": "Data ini sudah ada.",
  "This record is still referenced by other data.": "Data ini masih dipakai data lain.",
  "Some values are not in the allowed format.": "Ada isian yang formatnya tidak sesuai.",
  "You are not allowed to do that.": "Kamu tidak punya izin untuk itu.",
  "PI-CORE needs at least one active super admin.": "PI-CORE butuh minimal satu super admin aktif.",
  "Deactivated members cannot receive assignments.": "Anggota nonaktif tidak bisa ditugaskan.",
  "Dosen do not hold organizational positions.": "Dosen tidak memegang posisi organisasi.",
  "That position does not exist in this kind of unit.": "Posisi itu tidak ada di jenis unit ini.",
  "That unit is inactive. Reactivate it under Structure first.":
    "Unit itu nonaktif. Aktifkan lagi di menu Struktur dulu.",
  "That kind of unit cannot be placed there.": "Jenis unit itu tidak bisa ditempatkan di sana.",
  "The change was rejected.": "Perubahan ditolak.",
  "Record not found.": "Data tidak ditemukan.",
  "Something went wrong while saving. Please try again.": "Terjadi kesalahan saat menyimpan. Coba lagi.",
  "A member with this email already exists.": "Sudah ada anggota dengan email ini.",
  "A member with this NIM already exists.": "Sudah ada anggota dengan NIM ini.",
  "A member with this NIP/NIDN already exists.": "Sudah ada anggota dengan NIP/NIDN ini.",
  "A period with this label already exists.": "Periode dengan nama ini sudah ada.",
  "A role with this name already exists.": "Role dengan nama ini sudah ada.",
  "Someone already holds that position in this unit for that period.":
    "Posisi itu sudah dipegang orang lain di unit ini pada periode tersebut.",
  "That unit type already has a position with this name.": "Jenis unit itu sudah punya posisi dengan nama ini.",
  "The selected member, unit, position or period no longer exists.":
    "Anggota, unit, posisi atau periode yang dipilih sudah tidak ada.",
  "This member already holds that position in that unit and period.":
    "Anggota ini sudah memegang posisi itu di unit dan periode tersebut.",
  "This parent already has a unit with that name.": "Induk ini sudah punya unit dengan nama itu.",
  "This unit still has sub-units or assignments. Deactivate it instead.":
    "Unit ini masih punya sub-unit atau penugasan. Nonaktifkan saja.",
  "This position is used by assignments. Remove them first.": "Posisi ini dipakai penugasan. Hapus penugasannya dulu.",
  // actions
  "Active period changed.": "Periode aktif diganti.",
  "A login with this email already exists but has no member profile. Ask the maintainer to resolve it.":
    "Akun masuk dengan email ini sudah ada tapi belum punya profil anggota. Minta pengelola sistem membereskannya.",
  "Assignment added.": "Penugasan ditambahkan.",
  "Assignment not found.": "Penugasan tidak ditemukan.",
  "Assignment removed.": "Penugasan dihapus.",
  "Assignment saved.": "Penugasan disimpan.",
  "Check the highlighted fields.": "Periksa isian yang ditandai.",
  "Could not create the login for this member. Try again.": "Akun masuk untuk anggota ini gagal dibuat. Coba lagi.",
  "Could not reset the password. Try again.": "Kata sandi gagal direset. Coba lagi.",
  "Could not save the member.": "Anggota gagal disimpan.",
  "Invalid request.": "Permintaan tidak valid.",
  "Member deactivated.": "Anggota dinonaktifkan.",
  "Member deactivated. Their login could not be blocked; they still see no data.":
    "Anggota dinonaktifkan. Akunnya belum bisa diblokir, tapi ia tetap tidak bisa melihat data.",
  "Member not found.": "Anggota tidak ditemukan.",
  "Member reactivated.": "Anggota diaktifkan lagi.",
  "Member saved.": "Anggota disimpan.",
  "Organization name saved.": "Nama organisasi disimpan.",
  "Password changed.": "Kata sandi diganti.",
  "Password changed, but the account could not be unlocked. Contact an admin.":
    "Kata sandi diganti, tapi akun belum bisa dibuka. Hubungi admin.",
  "Period not found.": "Periode tidak ditemukan.",
  "Position deleted.": "Posisi dihapus.",
  "Position not found.": "Posisi tidak ditemukan.",
  "Position saved.": "Posisi disimpan.",
  "Profile reactivated, but the login is still blocked. Try again.":
    "Profil diaktifkan lagi, tapi akunnya masih terblokir. Coba lagi.",
  "Reactivate the member first.": "Aktifkan anggotanya dulu.",
  "Role deleted.": "Role dihapus.",
  "Role not found.": "Role tidak ditemukan.",
  "Role saved.": "Role disimpan.",
  "Settings row is missing. Run the migrations.": "Baris pengaturan tidak ada. Jalankan migrasi database.",
  "System roles cannot be deleted.": "Role sistem tidak bisa dihapus.",
  "Temporary password issued.": "Kata sandi sementara dibuat.",
  "That email cannot be used for login (it may belong to another account).":
    "Email itu tidak bisa dipakai untuk masuk (mungkin milik akun lain).",
  "Too many attempts. Wait a few minutes and try again.":
    "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.",
  "Unit deactivated.": "Unit dinonaktifkan.",
  "Unit deleted.": "Unit dihapus.",
  "Unit not found.": "Unit tidak ditemukan.",
  "Unit reactivated.": "Unit diaktifkan lagi.",
  "Unit saved.": "Unit disimpan.",
  "Use Profile to change your own password.": "Ganti kata sandimu sendiri lewat menu Profil.",
  "You cannot change your own access.": "Kamu tidak bisa mengubah hak aksesmu sendiri.",
  "You cannot deactivate your own account.": "Kamu tidak bisa menonaktifkan akunmu sendiri.",
  "Your session has ended. Log in again.": "Sesimu sudah berakhir. Masuk lagi.",
  // client fallbacks
  "Done.": "Selesai.",
  "Saved.": "Tersimpan.",
};

const PATTERNS_ID: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Period (.+) created\.$/, (m) => `Periode ${m[1]} dibuat.`],
  [/^Period (.+) saved\.$/, (m) => `Periode ${m[1]} disimpan.`],
  [/^Position (.+) created\.$/, (m) => `Posisi ${m[1]} dibuat.`],
  [/^Role (.+) created\.$/, (m) => `Role ${m[1]} dibuat.`],
  [
    /^Position created, but its roles were not saved: (.+)$/,
    (m) => `Posisi dibuat, tapi role-nya gagal disimpan: ${translateMessage(m[1], "id")}`,
  ],
];

export function translateMessage(message: string, locale: Locale): string {
  if (locale === "en" || !message) return message;
  const exact = EXACT_ID[message];
  if (exact) return exact;
  for (const [pattern, build] of PATTERNS_ID) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
