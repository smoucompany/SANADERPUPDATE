// Lightweight loading screen — no framer-motion, fast render

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-5">
        {/* Logo box */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="8" width="24" height="3" rx="1.5" fill="white" fillOpacity="0.9"/>
            <rect x="4" y="14.5" width="16" height="3" rx="1.5" fill="white" fillOpacity="0.7"/>
            <rect x="4" y="21" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.5"/>
          </svg>
        </div>
        {/* App name */}
        <div className="text-center">
          <div className="font-bold text-gray-800 text-lg">نظام الإدارة المتكامل</div>
          <div className="text-xs text-gray-400 mt-0.5 tracking-widest">SANAD ERP</div>
        </div>
        {/* Progress bar */}
        <div className="w-40 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-[loading_1.4s_ease-in-out_infinite]"
            style={{ width: '40%', animation: 'loadbar 1.4s ease-in-out infinite' }} />
        </div>
      </div>
      <style>{`
        @keyframes loadbar {
          0%   { transform: translateX(-100%); width: 40% }
          50%  { width: 60% }
          100% { transform: translateX(350%); width: 40% }
        }
      `}</style>
    </div>
  )
}
