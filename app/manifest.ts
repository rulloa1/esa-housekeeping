import type { MetadataRoute } from "next";

// Lets staff add the app to their home screen. On iPhone and iPad that's also what allows
// lock-screen notifications.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ESA Housekeeping · Houston IAH",
    short_name: "Housekeeping",
    start_url: "/staff",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2F7A1E",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
