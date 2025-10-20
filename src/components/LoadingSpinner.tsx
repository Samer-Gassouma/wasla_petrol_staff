"use client";

import Image from "next/image";

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Image 
            src="/icons/logo.png" 
            alt="Wasla" 
            width={64}
            height={64}
            className="w-16 h-16 object-contain animate-pulse" 
          />
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
        </div>
        <div className="text-sm text-gray-600 font-medium">Chargement...</div>
      </div>
    </div>
  );
}
