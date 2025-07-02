import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	// Disable Vercel automatic monitoring to prevent accidental deployments
	automaticVercelMonitors: false,
	webpack: (config) => {
		config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js", ".jsx"] }
		return config
	},
}

export default nextConfig
