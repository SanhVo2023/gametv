/**
 * Cheeky Vietnamese microcopy pools for the memory game's playful layer.
 * Pick at random so the kiosk feels alive across repeated plays.
 */

const MATCH: string[] = [
  "Tinh mắt ghê!",
  "Chuẩn không cần chỉnh!",
  "Quào, nhớ giỏi thế!",
  "Một cặp xinh xắn!",
  "Mắt tinh như cú!",
  "Đỉnh của chóp!",
];

const MISMATCH: string[] = [
  "Hụt rồi nè!",
  "Suýt nữa thì trúng!",
  "Ơ kìa, thử lại nào!",
  "Gần lắm rồi!",
  "Lệch tí xíu thôi!",
];

const WIN: string[] = [
  "Xuất sắc!",
  "Quá đỉnh luôn!",
  "Mắt thần là đây!",
];

const LOSE: string[] = [
  "Tiếc ghê, thử lại nha!",
  "Suýt nữa rồi, chơi lại nào!",
  "Đừng buồn, làm ván nữa!",
];

const ENCOURAGE: string[] = [
  "Tìm các cặp hình giống nhau nào!",
  "Nhớ kỹ vị trí từng tấm nhé!",
  "Cố lên, quà đang chờ bạn!",
  "Lật nhanh tay nào!",
];

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export const playfulCopy = {
  match: () => pick(MATCH),
  mismatch: () => pick(MISMATCH),
  win: () => pick(WIN),
  lose: () => pick(LOSE),
  encourage: () => pick(ENCOURAGE),
};
