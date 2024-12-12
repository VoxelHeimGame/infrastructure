import { $, which } from 'bun'
import { loadEnv, printInfo, printSuccess, printError } from './utils.js'
import path from 'node:path'

const runMigrations = async (env) => {
	printInfo(`Running Flyway migrations for ${env} environment...`)

	try {
		// Load environment variables
		const envVars = await loadEnv(env)
		Object.assign(process.env, envVars)

		// Configure Flyway options
		const flywayConfigFile = path.resolve('flyway/auth/flyway.toml')
		const sqlLocation = path.resolve('flyway/auth/sql')
		const dbUrl = `jdbc:postgresql://${process.env.AUTH_DB_HOST}:${process.env.AUTH_DB_PORT}/${process.env.AUTH_DB_NAME}`

		printInfo(`Database URL: ${dbUrl}`)
		printInfo(`User: ${process.env.AUTH_DB_USER}`)

		// Find Flyway executable
		const flywayPath = await which('flyway')
		if (!flywayPath) {
			throw new Error('Flyway executable not found in PATH')
		}
		printInfo(`Flyway path: ${flywayPath}`)

		// Prepare Flyway command arguments
		const flywayArgs = [
			`-configFiles=${flywayConfigFile}`,
			`-locations=filesystem:${sqlLocation}`,
			`-environment=${env}`,
			`-url=${dbUrl}`,
			`-user=${process.env.AUTH_DB_USER}`,
			`-password=${process.env.AUTH_DB_PASSWORD}`,
			'migrate'
		]

		// Execute Flyway migrations
		const result = await $`"${flywayPath}" ${flywayArgs}`

		printSuccess(`Flyway migrations completed for ${env} environment`)
		printInfo(`Flyway output: ${result.stdout}`)
	} catch (error) {
		printError(`Error running Flyway migrations for ${env} environment: ${error.message}`)
		if (error.stderr) {
			printError(`Error details: ${error.stderr}`)
		}
		process.exit(1)
	}
}

const main = async () => {
	const args = process.argv.slice(2)
	const env = args[0]

	if (!['dev', 'ptu', 'live'].includes(env)) {
		printError("Invalid environment. Use 'dev', 'ptu', or 'live'.")
		process.exit(1)
	}

	await runMigrations(env)
}

main().catch((error) => {
	printError(`Unhandled error: ${error.message}`)
	process.exit(1)
})
