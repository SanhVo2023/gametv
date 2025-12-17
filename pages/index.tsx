import { useRouter } from "next/router";
import { Button } from "../components/ui/button";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#011574]">
      <div className="aurora-layer" />
      <div className="glow-layer" />
      <div className="ambient-light" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 p-4">
        <div className="hero-banner">
          <img
            src="https://cdn.hstatic.net/files/200000689681/article/artboard_1__10__073cf5b38b54400bb7eabdec9da754d9.png"
            alt="Vui Giáng Sinh – Khui Voucher Khủng"
            loading="lazy"
          />
        </div>

        <div className="relative space-y-1 text-center">
          <h1 className="holiday-title">Trí Nhớ Giáng Sinh</h1>
          <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-100 drop-shadow-md">
            <i className="fa-solid fa-star text-yellow-400" />
            Lật hình nhận voucher đến 200K
            <i className="fa-solid fa-star text-yellow-400" />
          </p>
        </div>

        <div className="glass-panel w-full rounded-2xl border border-white/20 p-6 text-center">
          <p className="text-sm text-slate-100/90">
            Minigame Giáng Sinh từ Mắt Việt. Lật hình quà tặng để nhận voucher giảm thêm đến{" "}
            <b>200.000đ</b> khi mua sắm tại 5 cửa hàng Mắt Việt.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => router.push("/play")}
            >
              CHƠI NGAY
            </Button>
          </div>

          <details className="info-card mt-4 space-y-2 text-left text-sm leading-relaxed">
            <summary className="font-semibold text-white">
              Thông tin chương trình & thể lệ
            </summary>
            <div className="space-y-2 text-slate-100/90">
              <p>
                “Vui Giáng Sinh – Khui Voucher Khủng” áp dụng độc quyền tại 5 cửa hàng Mắt Việt.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-200">
                <li>Voucher: 50K (đơn 500K), 100K (700K), 150K (900K), 200K (1.1M).</li>
                <li>Ưu đãi thêm: -15% tròng kính chính hãng; -10% gọng & kính mát nguyên giá.</li>
                <li>Mỗi SĐT 2 lượt/ngày, số lượng voucher có hạn.</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}




