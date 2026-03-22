"use client";

export default function KakaoFloatingButton() {
  const handleClick = () => {
    window.open("https://pf.kakao.com/_sPCKb/chat", "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed right-4 top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-1 group"
      aria-label="카카오톡 상담"
    >
      <div className="flex h-[35px] w-[35px] md:h-[50px] md:w-[50px] items-center justify-center rounded-full bg-[#FEE500] shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl">
        <svg
          className="size-[17px] md:size-[25px]"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.56-.96 3.6-.99 3.83 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.7-2.44 4.28-2.85.55.08 1.13.12 1.72.12 5.52 0 10-3.58 10-7.97C22 6.58 17.52 3 12 3Z"
            fill="#3C1E1E"
          />
        </svg>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        카톡 상담
      </span>
    </button>
  );
}
