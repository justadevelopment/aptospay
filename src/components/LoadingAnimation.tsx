"use client";

import Lottie from "lottie-react";
import loadingAnimation from "../../public/LoadingStateHourGlass.json";

interface LoadingAnimationProps {
  message?: string;
  size?: number;
}

export default function LoadingAnimation({ message = "Loading...", size = 120 }: LoadingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div style={{ width: size, height: size }}>
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {message && (
        <p className="mt-4 text-gunmetal/60 text-center">{message}</p>
      )}
    </div>
  );
}
