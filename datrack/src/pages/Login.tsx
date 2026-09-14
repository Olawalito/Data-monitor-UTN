export default function Login() {
  return (
    <div className="min-h-screen bg-[#f5f7fc] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px] bg-white rounded-md shadow-[0_2px_12px_rgba(0,0,0,0.08)] px-5 py-5">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="Datrack Logo"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Description */}
        <p className="text-center text-[11px] leading-[16px] text-gray-600 mb-3">
          Monitor data balance and bundle expiry across
          <br />
          your MTN SIMs.
        </p>

        {/* Tabs */}
        <div className="grid grid-cols-2 bg-[#edf2ff] rounded-md h-7 mb-4">
          <button className="bg-white rounded-md text-[10px] font-medium text-gray-800 shadow-sm">
            Sign In
          </button>

          <button className="text-[10px] font-medium text-gray-600">
            Create Account
          </button>
        </div>

        {/* Email / Phone */}
        <div className="mb-2.5">
          <label className="block text-[8px] font-medium text-gray-700 mb-1">
            Email address or Phone number
          </label>

          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              ▣
            </span>

            <input
              type="text"
              placeholder="name@work.com or 0803 123 4567"
              className="w-full h-7 rounded-sm bg-[#edf2ff] border border-transparent pl-7 pr-2 text-[9px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#f2b900]"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[8px] font-medium text-gray-700">
              Password
            </label>

            <button className="text-[8px] text-[#a98500] hover:underline">
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              ♙
            </span>

            <input
              type="password"
              placeholder="Enter security passphrase"
              className="w-full h-7 rounded-sm bg-[#edf2ff] border border-transparent pl-7 pr-8 text-[9px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#f2b900]"
            />

            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
              ◉
            </button>
          </div>
        </div>

        {/* Remember / Status */}
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-1 text-[8px] text-gray-600">
            <input
              type="checkbox"
              defaultChecked
              className="w-2.5 h-2.5 accent-[#f2b900]"
            />
            Remember this console
          </label>

          <span className="text-[8px] text-green-600 font-medium">
            ● USSD v2.4 Live
          </span>
        </div>

        {/* Sign In */}
        <button className="w-full h-7 bg-[#f2b900] hover:bg-[#e5ad00] text-black rounded-sm text-[9px] font-semibold transition flex items-center justify-center gap-1">
          Sign In to Datrack
          <span className="text-sm leading-none">→</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2 my-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-[8px] text-gray-400">OR</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* Google */}
        <button className="w-full h-7 bg-[#edf2ff] hover:bg-[#e5ebfa] rounded-sm text-[9px] font-medium text-gray-700 flex items-center justify-center gap-2 transition">
          <span className="font-bold text-[11px]">G</span>
          Continue with Google
        </button>

      </div>
    </div>
  );
}