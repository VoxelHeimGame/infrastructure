import { file } from 'bun'

export const loadEnv = async (env) => {
	const envFile = `env/.env.${env}`
	try {
		const content = await file(envFile).text()
		const envVars = {}
		content.split('\n').forEach((line) => {
			const [key, value] = line.split('=')
			if (key && value) {
				envVars[key.trim()] = value.trim()
			}
		})
		return envVars
	} catch (error) {
		console.error(`Error loading environment file ${envFile}: ${error.message}`)
		process.exit(1)
	}
}

export const printInfo = (message) => console.log(`\x1b[34mℹ ${message}\x1b[0m`)
export const printSuccess = (message) => console.log(`\x1b[32m✔ ${message}\x1b[0m`)
export const printError = (message) => console.error(`\x1b[31m✘ ${message}\x1b[0m`)
export const printWarning = (message) => console.warn(`\x1b[33m⚠ ${message}\x1b[0m`)
