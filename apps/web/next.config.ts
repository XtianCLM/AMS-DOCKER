// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   reactStrictMode: false,

//   allowedDevOrigins: [
//     "192.168.1.180",
//   ],
// };

// export default nextConfig;
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",

  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;