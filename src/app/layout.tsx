import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import LoginModal from "@/components/LoginModal";

export const metadata: Metadata = {
  title: "RE:TRACK | 서울 정비사업 레이더",
  description: "서울 정비사업의 변화를 추적하는 레이더",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <LoginModal />
        </AuthProvider>
      </body>
    </html>
  );
}
