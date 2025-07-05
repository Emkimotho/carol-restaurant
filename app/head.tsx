// File: app/head.tsx

export default function Head() {
  return (
    <>
      <title>The 19th Hole | Home</title>
      <meta
        name="description"
        content="Experience the finest dining and entertainment at The 19th Hole Restaurant and Bar."
      />

      {/* Apple touch icon */}
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/images/apple-touch-icon.png"
      />

      {/* PNG favicons (in public/images/) */}
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/images/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/images/favicon-16x16.png"
      />

      {/* Classic favicon.ico (in public/) */}
      <link
        rel="shortcut icon"
        href="/favicon.ico"
      />

      {/* Web manifest */}
      <link
        rel="manifest"
        href="/site.webmanifest"
      />
    </>
  );
}
