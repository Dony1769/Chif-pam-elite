"use client";
import { useEffect } from "react";

interface AdsBannerProps {
  type?: "vignette";
}


export default function AdsBanner({ type = "vignette" }: AdsBannerProps) {
  useEffect(() => {
    if (type === "vignette") {
      const s = document.createElement("script");
      s.dataset.zone = "10586275";
      s.src = "https://gizokraijaw.net/vignette.min.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, [type]);

  return (
    <div className="w-full flex justify-center my-6">
      <div
        id="monetag-banner-container"
        className="w-full max-w-[728px] min-h-[90px] flex justify-center items-center"
      />
    </div>
  );
}
