import dotenv from 'dotenv'
import { existsSync, readdirSync, mkdirSync } from 'fs'
import path from 'path'
import { Client, Collection, GatewayIntentBits } from 'discord.js'
dotenv.config()

interface ICommand {
	name: string
	discription: string
	execute: (args: string[]) => void
}

const voicesFolderPath = path.join(__dirname, 'voices')
if (!existsSync(voicesFolderPath)) {
  mkdirSync(voicesFolderPath)
}
const recordingsFolderPath = path.join(__dirname, 'recordings')
if (!existsSync(recordingsFolderPath)) {
  mkdirSync(recordingsFolderPath)
}

class CustomClient extends Client {
	commands: Map<string, ICommand> = new Map()

	constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
    })
  }
}

const client = new CustomClient()

client.commands = new Collection()
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
			client.commands.set(command.data.name, command)
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
		}
	}
}

const eventsPath = path.join(__dirname, 'events')
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'))

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file)
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const event = require(filePath)
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args))
	} else {
		client.on(event.name, (...args) => event.execute(...args))
	}
}

client.login(process.env.DISCORD_TOKEN)
