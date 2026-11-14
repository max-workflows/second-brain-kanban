import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanban",
  description: "A local-first Kanban board whose cards are Markdown files.",
};

// Runs before the first paint, so a saved theme choice never flashes the wrong colors.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
