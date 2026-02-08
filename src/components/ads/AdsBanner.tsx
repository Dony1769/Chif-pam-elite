"use client";
import React from "react";
import Monetag from "./Monetag"; // ou MultiTag selon ce que tu veux

interface AdsBannerProps {
  type?: "monetag" | "multitag";
}

export default function AdsBanner({ type = "monetag" }: AdsBannerProps) {
  return (
    <div className="w-full flex justify-center my-4">
      <div className="w-full max-w-[728px] h-[90px] bg-black/20 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
        {/* Sélectionne le script en fonction du type */}
        {type === "monetag" && <Monetag />}
        {type === "multitag" && <></>}
        {/* Si besoin, tu peux ajouter MultiTag ici */}
        <span className="text-white/30 text-[10px] font-bold uppercase">
          PLACEHOLDER BANNIÈRE
        </span>
      </div>
    </div>
  );
}
