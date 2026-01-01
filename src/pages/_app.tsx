import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

function App({ Component, pageProps }: AppProps) {

  return (
    <ThemeProvider enableSystem storageKey="intentui-theme" attribute={"class"}>
        <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default App;
