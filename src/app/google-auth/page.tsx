"use client";

import React from "react";

export default function GoogleAuthPopup() {
  const accounts = [
    {
      name: "Keerthi glory",
      email: "keerthikutty230@gmail.com",
      avatarBg: "bg-[#d32f2f]",
      letter: "K"
    },
    {
      name: "chvenkatalakshmidurga291@gmail.com",
      email: "chvenkatalakshmidurga291@gmail.com",
      avatarBg: "bg-[#7b1fa2]",
      letter: "C"
    },
    {
      name: "Keerthi Tadi",
      email: "tadikeerthi7@gmail.com",
      avatarBg: "bg-[#c2185b]",
      letter: "K"
    },
    {
      name: "Praveena Benzmen",
      email: "tpraveena57@gmail.com",
      avatarBg: "bg-[#e64a19]",
      letter: "P"
    }
  ];

  const handleSelectAccount = (account: typeof accounts[0]) => {
    if (typeof window !== "undefined" && window.opener) {
      window.opener.postMessage(
        {
          type: "GOOGLE_AUTH_SUCCESS",
          email: account.email,
          name: account.name === account.email ? account.email.split("@")[0] : account.name,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(account.name)}`
        },
        "*"
      );
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-[#131314] text-[#e3e3e3] font-sans p-6 flex flex-col justify-between select-none">
      <div className="w-full max-w-sm mx-auto space-y-6 pt-4">
        {/* Header logo */}
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span className="text-sm font-medium text-white">Sign in with Google</span>
        </div>

        {/* Action instruction */}
        <div className="space-y-1">
          <h1 className="text-2xl font-normal text-white">Choose an account</h1>
          <p className="text-sm text-[#c4c7c5]">
            to continue to <span className="text-blue-400 font-medium">HealthPredict AI</span>
          </p>
        </div>

        {/* Account list */}
        <div className="border-t border-[#303134] divide-y divide-[#303134] mt-4">
          {accounts.map((account, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectAccount(account)}
              className="w-full flex items-center gap-4 py-3.5 px-1 hover:bg-[#1f1f20] transition-colors text-left cursor-pointer"
            >
              <div className={`h-8 w-8 rounded-full ${account.avatarBg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                {account.letter}
              </div>
              <div className="min-w-0 flex-1">
                {account.name !== account.email && (
                  <p className="text-sm font-medium text-white truncate">{account.name}</p>
                )}
                <p className="text-xs text-[#c4c7c5] truncate">{account.email}</p>
              </div>
            </button>
          ))}

          {/* Use another account option */}
          <button
            type="button"
            className="w-full flex items-center gap-4 py-3.5 px-1 hover:bg-[#1f1f20] transition-colors text-left cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-[#303134] flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-[#c4c7c5]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-white">Use another account</span>
          </button>
        </div>
      </div>

      {/* Footer agreements */}
      <div className="w-full max-w-sm mx-auto text-[11px] text-[#c4c7c5] text-center leading-normal pt-4">
        By continuing, you agree to our{" "}
        <a href="#" className="text-blue-400 hover:underline">Terms of Service</a> and{" "}
        <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>.
      </div>
    </div>
  );
}
