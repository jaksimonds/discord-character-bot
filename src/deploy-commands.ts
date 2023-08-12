import dotenv from 'dotenv'
import { REST, Routes } from 'discord.js'
import { readdirSync } from 'fs'
import path from 'path'

dotenv.config()

const commands = []
const foldersPath = path.join(__dirname, 'commands')
const commandFolders = readdirSync(foldersPath)

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder)
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'))
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file)
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const command = require(filePath)
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON())
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
		}
	}
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`)

		const data = await rest.put(
			Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
			{ body: commands },
		) as object[]

		console.log(`Successfully reloaded ${data.length} application (/) commands.`)
	} catch (error) {
		console.error(error)
	}
})()
