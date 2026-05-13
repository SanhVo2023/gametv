"use client";

interface NoPrizesScreenProps {
  onHome: () => void;
}

export default function NoPrizesScreen({ onHome }: NoPrizesScreenProps) {
  return (
    <div className="fullscreen-portrait relative">
      <div className="aurora-layer" />
      <div className="ambient-light" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 py-14">
        <div className="w-full max-w-[720px] glass-panel-strong px-14 py-16 flex flex-col items-center gap-10 slide-up-in text-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10 border-2 border-white/25">
            <i className="fa-solid fa-circle-info text-6xl text-gold-light" />
          </div>
          <h2 className="text-display font-black text-white leading-none">Hết quà rồi!</h2>
          <p className="text-h2 text-white/80 text-balance">
            Bạn đã chiến thắng nhưng kho quà tạm hết. Vui lòng đến quầy nhân viên Mắt Việt để được hỗ trợ.
          </p>
          <button type="button" onClick={onHome} className="cta-gold text-h1">
            <span>Về trang chủ</span>
            <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
