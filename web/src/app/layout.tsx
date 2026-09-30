// The root layout. It sets no metadata, lang, dir, stylesheet or font on purpose (ADR-0002
// decision 5): the title is a product string, the language and direction come from locale routing,
// and tokens and fonts each land in their own run. Adding any of them here is a surface decision.
import type { ReactNode } from "react";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
