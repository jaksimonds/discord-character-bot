import { Events } from 'discord.js'

export const name = Events.InteractionCreate
export const execute = async (interaction) => {
	if (interaction?.isChatInputCommand() || interaction?.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName)

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`)
			return
		}

		try {
			if (interaction?.isChatInputCommand()) {
				await command.execute(interaction)
			} else if (interaction?.isAutocomplete()) {
				await command.autocomplete(interaction)
			}
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`)
			console.error(error)
		}
	} else return
}
