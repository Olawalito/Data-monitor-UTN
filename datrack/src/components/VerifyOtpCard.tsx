import OtpTimer from "./OtpTimer";
import { useState } from "react";

type VerifyOtpCardProps = {
  onBack?: () => void;
  mode?: "Login" | "Sign Up";
};

export default function VerifyOtpCard({ onBack, mode = "Login" }: VerifyOtpCardProps) {
  const [active, setActive] = useState(true);

  return (
    <div className="w-full max-w-95 bg-white rounded-md shadow-[0_2px_12px_rgba(0,0,0,0.08)] px-5 py-5">
      <div className="flex justify-center mb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf2ff] text-2xl text-[#a98500]">
          ✓
        </div>
      </div>

      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a98500] mb-2">
        Verification
      </p>

      <h2 className="text-center text-xl font-semibold text-gray-800 mb-2">
        Verify OTP
      </h2>

      <p className="text-center text-[12px] leading-5 text-gray-600 mb-5">
        Enter the 6-digit code sent to your phone number to continue with {mode === "Login" ? "sign in" : "your account setup"}. 
      </p>

      <div className="flex justify-center gap-2 mb-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="h-10 w-9 rounded-sm border border-gray-200 bg-[#edf2ff] text-center text-base font-semibold text-gray-700 outline-none focus:border-[#f2b900]"
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4">
        <span>Code expires in <OtpTimer minutes={3} active={active} onExpire={() => setActive(false)}/></span>
        <button type="button" disabled={!active} className="font-medium text-[#a98500] hover:underline">
          Resend OTP
        </button>
      </div>

      <button
        type="button"
        className="w-full h-8 bg-[#f2b900] hover:bg-[#e5ad00] text-black rounded-sm text-[12px] font-semibold transition flex items-center justify-center gap-1 mb-3"
      >
        Verify Account
        <span className="text-sm leading-none">→</span>
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full h-8 bg-[#edf2ff] hover:bg-[#e5ebfa] rounded-sm text-[12px] font-medium text-gray-700 transition"
      >
        Back
      </button>
    </div>
  );
}
