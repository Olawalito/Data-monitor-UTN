import { useState } from "react";
import logo from "../assets/logo.png";
import VerifyOtpCard from "../components/VerifyOtpCard";

export default function Login() {
    const [form, setForm] = useState<"Login" | "Sign Up">("Login");
    const [showOtpCard, setShowOtpCard] = useState(false);

    const handleSubmit = (event: React.FormEvent) => {
      event.preventDefault();
      setShowOtpCard(true);
    };

    if (showOtpCard) {
      return (
        <div className="min-h-screen bg-[#f5f7fc] flex items-center justify-center px-4">
          <VerifyOtpCard mode={form} onBack={() => setShowOtpCard(false)} />
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-[#f5f7fc] flex items-center justify-center px-4">
      <div className="w-full max-w-95 bg-white rounded-md shadow-[0_2px_12px_rgba(0,0,0,0.08)] px-5 py-5">
                {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="Datrack Logo"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Description */}
        <p className="text-center text-[15px] leading-4 text-gray-600 mb-3">
          Monitor data balance and bundle expiry across
          <br />
          your MTN SIMs.
        </p>

        {/* Tabs */}
        <div className="grid grid-cols-2 bg-[#edf2ff] rounded-md h-7 mb-4">
          <button className={ form === "Login" ?`bg-white rounded-md text-[15px] font-medium text-gray-800 shadow-sm` : `bg-gray 600`}  onClick={() => setForm("Login") }>
            Sign In
          </button>

          <button className={ form === "Sign Up" ?`bg-white rounded-md text-[15px] font-medium text-gray-800 shadow-sm` : `bg-gray 600`} onClick={() => setForm("Sign Up") }>
            Create Account
          </button>
        </div>

        { form === "Sign Up" && (<>
        <form className="space-y-2.5" onSubmit={handleSubmit}>

        {/* Full Name */}
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1">
            Full name
          </label>
          <input
            type="text"
            placeholder="Enter your full name"
            className="w-full h-7 rounded-sm bg-[#edf2ff] border border-transparent px-2.5 text-[9px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#f2b900]"
          />
        </div>
        {/* Phone */}
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1">
            Phone number
          </label>
          <input
            type="tel"
            placeholder="0803 123 4567"
            className="w-full h-7 rounded-sm bg-[#edf2ff] border border-transparent px-2.5 text-[9px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#f2b900]"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            placeholder="Create a secure password"
            className="w-full h-7 rounded-sm bg-[#edf2ff] border border-transparent px-2.5 text-[9px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#f2b900]"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1">
            Confirm password
          </label>
          <input
            type="password"
            placeholder="Confirm your password"
            className="w-full h-7 rounded-sm bg-[#edf2ff] border border-transparent px-2.5 text-[9px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#f2b900]"
          />
        </div>

        {/* Terms */}
        <label className="flex items-start gap-1.5 pt-0.5 text-[12px] text-gray-500">
          <input
            type="checkbox"
            className="mt-0.5 w-2.5 h-2.5 accent-[#f2b900]"
          />
          <span>
            I agree to the{" "}
            <button
              type="button"
              className="text-[#a98500] hover:underline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="text-[#a98500] hover:underline"
            >
              Privacy Policy
            </button>
          </span>
        </label>

        {/* Create Account */}
        <button
          type="submit"
          className="w-full h-7 bg-[#f2b900] hover:bg-[#e5ad00] text-black rounded-sm text-[9px] font-semibold transition flex items-center justify-center gap-1"
        >
          Create Account
          <span className="text-sm leading-none">→</span>
        </button>

      </form></>)}

        { form === "Login" && ( <form onSubmit={handleSubmit}>

        {/* Phone */}
        <div className="mb-2.5">
          <label className="block text-[12px] font-medium text-gray-700 mb-1">
            Phone number
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
            <label className="text-[12px] font-medium text-gray-700">
              Password
            </label>

            <button className="text-[12px] text-[#a98500] hover:underline">
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              ♙
            </span>

            <input
              type="password"
              placeholder="Enter password"
              className="w-full h-7 rounded-sm bg-[#edf2ff] border border-transparent pl-7 pr-8 text-[9px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#f2b900]"
            />

            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
              ◉
            </span>
          </div>
        </div>

        {/* Remember / Status */}
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-1 text-[12px] text-gray-600">
            <input
              type="checkbox"
              defaultChecked
              className="w-2.5 h-2.5 accent-[#f2b900]"
            />
            Remember this console
          </label>
        </div>

        {/* Sign In */}
        <button type="submit" className="w-full h-7 bg-[#f2b900] hover:bg-[#e5ad00] text-black rounded-sm text-[16px] font-semibold transition flex items-center justify-center gap-1">
          Sign In to Datrack
          <span className="text-sm leading-none">→</span>
        </button>
      </form>) }
      </div>
    </div>
  );
}