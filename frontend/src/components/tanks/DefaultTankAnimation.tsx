/**
 * DefaultTankAnimation Component
 *
 * Animated aquarium background for tanks without custom images
 */

export default function DefaultTankAnimation() {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Water gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-300 via-blue-400 to-blue-600 opacity-90"></div>

      {/* Animated bubbles */}
      <div className="absolute inset-0">
        <div className="bubble bubble-1">○</div>
        <div className="bubble bubble-2">○</div>
        <div className="bubble bubble-3">○</div>
        <div className="bubble bubble-4">○</div>
      </div>

      {/* Swimming fish */}
      <div className="absolute inset-0">
        <div className="fish fish-1">🐠</div>
        <div className="fish fish-2">🐟</div>
        <div className="fish fish-3">🐡</div>
      </div>

      {/* Seaweed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around text-4xl">
        <span className="seaweed seaweed-1">🌿</span>
        <span className="seaweed seaweed-2">🪸</span>
        <span className="seaweed seaweed-3">🌿</span>
        <span className="seaweed seaweed-4">🪸</span>
      </div>

      <style>{`
        @keyframes bubble-rise {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-200px) translateX(10px);
            opacity: 0;
          }
        }

        @keyframes swim {
          0% {
            transform: translateX(-20px);
          }
          100% {
            transform: translateX(calc(100vw + 20px));
          }
        }

        @keyframes sway {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }

        .bubble {
          position: absolute;
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
          animation: bubble-rise 4s infinite;
        }

        .bubble-1 {
          left: 20%;
          bottom: 0;
          animation-delay: 0s;
        }

        .bubble-2 {
          left: 50%;
          bottom: 0;
          animation-delay: 1s;
        }

        .bubble-3 {
          left: 70%;
          bottom: 0;
          animation-delay: 2s;
        }

        .bubble-4 {
          left: 35%;
          bottom: 0;
          animation-delay: 3s;
        }

        .fish {
          position: absolute;
          font-size: 32px;
          animation: swim linear infinite;
        }

        .fish-1 {
          top: 20%;
          animation-duration: 15s;
          animation-delay: 0s;
        }

        .fish-2 {
          top: 50%;
          animation-duration: 20s;
          animation-delay: 3s;
        }

        .fish-3 {
          top: 70%;
          animation-duration: 18s;
          animation-delay: 6s;
        }

        .seaweed {
          display: inline-block;
          transform-origin: bottom center;
          animation: sway 3s ease-in-out infinite;
        }

        .seaweed-1 {
          animation-delay: 0s;
        }

        .seaweed-2 {
          animation-delay: 0.5s;
        }

        .seaweed-3 {
          animation-delay: 1s;
        }

        .seaweed-4 {
          animation-delay: 1.5s;
        }
      `}</style>
    </div>
  )
}
