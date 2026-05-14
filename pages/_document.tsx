import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <meta name="theme-color" content="#001033" />
        <link
          rel="icon"
          href={
            "data:image/svg+xml," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
                '<rect width="64" height="64" rx="14" fill="#001033"/>' +
                '<path d="M8 32C14 22 22 17 32 17s18 5 24 15c-6 10-14 15-24 15S14 42 8 32Z" fill="none" stroke="#f5c842" stroke-width="4" stroke-linejoin="round"/>' +
                '<circle cx="32" cy="32" r="8.5" fill="#2156e8"/>' +
                '<circle cx="32" cy="32" r="3.4" fill="#fde98a"/>' +
              '</svg>',
            )
          }
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
