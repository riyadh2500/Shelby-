import Head from "next/head";
import "../styles/globals.css";

const MyApp = ({ Component, pageProps }) => (
  <>
    <Head>
      {/* Replace the old black Ethereum favicon with the Shelby pink mark */}
      <link rel="icon" type="image/svg+xml" href="/shelby-favicon.svg" />
      <link rel="shortcut icon" href="/shelby-favicon.svg" />
      <meta name="theme-color" content="#FF77C9" />
    </Head>
    <Component {...pageProps} />
  </>
);

export default MyApp;
