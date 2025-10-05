"use client";

import Lottie from "lottie-react";
import successAnimation from "../../public/BlueSucces.json";

interface SuccessAnimationProps {
  message?: string;
  size?: number;
}

export default function SuccessAnimation({ message = "Success!", size = 120 }: SuccessAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div style={{ width: size, height: size }}>
        <Lottie
          animationData={successAnimation}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {message && (
        <p className="mt-4 text-teal font-semibold text-center">{message}</p>
      )}
    </div>
  );
}
