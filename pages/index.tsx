import { useRouter } from "next/router";
import { Button } from "../components/ui/button";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#011574]">
      <div className="aurora-layer" />
      <div className="glow-layer" />
      <div className="ambient-light" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 p-4 pb-12">
        <div 
          className={`hero-banner ${mounted ? "animate-fade-in-up" : "opacity-0"}`}
          style={{ animationDelay: "0.1s" }}
        >
          <img
            src="https://cdn.hstatic.net/files/200000689681/article/artboard_1__10__073cf5b38b54400bb7eabdec9da754d9.png"
            alt="Vui Giáng Sinh – Khui Voucher Khủng"
            loading="eager"
          />
        </div>

        <div 
          className={`relative space-y-2 text-center ${mounted ? "animate-fade-in-up" : "opacity-0"}`}
          style={{ animationDelay: "0.3s" }}
        >
          <h1 className="holiday-title">Trí Nhớ Giáng Sinh</h1>
          <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-100 drop-shadow-md">
            <i className="fa-solid fa-star text-yellow-400 animate-pulse" style={{ animationDelay: "0s" }} />
            Lật hình nhận voucher đến 200K
            <i className="fa-solid fa-star text-yellow-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </p>
        </div>

        <div 
          className={`glass-panel w-full rounded-2xl border border-white/20 p-6 text-center ${mounted ? "animate-fade-in-up" : "opacity-0"}`}
          style={{ animationDelay: "0.5s" }}
        >
          <p className="text-sm text-slate-100/90 leading-relaxed">
            Minigame Giáng Sinh từ Mắt Việt. Lật hình quà tặng để nhận voucher giảm thêm đến{" "}
            <span className="font-bold text-yellow-400 text-base">200.000đ</span> khi mua sắm tại 5 cửa hàng Mắt Việt.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full text-lg font-bold py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
              onClick={() => router.push("/play")}
            >
              <i className="fa-solid fa-gamepad mr-2" />
              CHƠI NGAY
            </Button>
          </div>

          <details 
            className="info-card mt-5 space-y-2 text-left text-sm leading-relaxed"
            style={{ animationDelay: "0.7s" }}
          >
            <summary className="font-semibold text-white cursor-pointer hover:text-yellow-300 transition-colors">
              <i className="fa-solid fa-info-circle mr-2 text-yellow-400" />
              Thông tin chương trình & thể lệ
            </summary>
            <div className="space-y-2 text-slate-100/90 mt-3">
              <p>
                "Vui Giáng Sinh – Khui Voucher Khủng" áp dụng độc quyền tại 5 cửa hàng Mắt Việt.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-200">
                <li>Voucher: 50K (đơn 500K), 100K (700K), 150K (900K), 200K (1.1M).</li>
                <li>Ưu đãi thêm: -15% tròng kính chính hãng; -10% gọng & kính mát nguyên giá.</li>
                <li>Mỗi SĐT 2 lượt/ngày, số lượng voucher có hạn.</li>
              </ul>
            </div>
          </details>
        </div>

        <section className="w-full space-y-3 text-sm text-slate-100/95">
          <details 
            className="info-card group"
            style={{ animationDelay: "0.8s" }}
          >
            <summary className="cursor-pointer text-base font-semibold text-yellow-200 flex items-center gap-2 hover:text-yellow-300 transition-colors">
              <i className="fa-solid fa-gift text-yellow-400 animate-bounce" style={{ animationDuration: "2s" }} />
              Nội dung chương trình
              <i className="fa-solid fa-chevron-down ml-auto text-xs transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-2">
              <p>
                Nhân dịp mùa lễ hội Giáng Sinh, Mắt Việt mang đến cơ hội nhận voucher giảm thêm lên đến{" "}
                <b>200.000đ</b> cùng nhiều ưu đãi hấp dẫn khi mua sắm và chăm sóc thị lực tại cửa hàng.
              </p>
              <p className="text-xs text-slate-300">
                Chương trình áp dụng độc quyền tại 5 cửa hàng Mắt Việt và dành cho khách hàng Mắt Việt.
              </p>
            </div>
          </details>

          <details 
            className="info-card group"
            style={{ animationDelay: "0.9s" }}
          >
            <summary className="cursor-pointer text-sm font-semibold text-yellow-200 flex items-center gap-2 hover:text-yellow-300 transition-colors">
              <i className="fa-solid fa-play text-yellow-400" />
              Cách tham gia
              <i className="fa-solid fa-chevron-down ml-auto text-xs transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-200">
              <li>
                <b>Cách 1 – Tại cửa hàng:</b> Đến một trong các cửa hàng Mắt Việt, quét mã QR tại quầy để tham gia
                minigame khui quà và nhận voucher giảm thêm đến 200.000đ.
              </li>
              <li>
                <b>Cách 2 – Online:</b> Quét QR / truy cập link chương trình, tham gia minigame lật hình quà Giáng
                Sinh, sau đó mang voucher nhận được đến cửa hàng để áp dụng.
              </li>
            </ul>
          </details>

          <details 
            className="info-card group"
            style={{ animationDelay: "1s" }}
          >
            <summary className="cursor-pointer text-sm font-semibold text-yellow-200 flex items-center gap-2 hover:text-yellow-300 transition-colors">
              <i className="fa-solid fa-tags text-yellow-400" />
              Ưu đãi & mức voucher
              <i className="fa-solid fa-chevron-down ml-auto text-xs transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-200">
              <li>Voucher 50.000đ cho hoá đơn từ 500.000đ.</li>
              <li>Voucher 100.000đ cho hoá đơn từ 700.000đ.</li>
              <li>Voucher 150.000đ cho hoá đơn từ 900.000đ.</li>
              <li>Voucher 200.000đ cho hoá đơn từ 1.100.000đ.</li>
              <li>Ưu đãi thêm: 15% cho tròng kính chính hãng, 10% cho gọng kính & kính mát nguyên giá.</li>
            </ul>
          </details>

          <details 
            className="info-card group"
            style={{ animationDelay: "1.1s" }}
          >
            <summary className="cursor-pointer text-sm font-semibold text-yellow-200 flex items-center gap-2 hover:text-yellow-300 transition-colors">
              <i className="fa-solid fa-location-dot text-yellow-400" />
              Cửa hàng áp dụng
              <i className="fa-solid fa-chevron-down ml-auto text-xs transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-200">
              <li>Mắt Việt 183B Cách Mạng Tháng Tám – Quận 3.</li>
              <li>Mắt Việt Quốc Hương – Thảo Điền, TP. Thủ Đức.</li>
              <li>Mắt Việt Hoàng Hoa Thám – Tân Bình.</li>
              <li>Mắt Việt 3 Tháng 2 – Quận 10.</li>
              <li>Mắt Việt Hoàng Diệu 2 – TP. Thủ Đức.</li>
            </ul>
          </details>
        </section>
      </div>
    </div>
  );
}




