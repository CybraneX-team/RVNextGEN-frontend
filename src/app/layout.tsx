import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const karla = localFont({
  src: "./fonts/Karla-Variable.ttf",
  weight: "200 800",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Streamline",
  description: "A streaming platform for movies and shows.",
};

export const viewport: Viewport = {
  themeColor: "#0e0d0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${karla.className} h-full antialiased`}>
      <body className="m-0 min-h-full bg-[#0c0c0d] text-[#f6f6f6] [&_button]:cursor-pointer [&_button]:transition-[background,opacity,transform] [&_button]:duration-200 [&_button]:[-webkit-tap-highlight-color:transparent] [&_button:disabled]:cursor-default [&_:is(button,a,input):focus-visible]:outline-2 [&_:is(button,a,input):focus-visible]:outline-offset-[5px] [&_:is(button,a,input):focus-visible]:outline-[#a2d9cf] motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none">
        {children}
      </body>
    </html>
  );
}
