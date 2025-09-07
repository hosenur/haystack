import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { trpc } from "@/lib/trpc";
import { ThemeProvider } from "next-themes";

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider enableSystem storageKey="intentui-theme" attribute={"class"}>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default trpc.withTRPC(App);
