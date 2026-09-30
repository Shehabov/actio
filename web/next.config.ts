import type { NextConfig } from "next";

// ADR-0002 decision 11: the framework's telemetry is off on every clone. It is set here, at module
// level, because each framework process loads this file before it constructs its telemetry.
process.env.NEXT_TELEMETRY_DISABLED = "1";

const nextConfig: NextConfig = {
  // The repository keeps one agent-instructions file, at its root, so the dev server writes none here.
  agentRules: false,
  // Responses stop naming the framework to every caller.
  poweredByHeader: false,
};

export default nextConfig;
